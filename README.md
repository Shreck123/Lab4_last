# Lab 3 — React Registration + Express + SQLite

## Requirements
- Node.js 22+
- npm

## Install
```bash
npm install
```

## Run
Open two terminals.

Terminal 1:
```bash
npm run server
```

Terminal 2:
```bash
npm run client
```

The React frontend runs on the Vite port (usually http://localhost:5173) and the backend runs on http://localhost:3001.

## Database
SQLite database is created automatically as `server/users.db` after the backend starts. Node.js 22 provides the SQLite API used by the backend.

Table: `users`
- id
- username
- email
- password_hash
- created_at

## Requests
- `POST /api/register` — validates and saves a new user in SQLite.
- `GET /api/user/:id` — reads the user from SQLite.

The browser Cookie `auth_token` stores the user ID for 7 days. The Cookie is used by the frontend to know which user should be requested with GET.
