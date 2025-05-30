/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '../utils/axiosConfig';
import { useAuth } from './AuthContexts';
import { parseISOWithTimezone, toUTCString, getLocalTimezoneName } from '../utils/dateUtils';

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
  adjustStartTime: (newStartTime: Date) => Promise<void>;
  deleteTimeEntry: (entryId: number) => Promise<boolean>;
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
  const [activeTimeEntryId, setActiveTimeEntryId] = useState<number | null>(null);
  const { user, token, isReady } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Load active timer from API on init
  useEffect(() => {
    if (isReady && user && token) {
      // Check if there's an active timer in the database
      const checkActiveTimer = async () => {
        try {
          console.log('Checking for active timer in database...');
          const response = await axios.get('/api/time-entries/active', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data) {
            console.log('Found active timer in database:', response.data);
            const activeEntry = response.data;
            
            setActiveTimeEntryId(activeEntry.id);
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
            
            // Use our improved date parser that handles timezone properly
            const startTimeDate = parseISOWithTimezone(activeEntry.start_time);
            console.log('Loaded start time from API (UTC):', activeEntry.start_time);
            console.log('Parsed start time (local):', startTimeDate.toString());
            console.log('Current time (local):', new Date().toString());
            console.log('Timezone offset (minutes):', new Date().getTimezoneOffset());
            console.log('Browser timezone:', getLocalTimezoneName());
            
            setStartTime(startTimeDate);
            setDescription(activeEntry.description || '');
            setIsRunning(true);
            
            // Immediately calculate the elapsed time based on the loaded start time
            const now = new Date();
            const calculatedElapsedTime = Math.max(0, Math.floor((now.getTime() - startTimeDate.getTime()) / 1000));
            setElapsedTime(calculatedElapsedTime);
            
            // Save to localStorage as backup
            if (user.uid) {
              localStorage.setItem(`timer_${user.uid}`, JSON.stringify({
                taskId: activeEntry.task_id,
                taskName: activeEntry.task_name,
                projectId: activeEntry.project_id,
                projectName: activeEntry.project_name,
                projectColor: activeEntry.project_color,
                startTimeStr: activeEntry.start_time,
                description: activeEntry.description || '',
                timeEntryId: activeEntry.id
              }));
            }
          } else {
            console.log('No active timer found in database, checking localStorage...');
            // No active timer, check localStorage for backup
            await loadFromLocalStorage();
          }
        } catch (error) {
          console.error('Error checking active timer:', error);
          // Fallback to localStorage
          console.log('Error fetching active timer, falling back to localStorage');
          await loadFromLocalStorage();
        } finally {
          setIsInitialized(true);
        }
      };
      
      checkActiveTimer();
    }
  }, [isReady, user, token]);

  const loadFromLocalStorage = async () => {
    if (!user || !user.uid) return;
    
    const savedTimer = localStorage.getItem(`timer_${user.uid}`);
    if (savedTimer) {
      try {
        console.log('Found timer data in localStorage, restoring...');
        const { 
          taskId, taskName, projectId, projectName, projectColor,
          startTimeStr, description: savedDescription, timeEntryId 
        } = JSON.parse(savedTimer);
        
        // Parse the start time with proper timezone handling
        console.log('Start time from localStorage (should be UTC):', startTimeStr);
        const parsedStartTime = parseISOWithTimezone(startTimeStr);
        console.log('Parsed start time (converted to local):', parsedStartTime.toString());
        console.log('Current time (local):', new Date().toString());
        console.log('Timezone offset (minutes):', new Date().getTimezoneOffset());
        console.log('Browser timezone:', getLocalTimezoneName());
        
        // Only restore if it's a valid date
        if (!isNaN(parsedStartTime.getTime())) {
          console.log('Setting timer from localStorage with time entry ID:', timeEntryId);
          
          setCurrentTask({ id: taskId, name: taskName, project_id: projectId });
          setCurrentProject({ id: projectId, name: projectName, color: projectColor });
          setStartTime(parsedStartTime);
          setDescription(savedDescription || '');
          setIsRunning(true);
          
          // Immediately calculate elapsed time based on the loaded start time
          const now = new Date();
          const calculatedElapsedTime = Math.max(0, Math.floor((now.getTime() - parsedStartTime.getTime()) / 1000));
          setElapsedTime(calculatedElapsedTime);
          
          if (timeEntryId) {
            setActiveTimeEntryId(timeEntryId);
            
            // Verify that this timer entry still exists and is active
            await verifyActiveTimeEntry(timeEntryId);
          } else {
            // No time entry ID found, we need to create a new one
            console.log('No time entry ID in localStorage, creating a new entry');
            await restartTimerWithNewEntry();
          }
        } else {
          console.warn('Invalid start time in localStorage, cannot restore timer');
          localStorage.removeItem(`timer_${user.uid}`);
        }
      } catch (error) {
        console.error('Error parsing saved timer', error);
        localStorage.removeItem(`timer_${user.uid}`);
      }
    } else {
      console.log('No timer data found in localStorage');
    }
  };
  
  // Verify that a time entry is still active in the database
  const verifyActiveTimeEntry = async (entryId: number) => {
    try {
      const response = await axios.get(`/api/time-entries/${entryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data && !response.data.end_time) {
        console.log('Verified time entry is still active:', response.data);
        // Entry is still active, everything is good
      } else if (response.data && response.data.end_time) {
        console.log('Time entry exists but was already ended:', response.data);
        // Entry exists but was already ended, we should start a new one
        restartTimerWithNewEntry();
      }
    } catch (error) {
      console.error('Error verifying time entry, will create a new one:', error);
      // Entry may not exist anymore, create a new one
      restartTimerWithNewEntry();
    }
  };
  
  // Create a new time entry with the current timer state
  const restartTimerWithNewEntry = async () => {
    if (!currentTask || !currentProject || !startTime || !token) {
      console.error('Cannot restart timer: missing task, project, start time, or token');
      return;
    }
    
    try {
      console.log('Creating new time entry to continue timing');
      const timeEntryPayload = {
        task_id: currentTask.id,
        start_time: toUTCString(startTime),
        description: description || ''
      };
      
      const response = await axios.post('/api/time-entries', timeEntryPayload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('New time entry created:', response.data);
      
      setActiveTimeEntryId(response.data.id);
      
      // Calculate and set elapsed time
      if (startTime) {
        const now = new Date();
        const calculatedElapsedTime = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
        setElapsedTime(calculatedElapsedTime);
      }
      
      // Update localStorage with new time entry ID
      if (user && user.uid) {
        localStorage.setItem(`timer_${user.uid}`, JSON.stringify({
          taskId: currentTask.id,
          taskName: currentTask.name,
          projectId: currentProject.id,
          projectName: currentProject.name,
          projectColor: currentProject.color,
          startTimeStr: toUTCString(startTime),
          description,
          timeEntryId: response.data.id
        }));
      }
    } catch (error) {
      console.error('Failed to create new time entry:', error);
    }
  };

  // Set up timer interval when running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && startTime) {
      // Create new interval to update elapsed time every second
      interval = setInterval(() => {
        const now = new Date();
        // Calculate elapsed time directly
        const seconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
        setElapsedTime(seconds);
      }, 1000);
      
      // Initial calculation
      const now = new Date();
      const seconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
      setElapsedTime(seconds);
    }
    
    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, startTime]); // Only depend on isRunning and startTime

  // Save timer to localStorage when it changes
  useEffect(() => {
    if (user && isRunning && currentTask && currentProject && startTime) {
      const timerData = {
        taskId: currentTask.id,
        taskName: currentTask.name,
        projectId: currentProject.id,
        projectName: currentProject.name,
        projectColor: currentProject.color,
        startTimeStr: toUTCString(startTime),
        description,
        timeEntryId: activeTimeEntryId
      };
      
      const currentData = localStorage.getItem(`timer_${user.uid}`);
      // Only update if data has changed
      if (currentData !== JSON.stringify(timerData)) {
        localStorage.setItem(`timer_${user.uid}`, JSON.stringify(timerData));
      }
    } else if (user && !isRunning) {
      localStorage.removeItem(`timer_${user.uid}`);
    }
  }, [user, isRunning, currentTask, currentProject, startTime, description, activeTimeEntryId]);

  // Update description in backend when it changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isRunning && activeTimeEntryId) {
      timeoutId = setTimeout(async () => {
        try {
          await axios.put(`/api/time-entries/${activeTimeEntryId}`, {
            description
          });
        } catch (error) {
          console.error('Error updating time entry description:', error);
        }
      }, 1000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [description, isRunning, activeTimeEntryId]);

  // Start the timer
  const startTimer = async (taskId: number, projectId: number, taskDescription?: string) => {
    console.log('---- START TIMER DEBUGGING ----');
    console.log('Starting timer for task:', taskId, 'project:', projectId);
    
    try {
      // First, stop any running timer
      if (isRunning) {
        console.log('Timer already running, stopping first...');
        await stopTimer();
      }
      
      if (!token) {
        console.error('Cannot start timer: missing authentication token');
        throw new Error('Authentication token is missing');
      }
      
      console.log('Fetching task and project details...');
      // Get task and project details
      let taskResponse, projectResponse;
      try {
        [taskResponse, projectResponse] = await Promise.all([
          axios.get(`/api/tasks/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          axios.get(`/api/projects/${projectId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
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
        start_time: toUTCString(now),
        description: taskDescription || ''
      };
      
      console.log('Time entry payload:', JSON.stringify(newTimeEntry));
      
      // Make the API request with error handling
      let timeEntryResponse;
      try {
        console.log('Sending POST request to /api/time-entries');
        timeEntryResponse = await axios.post('/api/time-entries', newTimeEntry, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Time entry created successfully:', timeEntryResponse.data);
        
        // Save the time entry ID
        setActiveTimeEntryId(timeEntryResponse.data.id);
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
      setIsRunning(true); // Ensure timer is marked as running
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
      console.log('No active timer to stop');
      return;
    }
    
    if (!token) {
      console.error('Cannot stop timer: missing authentication token');
      throw new Error('Authentication token is missing');
    }
    
    console.log('---- STOP TIMER DEBUGGING ----');
    console.log('Stopping timer for task:', currentTask.id);
    
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      console.log('End time:', endTime, 'Duration:', duration);
      
      // If we have an active time entry ID, use it
      if (activeTimeEntryId) {
        console.log('Updating time entry with ID:', activeTimeEntryId);
        
        // Update the time entry with end time and duration
        const updatePayload = {
          end_time: toUTCString(endTime),
          duration,
          description
        };
        console.log('Updating time entry with:', JSON.stringify(updatePayload));
        
        try {
          await axios.put(`/api/time-entries/${activeTimeEntryId}`, updatePayload, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
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
      } else {
        // Find the active time entry
        console.log('No active time entry ID, finding active time entry...');
        try {
          const response = await axios.get('/api/time-entries', {
            params: {
              task_id: currentTask.id,
              is_active: true
            },
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('Active entries response:', response.data);
          
          if (response.data && response.data.length > 0) {
            const activeEntry = response.data[0];
            console.log('Found active entry:', activeEntry);
            
            // Update the time entry with end time and duration
            const updatePayload = {
              end_time: toUTCString(endTime),
              duration,
              description
            };
            console.log('Updating time entry with:', JSON.stringify(updatePayload));
            
            try {
              await axios.put(`/api/time-entries/${activeEntry.id}`, updatePayload, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              console.log('Time entry updated successfully');
            } catch (error) {
              console.error('Error updating time entry:', error);
              throw new Error('Failed to update time entry');
            }
          } else {
            console.warn('No active time entry found to stop');
          }
        } catch (error) {
          console.error('Error finding active time entry:', error);
          throw new Error('Failed to find active time entry');
        }
      }
      
      // Reset state - Only do this when explicitly stopping the timer
      setIsRunning(false);
      setCurrentTask(null);
      setCurrentProject(null);
      setStartTime(null);
      setElapsedTime(0);
      setDescription('');
      setActiveTimeEntryId(null);
      console.log('Timer state reset');
      
      // Clean up localStorage
      if (user) {
        console.log('Removing timer data from localStorage');
        localStorage.removeItem(`timer_${user.uid}`);
      }
      
      console.log('---- END STOP TIMER DEBUGGING ----');
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
    
    // If we have an active time entry ID, delete it
    if (activeTimeEntryId && token) {
      axios.delete(`/api/time-entries/${activeTimeEntryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .catch(error => console.error('Error deleting time entry:', error));
    }
    
    // Reset state
    setIsRunning(false);
    setCurrentTask(null);
    setCurrentProject(null);
    setStartTime(null);
    setElapsedTime(0);
    setDescription('');
    setActiveTimeEntryId(null);
    
    // Clean up localStorage
    if (user) {
      localStorage.removeItem(`timer_${user.uid}`);
    }
  };

  // Update description
  const updateDescription = (newDescription: string) => {
    if (newDescription !== description) {  // Only update if changed
      setDescription(newDescription);
    }
  };

  // Adjust the start time of the current timer
  const adjustStartTime = async (newStartTime: Date) => {
    if (!isRunning || !currentTask) {
      throw new Error('No active timer to adjust');
    }
    
    if (!token) {
      console.error('Cannot adjust start time: missing authentication token');
      throw new Error('Authentication token is missing');
    }
    
    try {
      console.log('=== ADJUST START TIME DEBUG ===');
      console.log('New start time (local):', newStartTime.toString());
      console.log('New start time as ISO/UTC string:', toUTCString(newStartTime));
      console.log('Current time (local):', new Date().toString());
      console.log('Timezone offset (minutes):', new Date().getTimezoneOffset());
      console.log('Browser timezone:', getLocalTimezoneName());
      
      // Find the active time entry
      let entryId = activeTimeEntryId;
      
      if (!entryId) {
        // Try to get it from the API
        const response = await axios.get('/api/time-entries/active', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.data) {
          entryId = response.data.id;
          setActiveTimeEntryId(entryId);
        }
      }
      
      if (!entryId) {
        throw new Error('No active time entry found');
      }
      
      // Update the time entry with the new start time
      // Convert local time to UTC ISO string for the server
      const utcStartTimeStr = toUTCString(newStartTime);
      console.log('Sending to server (UTC ISO):', utcStartTimeStr);
      
      await axios.put(`/api/time-entries/${entryId}`, {
        start_time: utcStartTimeStr
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update the local state
      setStartTime(newStartTime);
      
      // Immediately recalculate the elapsed time based on the new start time
      const now = new Date();
      const newElapsedTime = Math.floor((now.getTime() - newStartTime.getTime()) / 1000);
      setElapsedTime(newElapsedTime);
      
      // Update localStorage
      if (user && currentProject) {
        localStorage.setItem(`timer_${user.uid}`, JSON.stringify({
          taskId: currentTask.id,
          taskName: currentTask.name,
          projectId: currentProject.id,
          projectName: currentProject.name,
          projectColor: currentProject.color,
          startTimeStr: utcStartTimeStr,
          description,
          timeEntryId: entryId
        }));
      }
    } catch (error) {
      console.error('Error adjusting start time:', error);
      throw error;
    }
  };

  // Delete a time entry
  const deleteTimeEntry = async (entryId: number): Promise<boolean> => {
    try {
      // Check if the entry being deleted is the current active timer
      if (isRunning && entryId === activeTimeEntryId) {
        // If so, need to clear the timer state
        clearCurrentTimer();
        return true;
      }
      
      // Otherwise, just return success
      return true;
    } catch (error) {
      console.error('Error in deleteTimeEntry:', error);
      return false;
    }
  };
  
  // Helper to clear the current timer state
  const clearCurrentTimer = () => {
    setIsRunning(false);
    setCurrentTask(null);
    setCurrentProject(null);
    setStartTime(null);
    setElapsedTime(0);
    setDescription('');
    setActiveTimeEntryId(null);
    
    // Clear from localStorage
    if (user && user.uid) {
      localStorage.removeItem(`timer_${user.uid}`);
    }
    
    // Clear interval if running
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
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
    setDescription: updateDescription,
    adjustStartTime,
    deleteTimeEntry
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