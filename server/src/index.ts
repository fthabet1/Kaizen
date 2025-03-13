// server/src/index.ts
import express, { Request, Response, NextFunction } from 'express';
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

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// Debug endpoint to check user routes
app.get('/api/debug/routes', (req: Request, res: Response) => {
  const routes: any[] = [];
  
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) { // routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') { // router middleware
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods);
          routes.push({ path: middleware.regexp.toString(), subPath: path, methods });
        }
      });
    }
  });
  
  res.status(200).json({ routes });
});

// API routes
console.log('Registering /api/users routes');
app.use('/api/users', authMiddleware, userRoutes);

console.log('Registering /api/projects routes');
app.use('/api/projects', authMiddleware, projectRoutes);

console.log('Registering /api/tasks routes');
app.use('/api/tasks', authMiddleware, taskRoutes);

console.log('Registering /api/time-entries routes');
app.use('/api/time-entries', authMiddleware, timeEntryRoutes);

console.log('Registering /api/tags routes');
app.use('/api/tags', authMiddleware, tagRoutes);

console.log('Registering /api/stats routes');
app.use('/api/stats', authMiddleware, statsRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

// Catch-all route handler - must be last
app.use('*', (req: Request, res: Response) => {
  console.error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
  console.log('Available routes:');
  console.log('- /api/health (health check)');
  console.log('- /api/users/* (user endpoints)');
  console.log('- /api/projects/* (project endpoints)');
  console.log('- /api/tasks/* (task endpoints)');
  console.log('- /api/time-entries/* (time entry endpoints)');
  console.log('- /api/tags/* (tag endpoints)');
  console.log('- /api/stats/* (statistics endpoints)');
});

export default app;