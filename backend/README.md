# Backend — Petrol Pump Management API

Node.js + Express REST API with MySQL.

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the example env file and edit it with your MySQL credentials:

```bash
cp .env.example .env
```

Edit `.env` → set `DB_PASSWORD` to your MySQL root password.

### 3. Ensure database is set up

Make sure you've already run `database/schema.sql` and `database/seed.sql`
in MySQL (see `database/README.md`).

### 4. Run the server

Development mode (auto-reloads on changes):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server starts at `http://localhost:5000`.

## Verifying it works

Visit these in a browser or with `curl`:

- `http://localhost:5000/` — should return service info JSON
- `http://localhost:5000/api/health` — should report `database.connected: true`

## Folder layout

```
backend/
├── server.js               entry point
├── .env                    (gitignored) local secrets
├── .env.example            template
├── package.json
└── src/
    ├── app.js              Express app + middleware
    ├── config/
    │   └── db.js           MySQL pool
    ├── middleware/
    │   └── errorHandler.js notFound + error handler
    └── routes/
        └── health.routes.js
```

More folders (`controllers/`, `services/`, `jobs/`) will be added in later phases.
