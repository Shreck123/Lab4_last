import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new DatabaseSync(path.join(__dirname, 'users.db'));
const PORT = 3001;

// Create the database table automatically on first start.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'http://localhost:5173'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 100000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // POST /api/register — save a new user in SQLite.
  if (req.method === 'POST' && req.url === '/api/register') {
    try {
      const { username, email, password } = await readBody(req);

      if (!username || !email || !password) {
        return sendJson(res, 400, { message: 'All fields are required.' });
      }

      const normalizedUsername = username.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const passwordHash = hashPassword(password);

      const insert = db.prepare(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `);

      let result;
      try {
        result = insert.run(normalizedUsername, normalizedEmail, passwordHash);
      } catch (error) {
        if (String(error.message).includes('UNIQUE constraint failed')) {
          return sendJson(res, 409, { message: 'Username or email already exists.' });
        }
        throw error;
      }

      const user = db.prepare(`
        SELECT id, username, email, created_at
        FROM users
        WHERE id = ?
      `).get(result.lastInsertRowid);

      return sendJson(res, 201, {
        status: 201,
        token: String(user.id),
        user
      });
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { message: error.message || 'Server error.' });
    }
  }

  // GET /api/user/:id — read a user from SQLite.
  const match = req.url?.match(/^\/api\/user\/(\d+)$/);
  if (req.method === 'GET' && match) {
    const user = db.prepare(`
      SELECT id, username, email, created_at
      FROM users
      WHERE id = ?
    `).get(Number(match[1]));

    if (!user) {
      return sendJson(res, 404, { message: 'User not found.' });
    }

    return sendJson(res, 200, { user });
  }

  sendJson(res, 404, { message: 'Route not found.' });
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`SQLite database: ${path.join(__dirname, 'users.db')}`);
});
