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

## SMS alerts

Borrowed petrol deadline alerts can also send SMS to:

- the owner number(s) from `OWNER_SMS_PHONE`
- the borrower number from `BorrowedPetrol.borrower_phone_number`

These SMS reminders are sent only for records due today or tomorrow, using the same daily scan that creates owner alerts.

Set these in `backend/.env`:

```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
OWNER_SMS_PHONE=+919876543210
```

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
