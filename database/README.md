# Database — Petrol Pump Management System

MySQL schema and seed files for the Petrol Pump Employee Management
and Alert System.

## Files

| File         | Purpose                                       |
| ------------ | --------------------------------------------- |
| `schema.sql` | Drops and recreates `petrol_pump_db` + tables |
| `seed.sql`   | Inserts sample users, employees, records      |

## Tables

1. **Employees** — employee profiles (name, phone, email, role, salary).
2. **Users** — authentication accounts (linked to Employees for employee logins).
3. **Attendance** — daily check-in / check-out records.
4. **Salaries** — monthly salary records per employee.
5. **BorrowedPetrol** — petrol given on credit, with repayment deadlines.
6. **Alerts** — system-generated notifications (primarily deadline alerts).

## Setup

### Option A — MySQL Workbench (recommended for beginners)

1. Open MySQL Workbench → connect to your local MySQL server.
2. `File > Open SQL Script` → select `schema.sql` → Execute (⚡ lightning icon).
3. Open `seed.sql` → Execute.
4. Refresh the schema browser — you should see the `petrol_pump_db` database
   with six tables populated.

### Option B — Command line

```bash
cd database
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
```

## Seeded accounts

All passwords below are **`password123`** (bcrypt-hashed in the seed file).

| Username | Role     | Linked Employee |
| -------- | -------- | --------------- |
| `admin`  | admin    | —               |
| `owner`  | owner    | —               |
| `rajesh` | manager  | Rajesh Kumar    |
| `amit`   | employee | Amit Sharma     |
| `priya`  | employee | Priya Patel     |
| `suresh` | employee | Suresh Yadav    |

> Change these passwords before any non-dev deployment.

## Notes

- `schema.sql` uses `DROP DATABASE IF EXISTS` — running it will wipe
  any existing data. Safe for development, **never** run it in production.
- Character set is `utf8mb4` so names with any script are supported.
- All tables use InnoDB for foreign-key support and transactions.
