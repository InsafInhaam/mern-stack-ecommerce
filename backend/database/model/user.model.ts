import { Pool } from 'mysql';
import pool from '../../utils/connection';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface User {
  id: number;
  email: string;
  password: string;
}

const JWT_SECRET = 'vbubpafvbvfew4'; // Replace with a strong, secret key


export const createUser = async (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (error, results) => {
      if (error) {
        reject(error);
      } else {
        const newUser: User = { id: results.insertId, email, password };
        resolve(newUser);
      }
    });
  });
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
      if (error) {
        reject(error);
      } else {
        const user: User | null = results.length ? results[0] : null;
        resolve(user);
      }
    });
  });
};

export const comparePasswords = async (inputPassword: string, storedPassword: string): Promise<boolean> => {
    return bcrypt.compare(inputPassword, storedPassword);
  };
  
  export const generateTokens = (userId: number, userEmail: string): { accessToken: string; refreshToken: string } => {
    // Generate access token
    const accessToken = jwt.sign({ userId, userEmail }, JWT_SECRET, { expiresIn: '15m' });
  
    // Generate refresh token
    const refreshToken = jwt.sign({ userId, userEmail }, JWT_SECRET, { expiresIn: '7d' });
  
    return { accessToken, refreshToken };
  };
  