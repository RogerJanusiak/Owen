import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

test('GET / serves index.html', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const body = await res.text();
  assert.match(body, /Hello, World/);
});

test('GET /health returns ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.deepEqual(json, { status: 'ok' });
});

test('GET /style.css serves CSS', async () => {
  const res = await fetch(`${baseUrl}/style.css`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/css/);
});

test('GET /app.js serves JavaScript', async () => {
  const res = await fetch(`${baseUrl}/app.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/javascript/);
});

test('GET /nonexistent returns 404', async () => {
  const res = await fetch(`${baseUrl}/nonexistent.html`);
  assert.equal(res.status, 404);
});

test('POST / returns 405 method not allowed', async () => {
  const res = await fetch(`${baseUrl}/`, { method: 'POST' });
  assert.equal(res.status, 405);
});

test('OPTIONS returns 204 for CORS preflight', async () => {
  const res = await fetch(`${baseUrl}/`, { method: 'OPTIONS' });
  assert.equal(res.status, 204);
});

test('path traversal is blocked', async () => {
  const res = await fetch(`${baseUrl}/../package.json`);
  // Either 403 forbidden or 404 not found is acceptable
  assert.ok([403, 404].includes(res.status), `Expected 403 or 404, got ${res.status}`);
});

test('HTML response has no-cache headers', async () => {
  const res = await fetch(`${baseUrl}/`);
  const cacheControl = res.headers.get('cache-control');
  assert.ok(cacheControl, 'Expected Cache-Control header');
  assert.match(cacheControl, /no-cache/);
});
