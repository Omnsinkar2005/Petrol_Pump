-- =====================================================================
-- Petrol Pump — Seed data for development/testing
-- =====================================================================
-- Run AFTER schema.sql
--
-- IMPORTANT: The bcrypt hashes below are PLACEHOLDERS and WILL NOT WORK
-- until you run the reset script:
--     cd backend && node scripts/setDevPasswords.js
-- That script generates a real bcrypt hash of 'password123' and writes it
-- to every Users row. Do this once after running seed.sql.
-- Change these immediately in any non-dev environment.
-- =====================================================================

USE petrol_pump_db;

-- ----------------------------------------------------------------------
-- Clear existing data (safe for repeated seeding in dev)
-- ----------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Alerts;
TRUNCATE TABLE BorrowedPetrol;
TRUNCATE TABLE Salaries;
TRUNCATE TABLE Attendance;
TRUNCATE TABLE Users;
TRUNCATE TABLE Employees;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------
-- Employees (create first so Users can reference them)
-- ----------------------------------------------------------------------
INSERT INTO Employees (id, name, phone_number, email_id, role, salary, status) VALUES
  (1, 'Rajesh Kumar',  '9876543210', 'rajesh@example.com',  'manager',         35000.00, 'active'),
  (2, 'Amit Sharma',   '9876543211', 'amit@example.com',    'pump_attendant',  18000.00, 'active'),
  (3, 'Priya Patel',   '9876543212', 'priya@example.com',   'cashier',         20000.00, 'active'),
  (4, 'Suresh Yadav',  '9876543213', 'suresh@example.com',  'pump_attendant',  18000.00, 'active');

-- ----------------------------------------------------------------------
-- Users
-- All passwords are 'password123'
-- bcrypt hash ($2b$10$) — regenerate in production
-- ----------------------------------------------------------------------
INSERT INTO Users (username, password, role, employee_id) VALUES
  ('admin',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',    NULL),
  ('owner',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner',    NULL),
  ('rajesh',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager',  1),
  ('amit',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 2),
  ('priya',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 3),
  ('suresh',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee', 4);

-- ----------------------------------------------------------------------
-- Attendance (last few days for Amit and Priya)
-- ----------------------------------------------------------------------
INSERT INTO Attendance (employee_id, date, check_in, check_out, working_hours, status) VALUES
  (2, CURDATE() - INTERVAL 2 DAY, CONCAT(CURDATE() - INTERVAL 2 DAY, ' 09:00:00'), CONCAT(CURDATE() - INTERVAL 2 DAY, ' 18:00:00'), 9.00, 'present'),
  (2, CURDATE() - INTERVAL 1 DAY, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 09:15:00'), CONCAT(CURDATE() - INTERVAL 1 DAY, ' 17:45:00'), 8.50, 'present'),
  (3, CURDATE() - INTERVAL 2 DAY, CONCAT(CURDATE() - INTERVAL 2 DAY, ' 09:30:00'), CONCAT(CURDATE() - INTERVAL 2 DAY, ' 18:00:00'), 8.50, 'present'),
  (3, CURDATE() - INTERVAL 1 DAY, CONCAT(CURDATE() - INTERVAL 1 DAY, ' 09:00:00'), CONCAT(CURDATE() - INTERVAL 1 DAY, ' 13:00:00'), 4.00, 'half_day');

-- ----------------------------------------------------------------------
-- Salaries (previous month, pending approval)
-- ----------------------------------------------------------------------
INSERT INTO Salaries (employee_id, month, amount, total_hours, total_days, status) VALUES
  (2, DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m'), 18000.00, 220.00, 26, 'paid'),
  (3, DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m'), 20000.00, 215.00, 25, 'paid'),
  (4, DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m'), 18000.00, 200.00, 24, 'approved');

-- ----------------------------------------------------------------------
-- Borrowed Petrol (mix of statuses, including one due soon for alerts)
-- ----------------------------------------------------------------------
INSERT INTO BorrowedPetrol (borrower_name, borrower_email, borrower_phone_number, quantity, amount, borrow_date, deadline, status, recorded_by) VALUES
  ('Ramesh Auto Service', 'ramesh@example.com',  '9988776655', 50.00,  5000.00, CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 1 DAY,  'alert_active',   3),
  ('Local Truck Agency',  NULL,                  '9988776644', 120.00, 12000.00, CURDATE() - INTERVAL 20 DAY, CURDATE() - INTERVAL 2 DAY, 'overdue',        3),
  ('Farmer Group',        'farmer@example.com',  '9988776633', 30.00,  3000.00, CURDATE() - INTERVAL 5 DAY,  CURDATE() + INTERVAL 10 DAY, 'pending',        3),
  ('City Cab Service',    'cabs@example.com',    '9988776622', 80.00,  8000.00, CURDATE() - INTERVAL 15 DAY, CURDATE() - INTERVAL 1 DAY, 'fully_paid',     3);

-- ----------------------------------------------------------------------
-- Alerts
-- ----------------------------------------------------------------------
INSERT INTO Alerts (message, alert_type, borrowed_petrol_id, target_role, is_read, date) VALUES
  ('Deadline approaching for Ramesh Auto Service (50L, Rs.5000) — due tomorrow.', 'deadline_approaching', 1, 'owner', FALSE, NOW()),
  ('Payment overdue from Local Truck Agency (Rs.12000) — deadline was 2 days ago.', 'overdue', 2, 'owner', FALSE, NOW());

-- ----------------------------------------------------------------------
-- Verify
-- ----------------------------------------------------------------------
SELECT 'Employees' AS table_name, COUNT(*) AS rows_count FROM Employees
UNION ALL SELECT 'Users', COUNT(*) FROM Users
UNION ALL SELECT 'Attendance', COUNT(*) FROM Attendance
UNION ALL SELECT 'Salaries', COUNT(*) FROM Salaries
UNION ALL SELECT 'BorrowedPetrol', COUNT(*) FROM BorrowedPetrol
UNION ALL SELECT 'Alerts', COUNT(*) FROM Alerts;
