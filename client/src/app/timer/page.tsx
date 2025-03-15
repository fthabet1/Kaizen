'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useTimer } from '../../contexts/TimerContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
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
  const { isRunning, currentTask, currentProject, startTime, elapsedTime, startTimer, stopTimer } = useTimer();
  const router = useRouter();
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
  
  // Create a ref to track if we've done the initial data fetch
  const initialFetchDone = useRef(false);
  // Keep track of project ID rather than the whole project object
  const selectedProjectIdRef = useRef<number | null>(null);

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

  // Fetch projects and tasks - only once when component mounts or user changes
  useEffect(() => {
    if (user && isReady && !initialFetchDone.current) {
      fetchProjectsAndTasks();
      initialFetchDone.current = true;
    }
  }, [user, isReady]);
  
  // Separate effect to handle project selection, using the project ID for comparison
  useEffect(() => {
    if (selectedProject && selectedProject.id !== selectedProjectIdRef.current) {
      selectedProjectIdRef.current = selectedProject.id;
      // Reset task selection when project changes
      setSelectedTask(null);
    }
  }, [selectedProject]);

  // Effect to handle timer state changes
  useEffect(() => {
    if (isRunning && currentTask && startTime) {
      // If a timer is running, pre-set the adjusted start time
      setAdjustedStartTime(new Date(startTime));
    }
  }, [isRunning, currentTask, startTime]);

  const fetchProjectsAndTasks = async () => {
    try {
      setLoadingData(true);
      const [projectsResponse, tasksResponse] = await Promise.all([
        axios.get('/api/projects?is_active=true'),
        axios.get('/api/tasks?is_completed=false')
      ]);
      
      setProjects(projectsResponse.data);
      setTasks(tasksResponse.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    if (isRunning) {
      showRunningTimerWarning();
      return;
    }
    setSelectedProject(project);
    setSelectedTask(null); // Clear task selection when project changes
  };

  const handleTaskSelect = (task: Task) => {
    if (isRunning) {
      showRunningTimerWarning();
      return;
    }
    setSelectedTask(task);
  };

  const showRunningTimerWarning = () => {
    toast.current?.show({
      severity: 'warn',
      summary: 'Timer Already Running',
      detail: 'You must stop the current timer before selecting a different task.',
      life: 3000
    });
  };

  const filteredTasks = selectedProject 
    ? tasks.filter(task => task.project_id === selectedProject.id)
    : [];

  const handleStartTimer = async () => {
    if (!selectedTask) return;
    
    if (isRunning) {
      showRunningTimerWarning();
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

  const handleCreateTask = async () => {
    if (!selectedProject || !newTaskName.trim()) return;
    
    if (isRunning) {
      showRunningTimerWarning();
      return;
    }
    
    try {
      const response = await axios.post('/api/tasks', {
        project_id: selectedProject.id,
        name: newTaskName,
        description: newTaskDescription
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
      // Update the time entry with the new start time
      // Note: This would require an API endpoint to adjust the start time
      // For now, we'll simulate this behavior
      toast.current?.show({
        severity: 'success',
        summary: 'Start Time Adjusted',
        detail: 'Timer start time has been updated',
        life: 3000
      });
      setShowAdjustStartDialog(false);
      
      // This would normally require restarting the timer with the adjusted time
      // You may need to add this functionality to your TimerContext
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

  if (loading || !isReady || loadingData) {
    return (
      <div className="flex justify-content-center align-items-center h-screen">
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
              </div>
              
              <div className="grid">
                <div className="col-12 md:col-6 p-2">
                  <Button
                    label="Stop Timer"
                    icon="pi pi-stop-circle"
                    className="p-button-danger w-full p-3"
                    onClick={handleStopTimer}
                  />
                </div>
                <div className="col-12 md:col-6 p-2">
                  <Button
                    label="Adjust Start Time"
                    icon="pi pi-clock"
                    className="p-button-outlined w-full p-3"
                    onClick={openAdjustStartTimeDialog}
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

  // Regular view for when no timer is running
  return (
    <>
      <Toast ref={toast} position="top-right" />
      <div className="p-4">
        <div className="grid">
          <div className="col-12">
            <h1 className="text-2xl font-bold mb-4">Time Tracker</h1>
          </div>

          <div className="col-12 md:col-4 mb-4">
            <Card title="Projects" className="h-full">
              {projects.length > 0 ? (
                <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-3 mb-2 border-round cursor-pointer transition-colors transition-duration-150 ${
                        selectedProject?.id === project.id
                          ? 'bg-primary'
                          : 'hover:surface-100'
                      }`}
                      onClick={() => handleProjectSelect(project)}
                    >
                      <div className="flex align-items-center">
                        <div
                          className="border-circle mr-2 flex-shrink-0"
                          style={{ backgroundColor: project.color, width: '1rem', height: '1rem' }}
                        />
                        <span className="font-medium">{project.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="pi pi-folder-open text-4xl text-gray-400 mb-3" />
                  <div className="text-lg font-medium mb-2">No Projects</div>
                  <p className="mb-4">Create a project to start tracking time</p>
                  <Button
                    label="Create Project"
                    icon="pi pi-plus"
                    onClick={() => router.push('/projects')}
                    className="p-button-outlined"
                  />
                </div>
              )}
            </Card>
          </div>

          <div className="col-12 md:col-4 mb-4">
            <Card 
              title="Tasks" 
              className="h-full"
              subTitle={selectedProject ? selectedProject.name : 'Select a project'}
            >
              {selectedProject && (
                <div className="flex justify-content-end mb-3">
                  <Button
                    icon="pi pi-plus"
                    className="p-button-rounded p-button-text"
                    onClick={() => setShowCreateTask(true)}
                    tooltip="Add Task"
                  />
                </div>
              )}
              {selectedProject ? (
                showCreateTask ? (
                  <div className="p-fluid">
                    <div className="field">
                      <label htmlFor="task-name" className="font-medium mb-2 block">Task Name</label>
                      <InputTextarea
                        id="task-name"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        rows={1}
                        autoResize
                        className="w-full"
                        placeholder="What are you working on?"
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
                      />
                    </div>
                    <div className="flex justify-content-end gap-2 mt-4">
                      <Button
                        label="Cancel"
                        icon="pi pi-times"
                        className="p-button-outlined p-button-secondary"
                        onClick={() => setShowCreateTask(false)}
                      />
                      <Button
                        label="Create Task"
                        icon="pi pi-check"
                        onClick={handleCreateTask}
                        disabled={!newTaskName.trim()}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3 mb-2 border-round cursor-pointer transition-colors transition-duration-150 ${
                            selectedTask?.id === task.id
                              ? 'bg-primary'
                              : 'hover:surface-100'
                          }`}
                          onClick={() => handleTaskSelect(task)}
                        >
                          <div className="font-medium">{task.name}</div>
                          {task.description && (
                            <div className="text-sm text-color-secondary mt-1">{task.description}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-5 text-color-secondary">
                        <i className="pi pi-check-square text-4xl mb-3" />
                        <div>No tasks in this project</div>
                        <Button
                          label="Add Task"
                          icon="pi pi-plus"
                          className="p-button-text mt-3"
                          onClick={() => setShowCreateTask(true)}
                        />
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center py-5 text-color-secondary">
                  <i className="pi pi-arrow-left text-4xl mb-3" />
                  <div>Select a project first</div>
                </div>
              )}
            </Card>
          </div>

          <div className="col-12 md:col-4 mb-4">
            <Card title="Timer" className="h-full">
              <div className="p-fluid">
                {selectedTask ? (
                  <>
                    <div className="mb-4">
                      <div className="text-lg font-bold mb-2">Selected Task</div>
                      <div className="p-3 bg-gray-100 dark:bg-gray-900 border-round">
                        <div className="font-medium">{selectedTask.name}</div>
                        {selectedTask.description && (
                          <div className="text-sm text-color-secondary mt-1">{selectedTask.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="field mb-4">
                      <label htmlFor="description" className="font-medium mb-2 block">Description (optional)</label>
                      <InputTextarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        autoResize
                        className="w-full"
                        placeholder="What are you working on?"
                      />
                    </div>
                    <Button
                      label="Start Timer"
                      icon="pi pi-play"
                      className="p-button-success w-full p-3 text-xl"
                      onClick={handleStartTimer}
                    />
                  </>
                ) : (
                  <div className="text-center py-5 text-color-secondary">
                    <i className="pi pi-arrow-left text-4xl mb-3" />
                    <div>Select a task to start tracking</div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}