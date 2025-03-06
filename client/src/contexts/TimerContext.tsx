import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContexts';

interface Task {
  id: number;
  name: string;
  project_id: number;
}

interface Project {
  id: number;
  name: string;
  color: string;
}

interface TimeEntry {
  id?: number;
  task_id: number;
  start_time: Date;
  end_time?: Date | null;
  duration?: number | null;
  description?: string;
}

interface TimerContextType {
  isRunning: boolean;
  currentTask: Task | null;
  currentProject: Project | null;
  startTime: Date | null;
  elapsedTime: number; // in seconds
  description: string;
  startTimer: (taskId: number, projectId: number, description?: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  discardTimer: () => void;
  setDescription: (description: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [description, setDescription] = useState('');
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Load active timer from localStorage on init
  useEffect(() => {
    if (user) {
      const savedTimer = localStorage.getItem(`timer_${user.uid}`);
      if (savedTimer) {
        try {
          const { 
            taskId, taskName, projectId, projectName, projectColor,
            startTimeStr, description: savedDescription 
          } = JSON.parse(savedTimer);
          
          const parsedStartTime = new Date(startTimeStr);
          
          // Only restore if it's a valid date
          if (!isNaN(parsedStartTime.getTime())) {
            setCurrentTask({ id: taskId, name: taskName, project_id: projectId });
            setCurrentProject({ id: projectId, name: projectName, color: projectColor });
            setStartTime(parsedStartTime);
            setDescription(savedDescription || '');
            setIsRunning(true);
          }
        } catch (error) {
          console.error('Error parsing saved timer', error);
          localStorage.removeItem(`timer_${user.uid}`);
        }
      }
    }
  }, [user]);

  // Set up timer interval when running
  useEffect(() => {
    if (isRunning && startTime) {
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Create new interval to update elapsed time every second
      const interval = setInterval(() => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(seconds);
      }, 1000);
      
      setTimerInterval(interval);
      
      // Initial calculation
      const now = new Date();
      const seconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(seconds);
      
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [isRunning, startTime, timerInterval]);

  // Save timer to localStorage when it changes
  useEffect(() => {
    if (user && isRunning && currentTask && currentProject && startTime) {
      localStorage.setItem(`timer_${user.uid}`, JSON.stringify({
        taskId: currentTask.id,
        taskName: currentTask.name,
        projectId: currentProject.id,
        projectName: currentProject.name,
        projectColor: currentProject.color,
        startTimeStr: startTime.toISOString(),
        description
      }));
    } else if (user && !isRunning) {
      localStorage.removeItem(`timer_${user.uid}`);
    }
  }, [user, isRunning, currentTask, currentProject, startTime, description]);

  // Start the timer
  const startTimer = async (taskId: number, projectId: number, taskDescription?: string) => {
    try {
      // First, stop any running timer
      if (isRunning) {
        await stopTimer();
      }
      
      // Get task and project details
      const [taskResponse, projectResponse] = await Promise.all([
        axios.get(`/api/tasks/${taskId}`),
        axios.get(`/api/projects/${projectId}`)
      ]);
      
      const task = taskResponse.data;
      const project = projectResponse.data;
      
      // Create new time entry
      const now = new Date();
      const newTimeEntry: TimeEntry = {
        task_id: taskId,
        start_time: now,
        description: taskDescription || ''
      };
      
      await axios.post('/api/time-entries', newTimeEntry);
      
      // Update state
      setCurrentTask(task);
      setCurrentProject(project);
      setStartTime(now);
      setDescription(taskDescription || '');
      setIsRunning(true);
    } catch (error) {
      console.error('Error starting timer', error);
      throw error;
    }
  };

  // Stop the timer
  const stopTimer = async () => {
    if (!isRunning || !startTime || !currentTask) {
      return;
    }
    
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Find the active time entry
      const response = await axios.get('/api/time-entries', {
        params: {
          task_id: currentTask.id,
          is_active: true
        }
      });
      
      if (response.data && response.data.length > 0) {
        const activeEntry = response.data[0];
        
        // Update the time entry with end time and duration
        await axios.put(`/api/time-entries/${activeEntry.id}`, {
          end_time: endTime,
          duration,
          description
        });
      }
      
      // Reset state
      setIsRunning(false);
      setCurrentTask(null);
      setCurrentProject(null);
      setStartTime(null);
      setElapsedTime(0);
      setDescription('');
    } catch (error) {
      console.error('Error stopping timer', error);
      throw error;
    }
  };

  // Discard the timer without saving
  const discardTimer = () => {
    if (!isRunning) {
      return;
    }
    
    // Reset state
    setIsRunning(false);
    setCurrentTask(null);
    setCurrentProject(null);
    setStartTime(null);
    setElapsedTime(0);
    setDescription('');
    
    // Clean up localStorage
    if (user) {
      localStorage.removeItem(`timer_${user.uid}`);
    }
  };

  const value = {
    isRunning,
    currentTask,
    currentProject,
    startTime,
    elapsedTime,
    description,
    startTimer,
    stopTimer,
    discardTimer,
    setDescription
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
