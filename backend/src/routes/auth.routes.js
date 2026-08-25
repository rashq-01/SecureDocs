const express = require('express');
const router = express.Router();
const { login, refresh, logout, updatePreferences, changePassword } = require('../controllers/auth.controller');
const verifyJWT = require('../middlewares/verifyJWT.middleware');
const { loginRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validateRequest.middleware');

// Validation rules
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const refreshValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

// Routes with rate limiting
router.post('/login', loginRateLimiter, loginValidation, validateRequest, login);
router.post('/refresh', refreshValidation, validateRequest, refresh);
router.post('/logout', verifyJWT, logout);
router.patch('/preferences', verifyJWT, updatePreferences);
router.patch('/password', verifyJWT, changePassword);

module.exports = router;