import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function serveFile(res, filePath, mimeType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const noCache = ['.html', '.css', '.js'].includes(path.extname(filePath));
    res.writeHead(200, {
      'Content-Type': mimeType,
      ...(noCache && { 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// db is an optional object with a query(sql, params) method.
// backup is an optional async function that returns the saved filename.
// When either is omitted, its routes return 503.
export function createServer(db = null, backup = null) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const method = req.method;

      res.setHeader('Access-Control-Allow-Origin', '*');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      // ── API routes ────────────────────────────────────────

      if (url.pathname.startsWith('/api/')) {

        // POST /api/backup  (does not require a database connection)
        if (method === 'POST' && url.pathname === '/api/backup') {
          if (!backup) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Backup not configured' }));
            return;
          }
          try {
            const filename = await backup();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, filename }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (!db) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Database not available' }));
          return;
        }

        // GET /api/tasks
        if (method === 'GET' && url.pathname === '/api/tasks') {
          const tasks = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(tasks));
          return;
        }

        // POST /api/tasks
        if (method === 'POST' && url.pathname === '/api/tasks') {
          const body = JSON.parse(await readBody(req));
          const { title, column_name = 'backlog', label = null } = body;

          if (!title) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'title is required' }));
            return;
          }

          const result = await db.query(
            'INSERT INTO tasks (title, column_name, label) VALUES (?, ?, ?)',
            [title, column_name, label],
          );
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: result.insertId }));
          return;
        }

        // PATCH /api/tasks/:id  and  DELETE /api/tasks/:id
        const taskMatch = url.pathname.match(/^\/api\/tasks\/(\d+)$/);
        if (taskMatch) {
          const id = Number(taskMatch[1]);

          if (method === 'PATCH') {
            const body = JSON.parse(await readBody(req));
            const { title, column_name, label } = body;
            await db.query(
              'UPDATE tasks SET title = ?, column_name = ?, label = ? WHERE id = ?',
              [title, column_name, label, id],
            );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (method === 'DELETE') {
            await db.query('DELETE FROM tasks WHERE id = ?', [id]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      // ── Static files ──────────────────────────────────────

      if (method === 'GET') {
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
        const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
        const filePath = path.join(PUBLIC_DIR, safePath);

        // Path traversal protection
        if (!filePath.startsWith(PUBLIC_DIR)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        serveFile(res, filePath, mimeType);
        return;
      }

      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method not allowed');

    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { createDb }    = await import('./db.js');
  const { runBackup }   = await import('./backup.js');
  const db = createDb();
  const server = createServer(db, runBackup);

  async function attemptBackup(label) {
    try {
      const filename = await runBackup();
      console.log(`${label} backup saved: ${filename}`);
    } catch (err) {
      console.error(`${label} backup failed: ${err.message}`);
    }
  }

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    setInterval(() => attemptBackup('Hourly'), 60 * 60 * 1000);
  });

  async function shutdown() {
    console.log('Shutting down...');
    await attemptBackup('Shutdown');
    server.close(() => process.exit(0));
  }

  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
}
