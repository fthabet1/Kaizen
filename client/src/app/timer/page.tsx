/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useTimer } from '../../contexts/TimerContext';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from '../../utils/axiosConfig';
import { format, subMinutes, subHours } from 'date-fns';

// PrimeReact imports
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';

interface Project {
  id: number;
  name: string;
  color: string;
  description?: string;
}

interface Task {
  id: number;
  name: string;
  project_id: number;
  description?: string;
  is_completed: boolean;
}

export default function TimerPage() {
  const { user, loading, isReady } = useAuth();
  const { 
    isRunning, 
    currentTask, 
    currentProject, 
    startTime, 
    elapsedTime, 
    description: currentDescription,
    startTimer, 
    stopTimer,
    discardTimer,
    setDescription: updateTimerDescription,
    adjustStartTime,
  } = useTimer();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useRef<Toast>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [description, setDescription] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  
  // Timer adjustment state
  const [showAdjustStartDialog, setShowAdjustStartDialog] = useState(false);
  const [adjustedStartTime, setAdjustedStartTime] = useState<Date | null>(null);
  const [hoursToSubtract, setHoursToSubtract] = useState<number>(0);
  const [minutesToSubtract, setMinutesToSubtract] = useState<number>(0);
  
  // Project filtering for task dropdown
  const [projectFilter, setProjectFilter] = useState<number | null>(null);

  // Past time entry state
  const [showPastEntryDialog, setShowPastEntryDialog] = useState(false);
  const [pastEntryDate, setPastEntryDate] = useState<Date | null>(null);
  const [pastEntryStartTime, setPastEntryStartTime] = useState<Date | null>(null);
  const [pastEntryEndTime, setPastEntryEndTime] = useState<Date | null>(null);
  const [pastEntryTask, setPastEntryTask] = useState<Task | null>(null);
  const [pastEntryProject, setPastEntryProject] = useState<Project | null>(null);
  const [pastEntryDescription, setPastEntryDescription] = useState<string>('');
  const [pastEntryDuration, setPastEntryDuration] = useState<number>(0);
  const [creatingPastEntry, setCreatingPastEntry] = useState<boolean>(false);

  // Format time from seconds to readable format (HH:MM:SS)
  const formatTimerDisplay = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Redirect if not logged in
  useEffect(() => {
    if (isReady && !user) {
      router.push('/auth/login');
    }
  }, [user, isReady, router]);

  // Handle query params for initial selection
  useEffect(() => {
    if (searchParams) {
      const projectId = searchParams.get('projectId');
      const taskId = searchParams.get('taskId');
      
      if (projectId) {
        setProjectFilter(parseInt(projectId));
      }
      
      // We'll handle taskId after data is loaded
    }
  }, [searchParams]);

  // Fetch projects and tasks
  useEffect(() => {
    if (user && isReady) {
      fetchProjectsAndTasks();
    }
  }, [user, isReady]);

  // Handle task selection from URL params after data is loaded
  useEffect(() => {
    if (!loadingData && tasks.length > 0) {
      const taskId = searchParams.get('taskId');
      if (taskId) {
        const taskIdNum = parseInt(taskId);
        const task = tasks.find(t => t.id === taskIdNum);
        if (task) {
          setSelectedTask(task);
          
          // Also set the project
          const project = projects.find(p => p.id === task.project_id);
          if (project) {
            setSelectedProject(project);
            setProjectFilter(project.id);
          }
        }
      }
    }
  }, [loadingData, tasks, projects, searchParams]);

  // Initialize description only when timer starts or when component mounts
  useEffect(() => {
    if (isRunning && currentDescription && !description) {
      setDescription(currentDescription);
    } else if (!isRunning) {
      setDescription('');
    }
  }, [isRunning]);  // Only depend on isRunning, not currentDescription

  // Set up timer adjustment when timer is running
  useEffect(() => {
    if (isRunning && startTime) {
      setAdjustedStartTime(startTime);
    }
  }, [isRunning, startTime]);

  // Update task options when project filter changes
  useEffect(() => {
    if (projectFilter && selectedTask && selectedTask.project_id !== projectFilter) {
      // Clear task selection if it doesn't belong to the selected project
      setSelectedTask(null);
    }
  }, [projectFilter, selectedTask]);

  // Calculate duration when start or end time changes
  useEffect(() => {
    if (pastEntryStartTime && pastEntryEndTime) {
      // Create temporary full date-time objects for comparison
      const tempStartDateTime = new Date();
      tempStartDateTime.setHours(
        pastEntryStartTime.getHours(),
        pastEntryStartTime.getMinutes(),
        pastEntryStartTime.getSeconds(),
        0
      );
      
      const tempEndDateTime = new Date();
      tempEndDateTime.setHours(
        pastEntryEndTime.getHours(),
        pastEntryEndTime.getMinutes(),
        pastEntryEndTime.getSeconds(),
        0
      );
      
      // Check if this likely crosses midnight (end time earlier than start time)
      const isCrossingMidnight = pastEntryEndTime.getHours() < pastEntryStartTime.getHours();
      
      // If crossing midnight, add a day to the end time for duration calculation
      if (isCrossingMidnight) {
        tempEndDateTime.setDate(tempEndDateTime.getDate() + 1);
      }
      
      // Calculate duration in seconds
      const durationSeconds = Math.floor((tempEndDateTime.getTime() - tempStartDateTime.getTime()) / 1000);
      
      if (durationSeconds > 0) {
        setPastEntryDuration(durationSeconds);
      } else {
        // If duration is negative or zero, reset it
        setPastEntryDuration(0);
      }
    } else {
      // If either start or end time is missing, reset duration
      setPastEntryDuration(0);
    }
  }, [pastEntryStartTime, pastEntryEndTime]);

  const fetchProjectsAndTasks = async () => {
    try {
      setLoadingData(true);
      
      // Fetch active projects
      const projectsResponse = await axios.get('/api/projects?is_active=true');
      setProjects(projectsResponse.data);
      
      // Fetch all incomplete tasks
      const tasksResponse = await axios.get('/api/tasks?is_completed=false');
      setTasks(tasksResponse.data);
      
      // If we have a project filter and no selected project yet, set it
      if (projectFilter && !selectedProject) {
        const project = projectsResponse.data.find((p: Project) => p.id === projectFilter);
        if (project) {
          setSelectedProject(project);
        }
      }
    } catch (error) {
      console.error('Error fetching data', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load projects and tasks',
        life: 3000
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleStartTimer = async () => {
    if (!selectedTask) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Select a Task',
        detail: 'Please select a task before starting the timer',
        life: 3000
      });
      return;
    }
    
    if (isRunning) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Timer Already Running',
        detail: 'You must stop the current timer before starting a new one',
        life: 3000
      });
      return;
    }
    
    try {
      await startTimer(selectedTask.id, selectedTask.project_id, description);
      setDescription('');
      toast.current?.show({
        severity: 'success',
        summary: 'Timer Started',
        detail: `Now tracking time for "${selectedTask.name}"`,
        life: 3000
      });
    } catch (error) {
      console.error('Error starting timer', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to start the timer. Please try again.',
        life: 3000
      });
    }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer();
      toast.current?.show({
        severity: 'info',
        summary: 'Timer Stopped',
        detail: 'Your time has been recorded',
        life: 3000
      });
    } catch (error) {
      console.error('Error stopping timer', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to stop the timer. Please try again.',
        life: 3000
      });
    }
  };

  const handleDiscardTimer = async () => {
    if (confirm('Are you sure you want to discard this timer? This action cannot be undone.')) {
      try {
        discardTimer();
        toast.current?.show({
          severity: 'info',
          summary: 'Timer Discarded',
          detail: 'Your timer has been discarded',
          life: 3000
        });
      } catch (error) {
        console.error('Error discarding timer', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to discard the timer',
          life: 3000
        });
      }
    }
  };

  const handleCreateTask = async () => {
    if (!projectFilter || !newTaskName.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Missing Information',
        detail: 'Please select a project and enter a task name',
        life: 3000
      });
      return;
    }
    
    if (isRunning) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Timer Already Running',
        detail: 'You must stop the current timer before creating a new task',
        life: 3000
      });
      return;
    }
    
    try {
      const response = await axios.post('/api/tasks', {
        project_id: projectFilter,
        name: newTaskName.trim(),
        description: newTaskDescription.trim() || undefined
      });
      
      setTasks([...tasks, response.data]);
      setNewTaskName('');
      setNewTaskDescription('');
      setShowCreateTask(false);
      setSelectedTask(response.data);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Task Created',
        detail: 'New task has been created successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Error creating task', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create the task. Please try again.',
        life: 3000
      });
    }
  };

  const openAdjustStartTimeDialog = () => {
    if (startTime) {
      setAdjustedStartTime(new Date(startTime));
      setHoursToSubtract(0);
      setMinutesToSubtract(0);
      setShowAdjustStartDialog(true);
    }
  };

  const handleAdjustByAmount = () => {
    if (!adjustedStartTime) return;
    
    let newTime = new Date(adjustedStartTime);
    if (hoursToSubtract > 0) {
      newTime = subHours(newTime, hoursToSubtract);
    }
    if (minutesToSubtract > 0) {
      newTime = subMinutes(newTime, minutesToSubtract);
    }
    
    // Ensure the adjusted time is not in the future
    const now = new Date();
    if (newTime > now) {
      toast.current?.show({
        severity: 'error',
        summary: 'Invalid Time',
        detail: 'Start time cannot be in the future',
        life: 3000
      });
      return;
    }
    
    setAdjustedStartTime(newTime);
  };

  const handleSaveAdjustedStartTime = async () => {
    if (!adjustedStartTime || !currentTask) return;
    
    // Ensure the adjusted time is not in the future
    const now = new Date();
    if (adjustedStartTime > now) {
      toast.current?.show({
        severity: 'error',
        summary: 'Invalid Time',
        detail: 'Start time cannot be in the future',
        life: 3000
      });
      return;
    }
    
    try {
      // Use the TimerContext's adjustStartTime method
      await adjustStartTime(adjustedStartTime);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Start Time Adjusted',
        detail: 'Timer start time has been updated',
        life: 3000
      });
      
      setShowAdjustStartDialog(false);
    } catch (error) {
      console.error('Error adjusting start time', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to adjust the start time. Please try again.',
        life: 3000
      });
    }
  };

  const adjustTimeDialogFooter = (
    <>
      <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setShowAdjustStartDialog(false)} />
      <Button label="Save" icon="pi pi-check" onClick={handleSaveAdjustedStartTime} />
    </>
  );

  const handleUpdateTimerDescription = (newDescription: string) => {
    setDescription(newDescription);  // Update local state
    updateTimerDescription(newDescription);  // Update timer context
  };

  // Initialize past entry form
  const openPastEntryDialog = () => {
    // Initialize with empty values
    setPastEntryDate(null);
    setPastEntryStartTime(null);
    setPastEntryEndTime(null);
    setPastEntryTask(null);
    setPastEntryProject(null);
    setPastEntryDescription('');
    setPastEntryDuration(0);
    
    setShowPastEntryDialog(true);
  };

  // Combine date and time for database
  const combineDateAndTime = (date: Date, time: Date, isEndTime: boolean = false): Date => {
    const result = new Date(date);
    
    // Set the hours, minutes, seconds from the time
    result.setHours(
      time.getHours(),
      time.getMinutes(),
      time.getSeconds(),
      time.getMilliseconds()
    );
    
    // Check if this is an end time and if it's earlier than the start time
    // which would indicate it's on the next day
    if (isEndTime && pastEntryStartTime && time.getHours() < pastEntryStartTime.getHours()) {
      // Add one day to the date for the end time
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  };

  // Create a past time entry
  const createPastTimeEntry = async () => {
    // Check for required fields
    if (!pastEntryDate) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Missing Date',
        detail: 'Please select a date for this time entry',
        life: 3000
      });
      return;
    }
    
    if (!pastEntryStartTime || !pastEntryEndTime) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Missing Time',
        detail: 'Please select both start and end times',
        life: 3000
      });
      return;
    }
    
    if (!pastEntryTask) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Missing Task',
        detail: 'Please select a task for this time entry',
        life: 3000
      });
      return;
    }
    
    // Generate the full date-time objects
    const now = new Date();
    const startDateTime = combineDateAndTime(pastEntryDate, pastEntryStartTime);
    const endDateTime = combineDateAndTime(pastEntryDate, pastEntryEndTime, true);
    
    // Calculate the actual duration (this will work even across midnight)
    const actualDurationSeconds = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000);
    
    if (actualDurationSeconds <= 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Invalid Duration',
        detail: 'End time must be after start time',
        life: 3000
      });
      return;
    }
    
    // Check if dates are in the future
    if (startDateTime > now || endDateTime > now) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Future Dates Not Allowed',
        detail: 'Time entries cannot be in the future',
        life: 3000
      });
      return;
    }
    
    try {
      setCreatingPastEntry(true);
      
      // Prepare the time entry data
      const timeEntryData = {
        task_id: pastEntryTask.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration: actualDurationSeconds,
        description: pastEntryDescription || ''
      };
      
      console.log('Creating time entry:', {
        startDate: startDateTime.toLocaleDateString(),
        startTime: startDateTime.toLocaleTimeString(),
        endDate: endDateTime.toLocaleDateString(),
        endTime: endDateTime.toLocaleTimeString(),
        duration: `${Math.floor(actualDurationSeconds / 3600)}h ${Math.floor((actualDurationSeconds % 3600) / 60)}m`
      });
      
      // Send to the API
      await axios.post('/api/time-entries', timeEntryData);
      
      // Show success message
      toast.current?.show({
        severity: 'success',
        summary: 'Entry Created',
        detail: 'Past time entry was successfully created',
        life: 3000
      });
      
      // Close dialog and refresh
      setShowPastEntryDialog(false);
      
      // Refresh data
      fetchProjectsAndTasks();
      
      // Dispatch custom event to update dashboard charts
      window.dispatchEvent(new CustomEvent('timeEntryCreated'));
    } catch (error) {
      console.error('Error creating past time entry:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create time entry. Please try again.',
        life: 3000
      });
    } finally {
      setCreatingPastEntry(false);
    }
  };

  // Format time for display
  const formatTimeForDisplay = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format duration for display
  const formatDurationForDisplay = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Dialog footer for past entry
  const pastEntryDialogFooter = (
    <>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        onClick={() => setShowPastEntryDialog(false)} 
        className="p-button-text" 
        disabled={creatingPastEntry}
      />
      <Button 
        label="Create" 
        icon="pi pi-check" 
        onClick={createPastTimeEntry} 
        disabled={!pastEntryDate || !pastEntryStartTime || !pastEntryEndTime || !pastEntryTask || pastEntryDuration <= 0 || creatingPastEntry}
        loading={creatingPastEntry}
      />
    </>
  );

  // Check if times cross midnight for display notice
  const isCrossingMidnight = pastEntryStartTime && pastEntryEndTime && 
    pastEntryEndTime.getHours() < pastEntryStartTime.getHours();

  // Loading state
  if (loading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProgressSpinner />
      </div>
    );
  }

  // Render focused timer view when a timer is running
  if (isRunning && currentTask && currentProject) {
    return (
      <>
        <Toast ref={toast} position="top-right" />
        <div className="p-4">
          <div className="flex justify-content-center">
            <Card className="w-full md:w-8 lg:w-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mb-2">Timer Running</h1>
                <p className="text-color-secondary mb-4">Your time is being tracked</p>
                
                <div className="timer-display bg-gray-100 dark:bg-gray-800 p-5 border-round mb-4">
                  <div className="text-5xl font-bold mb-3 text-primary">{formatTimerDisplay(elapsedTime)}</div>
                  <div className="text-lg">
                    Started at: {startTime ? format(new Date(startTime), 'h:mm a, MMMM d, yyyy') : ''}
                  </div>
                </div>
                
                <div className="task-info border-1 border-primary p-4 border-round mb-4">
                  <div className="flex align-items-center justify-content-center mb-2">
                    <div 
                      className="border-circle mr-2 flex-shrink-0"
                      style={{ backgroundColor: currentProject.color, width: '1rem', height: '1rem' }}
                    />
                    <span className="font-medium text-lg">{currentProject.name}</span>
                  </div>
                  <div className="text-xl font-bold">{currentTask.name}</div>
                </div>

                <div className="mb-4">
                  <InputTextarea 
                    value={currentDescription} 
                    onChange={(e) => handleUpdateTimerDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid">
                <div className="col-12 md:col-4 p-2">
                  <Button
                    label="Stop Timer"
                    icon="pi pi-stop-circle"
                    className="p-button-danger w-full p-3"
                    onClick={handleStopTimer}
                  />
                </div>
                <div className="col-12 md:col-4 p-2">
                  <Button
                    label="Adjust Start Time"
                    icon="pi pi-clock"
                    className="p-button-outlined w-full p-3"
                    onClick={openAdjustStartTimeDialog}
                  />
                </div>
                <div className="col-12 md:col-4 p-2">
                  <Button
                    label="Discard Timer"
                    icon="pi pi-trash"
                    className="p-button-outlined p-button-secondary w-full p-3"
                    onClick={handleDiscardTimer}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        <Dialog
          visible={showAdjustStartDialog}
          header="Adjust Start Time"
          modal
          className="p-fluid"
          footer={adjustTimeDialogFooter}
          onHide={() => setShowAdjustStartDialog(false)}
          style={{ width: '450px' }}
        >
          <div className="mb-4">
            <p className="text-color-secondary mb-3">
              Adjust when this timer was started. This will change the total duration.
            </p>
            
            <div className="field mb-4">
              <label htmlFor="currentStartTime" className="font-medium mb-2 block">Current Start Time</label>
              <div className="p-inputtext p-disabled" id="currentStartTime">
                {startTime ? format(new Date(startTime), 'h:mm a, MMMM d, yyyy') : ''}
              </div>
            </div>
            
            <div className="field mb-4">
              <label htmlFor="adjustedDateTime" className="font-medium mb-2 block">Exact Start Time</label>
              <Calendar
                id="adjustedDateTime"
                value={adjustedStartTime}
                onChange={(e) => {
                  if (e.value && Array.isArray(e.value)) {
                    setAdjustedStartTime(e.value[0]);
                  } else {
                    setAdjustedStartTime(e.value as Date);
                  }
                }}
                showTime
                showSeconds
                maxDate={new Date()}
                hideOnDateTimeSelect
                className="w-full"
              />
              <small className="text-color-secondary">Cannot be in the future</small>
            </div>
            
            <div className="field">
              <label className="font-medium mb-2 block">Or subtract time</label>
              <div className="grid">
                <div className="col-5">
                  <span className="p-float-label">
                    <InputNumber
                      id="hoursToSubtract"
                      value={hoursToSubtract}
                      onValueChange={(e) => setHoursToSubtract(e.value ?? 0)}
                      min={0}
                      max={23}
                    />
                    <label htmlFor="hoursToSubtract">Hours</label>
                  </span>
                </div>
                <div className="col-5">
                  <span className="p-float-label">
                    <InputNumber
                      id="minutesToSubtract"
                      value={minutesToSubtract}
                      onValueChange={(e) => setMinutesToSubtract(e.value ?? 0)}
                      min={0}
                      max={59}
                    />
                    <label htmlFor="minutesToSubtract">Minutes</label>
                  </span>
                </div>
                <div className="col-2">
                  <Button
                    icon="pi pi-check"
                    className="p-button-text h-full w-full"
                    onClick={handleAdjustByAmount}
                    disabled={hoursToSubtract === 0 && minutesToSubtract === 0}
                  />
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      </>
    );
  }

  // Regular view for when no timer is running (simplified with just Quick Start UI)
  return (
    <>
      <Toast ref={toast} position="top-right" />
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Time Tracker</h1>
        
        {isRunning && currentTask && currentProject ? (
          // If there's an active timer, show the running timer UI instead of the start timer UI
          <Card className="w-full mb-4">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-2">Timer Running</h1>
              <p className="text-color-secondary mb-4">Your time is being tracked</p>
                
              <div className="timer-display bg-gray-100 dark:bg-gray-800 p-5 border-round mb-4">
                <div className="text-5xl font-bold mb-3 text-primary">{formatTimerDisplay(elapsedTime)}</div>
                <div className="text-lg">
                  Started at: {startTime ? format(new Date(startTime), 'h:mm a, MMMM d, yyyy') : ''}
                </div>
              </div>
                
              <div className="task-info border-1 border-primary p-4 border-round mb-4">
                <div className="flex align-items-center justify-content-center mb-2">
                  <div 
                    className="border-circle mr-2 flex-shrink-0"
                    style={{ backgroundColor: currentProject.color, width: '1rem', height: '1rem' }}
                  />
                  <span className="font-medium text-lg">{currentProject.name}</span>
                </div>
                <div className="text-xl font-bold">{currentTask.name}</div>
              </div>

              <div className="mb-4">
                <InputTextarea 
                  value={currentDescription} 
                  onChange={(e) => handleUpdateTimerDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
              
            <div className="grid">
              <div className="col-12 md:col-4 p-2">
                <Button
                  label="Stop Timer"
                  icon="pi pi-stop-circle"
                  className="p-button-danger w-full p-3"
                  onClick={handleStopTimer}
                />
              </div>
              <div className="col-12 md:col-4 p-2">
                <Button
                  label="Adjust Start Time"
                  icon="pi pi-clock"
                  className="p-button-outlined w-full p-3"
                  onClick={openAdjustStartTimeDialog}
                />
              </div>
              <div className="col-12 md:col-4 p-2">
                <Button
                  label="Discard Timer"
                  icon="pi pi-trash"
                  className="p-button-outlined p-button-secondary w-full p-3"
                  onClick={handleDiscardTimer}
                />
              </div>
            </div>
          </Card>
        ) : (
          // No active timer, show the start timer UI
          <Card className="mb-4">
            <div className="grid">
              <div className="col-12 mb-4">
                <h2 className="text-xl font-semibold">Start a Timer</h2>
                <p className="text-color-secondary mt-1">Select a project and task to track your time</p>
              </div>
              
              <div className="col-12 md:col-6 lg:col-4 mb-3">
                <label className="block font-medium mb-2">Project</label>
                <Dropdown
                  value={projectFilter}
                  options={[
                    ...projects.map(p => ({ label: p.name, value: p.id }))
                  ]}
                  onChange={(e) => {
                    setProjectFilter(e.value);
                    // Clear task if project filter changes
                    setSelectedTask(null);
                    // Set selected project if it's a valid project
                    if (e.value) {
                      const project = projects.find(p => p.id === e.value);
                      if (project) {
                        setSelectedProject(project);
                      }
                    } else {
                      setSelectedProject(null);
                    }
                  }}
                  placeholder="Select Project"
                  className="w-full"
                  filter
                  emptyFilterMessage="No projects found"
                  emptyMessage={
                    <div className="p-2 text-center">
                      <div>No projects available</div>
                      <Button 
                        label="Create Project" 
                        className="p-button-text p-button-sm mt-2"
                        onClick={() => router.push('/projects')}
                      />
                    </div>
                  }
                />
              </div>
              
              <div className="col-12 md:col-6 lg:col-4 mb-3">
                <label className="block font-medium mb-2">Task</label>
                <Dropdown
                  value={selectedTask?.id}
                  options={[
                    ...tasks
                      .filter(t => !projectFilter || t.project_id === projectFilter)
                      .map(t => ({ label: t.name, value: t.id }))
                  ]}
                  onChange={(e) => {
                    const task = tasks.find(t => t.id === e.value);
                    if (task) {
                      setSelectedTask(task);
                      // Also set the project if task is selected
                      const project = projects.find(p => p.id === task.project_id);
                      if (project) {
                        setSelectedProject(project);
                        setProjectFilter(project.id);
                      }
                    }
                  }}
                  placeholder="Select Task"
                  className="w-full"
                  filter
                  disabled={!projectFilter}
                  emptyFilterMessage="No matching tasks found"
                  emptyMessage={
                    <div className="p-2 text-center">
                      <div>No tasks available</div>
                      <Button 
                        label="Create Task" 
                        className="p-button-text p-button-sm mt-2"
                        onClick={() => setShowCreateTask(true)}
                        disabled={!projectFilter}
                      />
                    </div>
                  }
                />
              </div>
              
              <div className="col-12 lg:col-4 mb-3">
                <label className="block font-medium mb-2">Description (optional)</label>
                <InputTextarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={1}
                  placeholder="What are you working on?"
                  className="w-full"
                  autoResize
                />
              </div>
              
              <div className="col-12 mt-2 flex justify-content-between">
                <Button
                  label="Start Timer"
                  icon="pi pi-play"
                  className="p-button-success"
                  disabled={!selectedTask}
                  onClick={handleStartTimer}
                />
                
                <Button
                  label="Add Past Entry"
                  icon="pi pi-calendar-plus"
                  className="p-button-outlined"
                  onClick={openPastEntryDialog}
                />
              </div>
            </div>
          </Card>
        )}
        
        {/* Create Task Dialog */}
        <Dialog 
          header="Create New Task" 
          visible={showCreateTask} 
          style={{ width: '450px' }} 
          modal
          onHide={() => setShowCreateTask(false)}
          footer={
            <>
              <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setShowCreateTask(false)} />
              <Button label="Create" icon="pi pi-check" onClick={handleCreateTask} disabled={!newTaskName.trim()} />
            </>
          }
        >
          <div className="p-fluid">
            <div className="field mb-4">
              <label htmlFor="project-select" className="font-medium mb-2 block">Project</label>
              <Dropdown
                id="project-select"
                value={projectFilter}
                options={projects.map(p => ({ label: p.name, value: p.id }))}
                onChange={(e) => setProjectFilter(e.value)}
                placeholder="Select Project"
                className="w-full"
                required
              />
            </div>
            
            <div className="field mb-4">
              <label htmlFor="task-name" className="font-medium mb-2 block">Task Name</label>
              <InputTextarea
                id="task-name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                rows={1}
                autoResize
                className="w-full"
                placeholder="What is this task about?"
                required
              />
            </div>
            
            <div className="field">
              <label htmlFor="task-description" className="font-medium mb-2 block">Description (optional)</label>
              <InputTextarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={3}
                autoResize
                className="w-full"
                placeholder="Add more details about this task"
              />
            </div>
          </div>
        </Dialog>
        
        {/* Past Time Entry Dialog */}
        <Dialog
          header="Add Past Time Entry"
          visible={showPastEntryDialog}
          style={{ width: '500px' }}
          modal
          onHide={() => setShowPastEntryDialog(false)}
          footer={pastEntryDialogFooter}
        >
          <div className="p-fluid">
            <div className="field mb-4">
              <label htmlFor="past-entry-date" className="font-medium mb-2 block">Date</label>
              <Calendar
                id="past-entry-date"
                value={pastEntryDate}
                onChange={(e) => setPastEntryDate(e.value as Date)}
                showIcon
                maxDate={new Date()}
                dateFormat="yy-mm-dd"
                className="w-full"
                placeholder="Select a date"
              />
              <small className="text-color-secondary">Select the date of this activity</small>
            </div>
            
            <div className="grid">
              <div className="col-6 field mb-4">
                <label htmlFor="past-entry-start" className="font-medium mb-2 block">Start Time</label>
                <Calendar
                  id="past-entry-start"
                  value={pastEntryStartTime}
                  onChange={(e) => setPastEntryStartTime(e.value as Date)}
                  timeOnly
                  hourFormat="12"
                  className="w-full"
                  placeholder="Select start time"
                />
              </div>
              
              <div className="col-6 field mb-4">
                <label htmlFor="past-entry-end" className="font-medium mb-2 block">End Time</label>
                <Calendar
                  id="past-entry-end"
                  value={pastEntryEndTime}
                  onChange={(e) => setPastEntryEndTime(e.value as Date)}
                  timeOnly
                  hourFormat="12"
                  className="w-full"
                  placeholder="Select end time"
                />
              </div>
            </div>
            
            <div className="field mb-4">
              <label className="font-medium mb-2 block">Duration</label>
              <div className="p-inputtext p-disabled">
                {formatDurationForDisplay(pastEntryDuration)}
              </div>
              <small className="text-color-secondary">Calculated automatically based on start and end times</small>
              
              {isCrossingMidnight && (
                <div className="mt-2 p-2 border-round bg-primary-50 text-primary-700 flex align-items-center">
                  <i className="pi pi-info-circle mr-2"></i>
                  <span>This entry crosses midnight. All time will be counted toward {pastEntryDate?.toLocaleDateString()}.</span>
                </div>
              )}
            </div>
            
            <div className="field mb-4">
              <label htmlFor="past-entry-project" className="font-medium mb-2 block">Project</label>
              <Dropdown
                id="past-entry-project"
                value={pastEntryProject?.id}
                options={projects.map(p => ({ label: p.name, value: p.id }))}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.value);
                  setPastEntryProject(project || null);
                  setPastEntryTask(null); // Reset task when project changes
                }}
                placeholder="Select Project"
                className="w-full"
                filter
              />
            </div>
            
            <div className="field mb-4">
              <label htmlFor="past-entry-task" className="font-medium mb-2 block">Task</label>
              <Dropdown
                id="past-entry-task"
                value={pastEntryTask?.id}
                options={tasks
                  .filter(t => !pastEntryProject?.id || t.project_id === pastEntryProject.id)
                  .map(t => ({ label: t.name, value: t.id }))
                }
                onChange={(e) => {
                  const task = tasks.find(t => t.id === e.value);
                  setPastEntryTask(task || null);
                  
                  // Also set project if task is selected
                  if (task && !pastEntryProject) {
                    const project = projects.find(p => p.id === task.project_id);
                    setPastEntryProject(project || null);
                  }
                }}
                placeholder="Select Task"
                className="w-full"
                filter
                disabled={!pastEntryProject}
              />
            </div>
            
            <div className="field">
              <label htmlFor="past-entry-description" className="font-medium mb-2 block">Description (Optional)</label>
              <InputTextarea
                id="past-entry-description"
                value={pastEntryDescription}
                onChange={(e) => setPastEntryDescription(e.target.value)}
                rows={3}
                placeholder="What did you work on?"
                className="w-full"
                autoResize
              />
            </div>
          </div>
        </Dialog>
        
        {/* Only show recent tasks when no timer is running */}
        {!isRunning && (
          <Card title="Recent Tasks">
            <div className="grid">
              {tasks.slice(0, 4).map(task => {
                const project = projects.find(p => p.id === task.project_id);
                return (
                  <div key={task.id} className="col-12 md:col-6 lg:col-3 p-2">
                    <div 
                      className="p-3 border-round cursor-pointer hover:surface-100 transition-colors transition-duration-150"
                      onClick={() => {
                        setSelectedTask(task);
                        setProjectFilter(task.project_id);
                        const project = projects.find(p => p.id === task.project_id);
                        if (project) {
                          setSelectedProject(project);
                        }
                      }}
                    >
                      <div className="flex align-items-center mb-2">
                        <div 
                          className="border-circle mr-2 flex-shrink-0"
                          style={{ 
                            backgroundColor: project?.color || '#ccc', 
                            width: '0.75rem', 
                            height: '0.75rem' 
                          }}
                        />
                        <span className="text-sm text-color-secondary">{project?.name}</span>
                      </div>
                      <div className="font-medium">{task.name}</div>
                      <div className="flex justify-content-end mt-2">
                        <Button
                          icon="pi pi-play"
                          className="p-button-rounded p-button-text p-button-sm p-button-success"
                          tooltip="Start timer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            setProjectFilter(task.project_id);
                            if (project) {
                              setSelectedProject(project);
                            }
                            handleStartTimer();
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {tasks.length === 0 && (
              <div className="text-center py-5 text-color-secondary">
                <i className="pi pi-check-square text-4xl mb-3" />
                <div>No tasks available. Create a task to get started.</div>
                <Button
                  label="Create Task"
                  icon="pi pi-plus"
                  className="p-button-text mt-3"
                  onClick={() => setShowCreateTask(true)}
                  disabled={!projectFilter}
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}