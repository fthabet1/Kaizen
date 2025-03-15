/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

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
  start_time: string; // ISO format string
  end_time?: string | null;
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
      // Try to load from localStorage
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

      // Check if there's an active timer in the database
      const checkActiveTimer = async () => {
        try {
          const response = await axios.get('/api/time-entries/active');
          if (response.data) {
            const activeEntry = response.data;
            
            setCurrentTask({
              id: activeEntry.task_id,
              name: activeEntry.task_name,
              project_id: activeEntry.project_id
            });
            
            setCurrentProject({
              id: activeEntry.project_id,
              name: activeEntry.project_name,
              color: activeEntry.project_color
            });
            
            setStartTime(new Date(activeEntry.start_time));
            setDescription(activeEntry.description || '');
            setIsRunning(true);
            
            // Save to localStorage as backup
            if (user.uid) {
              localStorage.setItem(`timer_${user.uid}`, JSON.stringify({
                taskId: activeEntry.task_id,
                taskName: activeEntry.task_name,
                projectId: activeEntry.project_id,
                projectName: activeEntry.project_name,
                projectColor: activeEntry.project_color,
                startTimeStr: activeEntry.start_time,
                description: activeEntry.description || ''
              }));
            }
          }
        } catch (error) {
          console.error('Error checking active timer:', error);
        }
      };
      
      checkActiveTimer();
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

  // Start the timer with enhanced debugging
  const startTimer = async (taskId: number, projectId: number, taskDescription?: string) => {
    console.log('---- START TIMER DEBUGGING ----');
    console.log('Starting timer for task:', taskId, 'project:', projectId);
    
    try {
      // First, stop any running timer
      if (isRunning) {
        console.log('Timer already running, stopping first...');
        await stopTimer();
      }
      
      console.log('Fetching task and project details...');
      // Get task and project details
      let taskResponse, projectResponse;
      try {
        [taskResponse, projectResponse] = await Promise.all([
          axios.get(`/api/tasks/${taskId}`),
          axios.get(`/api/projects/${projectId}`)
        ]);
        
        console.log('Successfully fetched task:', taskResponse.data);
        console.log('Successfully fetched project:', projectResponse.data);
      } catch (error) {
        console.error('Error fetching task or project:', error);
        throw new Error('Failed to fetch task or project details');
      }
      
      const task = taskResponse.data;
      const project = projectResponse.data;
      
      // Create new time entry
      const now = new Date();
      console.log('Creating time entry with start time:', now);
      
      const newTimeEntry = {
        task_id: taskId,
        start_time: now.toISOString(),
        description: taskDescription || ''
      };
      
      console.log('Time entry payload:', JSON.stringify(newTimeEntry));
      
      // Make the API request with error handling
      try {
        console.log('Sending POST request to /api/time-entries');
        const timeEntryResponse = await axios.post('/api/time-entries', newTimeEntry);
        console.log('Time entry created successfully:', timeEntryResponse.data);
      } catch (error) {
        console.error('Error creating time entry:', error);
        
        // Log more detailed error info
        if (axios.isAxiosError(error)) {
          console.error('Status:', error.response?.status);
          console.error('Response data:', error.response?.data);
          console.error('Request config:', error.config);
        }
        
        throw new Error('Failed to create time entry');
      }
      
      // Update state
      console.log('Updating timer state...');
      setCurrentTask(task);
      setCurrentProject(project);
      setStartTime(now);
      setDescription(taskDescription || '');
      setIsRunning(true);
      console.log('Timer started successfully');
      console.log('---- END TIMER DEBUGGING ----');
    } catch (error) {
      console.error('Complete error in startTimer:', error);
      throw error;
    }
  };

  // Stop the timer
  const stopTimer = async () => {
    if (!isRunning || !startTime || !currentTask) {
      return;
    }
    
    console.log('---- STOP TIMER DEBUGGING ----');
    console.log('Stopping timer for task:', currentTask.id);
    
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      console.log('End time:', endTime, 'Duration:', duration);
      
      // Find the active time entry
      console.log('Finding active time entry...');
      let response;
      try {
        response = await axios.get('/api/time-entries', {
          params: {
            task_id: currentTask.id,
            is_active: true
          }
        });
        console.log('Active entries response:', response.data);
      } catch (error) {
        console.error('Error finding active time entry:', error);
        throw new Error('Failed to find active time entry');
      }
      
      if (response.data && response.data.length > 0) {
        const activeEntry = response.data[0];
        console.log('Found active entry:', activeEntry);
        
        // Update the time entry with end time and duration
        const updatePayload = {
          end_time: endTime.toISOString(),
          duration,
          description
        };
        console.log('Updating time entry with:', JSON.stringify(updatePayload));
        
        try {
          await axios.put(`/api/time-entries/${activeEntry.id}`, updatePayload);
          console.log('Time entry updated successfully');
        } catch (error) {
          console.error('Error updating time entry:', error);
          
          // Log more detailed error info
          if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('Response data:', error.response?.data);
            console.error('Request config:', error.config);
          }
          
          throw new Error('Failed to update time entry');
        }
        
        // Reset state
        setIsRunning(false);
        setCurrentTask(null);
        setCurrentProject(null);
        setStartTime(null);
        setElapsedTime(0);
        setDescription('');
        console.log('Timer state reset');
        
        // Return for chaining
        console.log('---- END STOP TIMER DEBUGGING ----');
        return;
      } else {
        // No active entry found - this is unusual but we can handle it
        console.warn('No active time entry found to stop');
        
        // Reset state anyway
        setIsRunning(false);
        setCurrentTask(null);
        setCurrentProject(null);
        setStartTime(null);
        setElapsedTime(0);
        setDescription('');
        console.log('Timer state reset');
        
        console.log('---- END STOP TIMER DEBUGGING ----');
        return;
      }
    } catch (error) {
      console.error('Complete error in stopTimer:', error);
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