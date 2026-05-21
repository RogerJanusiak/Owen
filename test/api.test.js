import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

// ── Mock database ─────────────────────────────────────────────────────────────
// Keeps tasks in memory and handles the four SQL patterns the server uses.

function createMockDb() {
  let nextId = 1;
  const tasks = [];

  return {
    async query(sql, params = []) {
      if (sql.startsWith('SELECT')) {
        return [...tasks].reverse();
      }
      if (sql.startsWith('INSERT')) {
        const [title, column_name, label] = params;
        const task = { id: nextId++, title, column_name, label, created_at: new Date() };
        tasks.push(task);
        return { insertId: task.id };
      }
      if (sql.startsWith('UPDATE')) {
        const [title, column_name, label, id] = params;
        const task = tasks.find(t => t.id === id);
        if (task) Object.assign(task, { title, column_name, label });
        return { affectedRows: task ? 1 : 0 };
      }
      if (sql.startsWith('DELETE')) {
        const [id] = params;
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) tasks.splice(index, 1);
        return { affectedRows: 1 };
      }
      return [];
    },
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────
// Starts a server bound to a random port, runs fn(url), then closes it.

async function withServer(db, fn) {
  const server = createServer(db);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(url);
  } finally {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('GET /api/tasks returns an empty list when there are no tasks', async () => {
  await withServer(createMockDb(), async (url) => {
    const res = await fetch(`${url}/api/tasks`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });
});

test('POST /api/tasks creates a task and returns its id', async () => {
  await withServer(createMockDb(), async (url) => {
    const res = await fetch(`${url}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My task', column_name: 'backlog' }),
    });
    assert.equal(res.status, 201);
    const { id } = await res.json();
    assert.equal(typeof id, 'number');
  });
});

test('POST then GET returns the created task', async () => {
  await withServer(createMockDb(), async (url) => {
    await fetch(`${url}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Board task', column_name: 'ready', label: 'feature' }),
    });

    const res = await fetch(`${url}/api/tasks`);
    const tasks = await res.json();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].title, 'Board task');
    assert.equal(tasks[0].column_name, 'ready');
    assert.equal(tasks[0].label, 'feature');
  });
});

test('PATCH /api/tasks/:id updates a task', async () => {
  await withServer(createMockDb(), async (url) => {
    const postRes = await fetch(`${url}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Original', column_name: 'backlog' }),
    });
    const { id } = await postRes.json();

    const patchRes = await fetch(`${url}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated', column_name: 'ready', label: 'bug' }),
    });
    assert.equal(patchRes.status, 200);
    assert.deepEqual(await patchRes.json(), { ok: true });
  });
});

test('DELETE /api/tasks/:id removes a task', async () => {
  await withServer(createMockDb(), async (url) => {
    const postRes = await fetch(`${url}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'To delete', column_name: 'backlog' }),
    });
    const { id } = await postRes.json();

    const deleteRes = await fetch(`${url}/api/tasks/${id}`, { method: 'DELETE' });
    assert.equal(deleteRes.status, 200);
    assert.deepEqual(await deleteRes.json(), { ok: true });

    const tasks = await (await fetch(`${url}/api/tasks`)).json();
    assert.equal(tasks.length, 0);
  });
});

test('POST /api/tasks returns 400 when title is missing', async () => {
  await withServer(createMockDb(), async (url) => {
    const res = await fetch(`${url}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_name: 'backlog' }),
    });
    assert.equal(res.status, 400);
  });
});

test('GET /api/tasks returns 503 when no database is configured', async () => {
  await withServer(null, async (url) => {
    const res = await fetch(`${url}/api/tasks`);
    assert.equal(res.status, 503);
  });
});
