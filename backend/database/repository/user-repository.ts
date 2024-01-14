import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import {
  createUser,
  getUserByEmail,
  comparePasswords,
  generateTokens,
} from "../../database/model/user.model";
import bcrypt from "bcrypt";
import jwt, { Secret } from "jsonwebtoken";
import path, { resolve } from "path";
import ejs from "ejs";
import pool from "../../utils/connection";
import ErrorHandler from "../../utils/ErrorHandlers";
import { CatchAsyncError } from "../../utils/catchAsyncErrors";
import sendMail from "../../utils/sendMail";
import { MysqlError } from "mysql";

// export const registerUser = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { email, password } = req.body;

//     // Validation
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       res.status(400).json({ errors: errors.array() });
//       return;
//     }

//     // Check if user already exists
//     const existingUser = await getUserByEmail(email);
//     if (existingUser) {
//       res.status(400).json({ error: 'User already exists' });
//       return;
//     }

//     // Create user
//     const newUser = await createUser(email, password);

//     res.status(201).json({ message: 'User registered successfully', user: newUser });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

interface IUser {
  name: string;
  email: string;
  password: string;
}

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

interface IActivationToken {
  token: string;
  activationCode: string;
}

const createActivationToken = (user: IUser): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );

  return { token, activationCode };
};

const sendActivationEmail = async (
  email: string,
  activationCode: string,
  user: IUser
) => {
  const data = { user: { name: user.name }, activationCode };
  const subject = "Activate your account";

  try {
    await sendMail({ email, subject, template: "activation-mail.ejs", data });
    console.log("Activation email sent to:", email);
  } catch (error) {
    console.error("Error sending activation email:", error);
    throw new ErrorHandler("Error sending activation email", 500);
  }
};

const registerUser = async (user: IUser): Promise<number> => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const { name, email } = user;

  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
      (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results.insertId);
        }
      }
    );
  });
};

const activateUser = async (email: string, name: string, activationCode: string) => {
  try {
    // console.log('Activation Code:', activationCode);
    // console.log('Email:', email);

    // Check if the user exists in the database
    const userExists = await new Promise<boolean>((resolve, reject) => {
      pool.query(
        "SELECT 1 FROM users WHERE email = ?",
        [email],
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results.length > 0);
          }
        }
      );
    });

    if (!userExists) {
      // If the user does not exist, insert a new user
      await registerUser({ name, email, password: "" });
    }

    // Now, update the user's activation status
    await new Promise<void>((resolve, reject) => {
      pool.query(
        "UPDATE users SET activated = 1 WHERE email = ? AND activation_code = ?",
        [email, activationCode],
        (error, results) => {
          if (error) {
            console.error("Error updating user activation:", error);
            reject(error);
          } else if (results.affectedRows === 0) {
            console.error("No rows affected during activation:", results);
            reject(new ErrorHandler("Invalid activation code or email", 400));
          } else {
            resolve();
          }
        }
      );
    });
  } catch (error) {
    console.error("Error activating user:", error);
    throw new ErrorHandler("Invalid activation code or email", 400);
  }
};

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body as IRegistrationBody;

      const isEmailExist = await new Promise<boolean>((resolve, reject) => {
        pool.query(
          "SELECT 1 FROM users WHERE email = ?",
          [email],
          (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results.length > 0);
            }
          }
        );
      });

      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: IUser = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      try {
        await sendActivationEmail(email, activationCode, user);

        res.status(201).json({
          success: true,
          message: `Please check your email ${email} to activate your account!`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const activateUserHandler = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } = req.body as {
        activation_token: string;
        activation_code: string;
      };

      const decodedToken = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (decodedToken.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const hashedPassword = await bcrypt.hash(decodedToken.user.password, 10);

      pool.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [decodedToken.user.name, decodedToken.user.email, hashedPassword],
        (error, results) => {
          if (error) {
            console.error("Error inserting user:", error);
            return next(new ErrorHandler("Error creating user", 500));
          }

          res.status(201).json({
            success: true,
            message: "Account activated successfully",
          });
        }
      );
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);


export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials1" });
      return;
    }

    console.log(user.password);
    // Check password
    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Generate token
    const token = generateTokens(user.id, user.email);

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
function reject(error: MysqlError) {
  throw new Error("Function not implemented.");
}

