import express from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser } from '../../database/repository/user-repository';

const router = express.Router();

// Register user route
router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  registerUser
);

// Login route
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  loginUser
);

export default router;
