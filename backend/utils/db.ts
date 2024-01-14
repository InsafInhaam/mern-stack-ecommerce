import pool from './connection';

export const createUser = async (email: string, password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve({ id: results.insertId, email });
      }
    });
  });
};

export const getUserByEmail = async (email: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results[0]);
      }
    });
  });
};

export const comparePasswords = async (inputPassword: string, storedPassword: string): Promise<boolean> => {
  // Use a secure password comparison library like bcrypt
  // For simplicity, we'll use a basic comparison here
  return inputPassword === storedPassword;
};

export const generateToken = (userId: number, userEmail: string): string => {
  // Implement your token generation logic (e.g., using JWT)
  // For simplicity, we'll return a dummy token here
  return `dummy_token_${userId}_${userEmail}`;
};
