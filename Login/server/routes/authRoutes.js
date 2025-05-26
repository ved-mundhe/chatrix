import express from 'express';
import {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  verifyOtp
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/request-reset', requestPasswordReset);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;