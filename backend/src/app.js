const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const employeeRoutes = require('./routes/employee.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const salaryRoutes = require('./routes/salary.routes');
const borrowedPetrolRoutes = require('./routes/borrowedPetrol.routes');
const alertRoutes = require('./routes/alert.routes');

const app = express();

// ----- CORS -----
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / curl / mobile apps (no origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ----- Body parsing -----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ----- Simple request logger -----
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ----- Routes -----
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'petrol-pump-backend',
    message: 'API is running. See /api/health for status.',
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/borrowed-petrol', borrowedPetrolRoutes);
app.use('/api/alerts', alertRoutes);

// ----- 404 + error handlers (must be last) -----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
