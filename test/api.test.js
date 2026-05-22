import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

// ── Mock database ─────────────────────────────────────────────────────────────

const MOCK_COLUMNS = [
  { id: 1, name: 'Backlog',   display_order: 0 },
  { id: 2, name: 'Ready',     display_order: 1 },
  { id: 3, name: 'Scheduled', display_order: 2 },
  { id: 4, name: 'Waiting',   display_order: 3 },
  { id: 5, name: 'Done',      display_order: 4 },
];

function createMockDb() {
  let nextId = 1;
  const tasks = [];

  return {
    async query(sql, params = []) {
      if (sql.startsWith('SELECT') && sql.includes('FROM board_columns')) {
        return [...MOCK_COLUMNS].sort((a, b) => a.display_order - b.display_order);
      }
      if (sql.startsWith('SELECT') && sql.includes('FROM tasks')) {
        return [...tasks].reverse().map(t => ({
          ...t,
          column_name: MOCK_COLUMNS.find(c => c.id === t.column_id)?.name ?? null,
        }));
      }
      if (sql.startsWith('INSERT INTO tasks')) {
        const [title, column_id] = params;
        const task = { id: nextId++, title, column_id, created_at: new Date() };
        tasks.push(task);
        return { insertId: task.id };
      }
      if (sql.startsWith('UPDATE tasks')) {
        const [title, column_id, id] = params;
        const task = tasks.find(t => t.id === id);
        if (task) Object.assign(task, { title, column_id });
        return { affectedRows: task ? 1 : 0 };
      }
      if (sql.startsWith('DELETE FROM tasks')) {
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

test('GET /api/columns returns columns sorted by display_order', async () => {
  await withServer(createMockDb(), async (url) => {
    const res = await fetch(`${url}/api/columns`);
    assert.equal(res.status, 200);
    const columns = await res.json();
    assert.equal(columns.length, 5);
    assert.equal(columns[0].name, 'Backlog');
    assert.equal(columns[4].name, 'Done');
  });
});

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
      body: JSON.stringify({ title: 'My task', column_id: 1 }),
    });
    assert.equal(res.status, 201);
    const { id } = await res.json();
    assert.equal(typeof id, 'number');
  });
});

test('POST then GET returns the created task with column_name from the join', async () => {
  await withServer(createMockDb(), async (url) => {
    await fetch(`${url}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Board task', column_id: 2 }),
    });

    const res = await fetch(`${url}/api/tasks`);
    const tasks = await res.json();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].title, 'Board task');
    assert.equal(tasks[0].column_id, 2);
    assert.equal(tasks[0].column_name, 'Ready');
  });
});

test('PATCH /api/tasks/:id updates a task', async () => {
  await withServer(createMockDb(), async (url) => {
    const postRes = await fetch(`${url}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Original', column_id: 1 }),
    });
    const { id } = await postRes.json();

    const patchRes = await fetch(`${url}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated', column_id: 2 }),
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
      body: JSON.stringify({ title: 'To delete', column_id: 1 }),
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
      body: JSON.stringify({ column_id: 1 }),
    });
    assert.equal(res.status, 400);
  });
});

test('GET /api/columns returns 503 when no database is configured', async () => {
  await withServer(null, async (url) => {
    const res = await fetch(`${url}/api/columns`);
    assert.equal(res.status, 503);
  });
});

test('GET /api/tasks returns 503 when no database is configured', async () => {
  await withServer(null, async (url) => {
    const res = await fetch(`${url}/api/tasks`);
    assert.equal(res.status, 503);
  });
});
