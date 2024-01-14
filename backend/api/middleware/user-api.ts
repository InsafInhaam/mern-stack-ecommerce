import express from "express";
import { body } from "express-validator";
import {
  registrationUser,
  loginUser,
  activateUserHandler,
} from "../../database/repository/user-repository";
import { CatchAsyncError } from "../../utils/catchAsyncErrors";

const router = express.Router();

// Registration route
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Invalid email address"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  CatchAsyncError(registrationUser)
);

// Activation route
router.post(
  "/activate",
  [
    body("activation_token")
      .notEmpty()
      .withMessage("Activation token is required"),
    body("activation_code")
      .notEmpty()
      .withMessage("Activation code is required"),
  ],
  CatchAsyncError(activateUserHandler)
);

// Login route
router.post(
  "/login",
  [body("email").isEmail(), body("password").isLength({ min: 6 })],
  loginUser
);

export default router;
