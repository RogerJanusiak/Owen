import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

async function withServer(backup, fn) {
  const server = createServer(null, backup);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(url);
  } finally {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

test('POST /api/backup returns the saved filename', async () => {
  const mockBackup = async () => 'owen-backup-2026-05-21_14-30.sql';
  await withServer(mockBackup, async (url) => {
    const res = await fetch(`${url}/api/backup`, { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.filename, 'owen-backup-2026-05-21_14-30.sql');
  });
});

test('POST /api/backup returns 503 when backup is not configured', async () => {
  await withServer(null, async (url) => {
    const res = await fetch(`${url}/api/backup`, { method: 'POST' });
    assert.equal(res.status, 503);
  });
});

test('POST /api/backup returns 500 when the backup fails', async () => {
  const failingBackup = async () => { throw new Error('Destination not mounted'); };
  await withServer(failingBackup, async (url) => {
    const res = await fetch(`${url}/api/backup`, { method: 'POST' });
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'Destination not mounted');
  });
});
