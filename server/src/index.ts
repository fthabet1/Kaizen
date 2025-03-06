// server/src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import timeEntryRoutes from './routes/timeEntries';
import tagRoutes from './routes/tags';
import statsRoutes from './routes/stats';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// API routes
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/time-entries', authMiddleware, timeEntryRoutes);
app.use('/api/tags', authMiddleware, tagRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
