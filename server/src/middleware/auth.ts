// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    } as admin.ServiceAccount),
  });
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Try Firebase verification
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
    };
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ error: 'Authentication error' });
    return;
  }
};
