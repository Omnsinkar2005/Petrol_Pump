const express = require('express');
const { login, me, logout } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public
router.post('/login', login);

// Authenticated
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

module.exports = router;
