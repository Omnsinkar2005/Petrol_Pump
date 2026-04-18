-- =====================================================================
-- Petrol Pump Employee Management and Alert System
-- MySQL Schema (Phase 1)
-- =====================================================================
-- Run this file in MySQL Workbench or via:
--   mysql -u root -p < schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS petrol_pump_db;
CREATE DATABASE petrol_pump_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE petrol_pump_db;

-- =====================================================================
-- 1. Employees
--    Core table — must be created before Users (Users references it).
-- =====================================================================
CREATE TABLE Employees (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)    NOT NULL,
  phone_number    VARCHAR(20)     NOT NULL UNIQUE,
  email_id        VARCHAR(150)    UNIQUE,
  role            VARCHAR(50)     NOT NULL COMMENT 'Job role e.g. pump_attendant, cashier',
  salary          DECIMAL(10, 2)  NOT NULL DEFAULT 0.00 COMMENT 'Base monthly salary',
  status          ENUM('active', 'on_leave', 'deactivated')
                                  NOT NULL DEFAULT 'active',
  joined_on       DATE            DEFAULT (CURRENT_DATE),
  created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employees_status (status)
) ENGINE=InnoDB;

-- =====================================================================
-- 2. Users
--    Auth table — every person who logs in has a row here.
--    Employees link to their own user row via employee_id.
--    Admin/Owner/Manager may or may not have an Employee row.
-- =====================================================================
CREATE TABLE Users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(50)     NOT NULL UNIQUE,
  password        VARCHAR(255)    NOT NULL COMMENT 'bcrypt hash (never plain text in production)',
  role            ENUM('admin', 'owner', 'manager', 'employee')
                                  NOT NULL,
  employee_id     INT             UNIQUE COMMENT 'Links to Employees.id for employee users',
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  last_login      DATETIME        NULL,
  created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_employee
    FOREIGN KEY (employee_id) REFERENCES Employees(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. Attendance
--    One row per employee per day.
--    working_hours auto-calculated on checkout in the backend.
-- =====================================================================
CREATE TABLE Attendance (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT             NOT NULL,
  date            DATE            NOT NULL,
  check_in        DATETIME        NOT NULL,
  check_out       DATETIME        NULL,
  working_hours   DECIMAL(5, 2)   DEFAULT 0.00,
  status          ENUM('present', 'half_day', 'absent')
                                  NOT NULL DEFAULT 'present',
  notes           VARCHAR(255)    NULL,
  created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES Employees(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uq_employee_date (employee_id, date),
  INDEX idx_attendance_date (date)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. Salaries
--    One row per employee per month.
--    Month stored as YYYY-MM (e.g., '2026-04').
-- =====================================================================
CREATE TABLE Salaries (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  employee_id     INT             NOT NULL,
  month           CHAR(7)         NOT NULL COMMENT 'Format: YYYY-MM',
  amount          DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
  total_hours     DECIMAL(6, 2)   DEFAULT 0.00,
  total_days      INT             DEFAULT 0,
  status          ENUM('pending', 'approved', 'paid')
                                  NOT NULL DEFAULT 'pending',
  generated_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  paid_at         DATETIME        NULL,
  notes           VARCHAR(255)    NULL,
  CONSTRAINT fk_salaries_employee
    FOREIGN KEY (employee_id) REFERENCES Employees(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  UNIQUE KEY uq_employee_month (employee_id, month),
  INDEX idx_salaries_month (month),
  INDEX idx_salaries_status (status)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. BorrowedPetrol
--    Petrol given on credit. Tracked until fully paid.
-- =====================================================================
CREATE TABLE BorrowedPetrol (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  borrower_name          VARCHAR(100)    NOT NULL,
  borrower_email         VARCHAR(150)    NULL,
  borrower_phone_number  VARCHAR(20)     NOT NULL,
  quantity               DECIMAL(10, 2)  NOT NULL COMMENT 'Litres of petrol',
  amount                 DECIMAL(10, 2)  NOT NULL COMMENT 'Monetary value',
  paid_amount            DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
  borrow_date            DATE            NOT NULL DEFAULT (CURRENT_DATE),
  deadline               DATE            NOT NULL,
  status                 ENUM('pending', 'alert_active', 'partially_paid', 'overdue', 'fully_paid')
                                         NOT NULL DEFAULT 'pending',
  recorded_by            INT             NULL COMMENT 'Users.id of manager who recorded this',
  notes                  VARCHAR(255)    NULL,
  created_at             TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_borrowed_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES Users(id)
    ON DELETE SET NULL,
  INDEX idx_borrowed_status (status),
  INDEX idx_borrowed_deadline (deadline)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. Alerts
--    Created automatically by the daily cron job.
--    Can link to a BorrowedPetrol row (deadline alerts).
-- =====================================================================
CREATE TABLE Alerts (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  message             TEXT            NOT NULL,
  alert_type          ENUM('deadline_approaching', 'overdue', 'system', 'custom')
                                      NOT NULL DEFAULT 'system',
  borrowed_petrol_id  INT             NULL,
  target_role         ENUM('admin', 'owner', 'manager', 'employee', 'all')
                                      NOT NULL DEFAULT 'owner',
  is_read             BOOLEAN         NOT NULL DEFAULT FALSE,
  date                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alerts_borrowed
    FOREIGN KEY (borrowed_petrol_id) REFERENCES BorrowedPetrol(id)
    ON DELETE CASCADE,
  INDEX idx_alerts_is_read (is_read),
  INDEX idx_alerts_date (date)
) ENGINE=InnoDB;

-- =====================================================================
-- Verify tables created
-- =====================================================================
SHOW TABLES;
