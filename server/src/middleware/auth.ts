// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      } as admin.ServiceAccount),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
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
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('Request rejected: No authorization header');
      res.status(401).json({ error: 'No authorization header provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      console.log('Request rejected: Invalid token format');
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Try Firebase verification
    try {
      console.log(`Verifying token: ${token.substring(0, 10)}...`);
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log(`Token verified for user: ${decodedToken.uid}`);
      
      req.user = {
        userId: decodedToken.uid,
        email: decodedToken.email || '',
      };
      next();
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ error: 'Authentication error' });
    return;
  }
};