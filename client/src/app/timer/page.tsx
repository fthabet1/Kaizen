'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useTimer } from '../../contexts/TimerContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// PrimeReact imports for better UI
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';

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
  const { user, loading } = useAuth();
  const { isRunning, currentTask, startTimer, stopTimer } = useTimer();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [description, setDescription] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Fetch projects and tasks
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          setLoadingData(true);
          const [projectsResponse, tasksResponse] = await Promise.all([
            axios.get('/api/projects?is_active=true'),
            axios.get('/api/tasks?is_completed=false')
          ]);
          
          setProjects(projectsResponse.data);
          setTasks(tasksResponse.data);
          
          // If a project was selected before, maintain that selection
          if (selectedProject) {
            const updatedProject = projectsResponse.data.find(
              (p: Project) => p.id === selectedProject.id
            );
            if (updatedProject) {
              setSelectedProject(updatedProject);
            }
          }
        } catch (error) {
          console.error('Error fetching data', error);
        } finally {
          setLoadingData(false);
        }
      };

      fetchData();
    }
  }, [user, selectedProject]);

  // Filter tasks by selected project
  const filteredTasks = selectedProject 
    ? tasks.filter(task => task.project_id === selectedProject.id)
    : [];

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setSelectedTask(null); // Clear task selection when project changes
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  const handleStartTimer = async () => {
    if (!selectedTask) return;
    
    try {
      await startTimer(selectedTask.id, selectedTask.project_id, description);
      setDescription('');
    } catch (error) {
      console.error('Error starting timer', error);
    }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer();
    } catch (error) {
      console.error('Error stopping timer', error);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedProject || !newTaskName.trim()) return;
    
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
    } catch (error) {
      console.error('Error creating task', error);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex justify-content-center align-items-center h-screen">
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <>
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
              {isRunning ? (
                <div className="p-fluid">
                  <div className="text-center mb-4">
                    <div className="text-xl font-bold mb-2">{currentTask?.name}</div>
                    <div className="text-color-secondary">Currently tracking</div>
                  </div>
                  
                  <Button
                    label="Stop Timer"
                    icon="pi pi-stop-circle"
                    className="p-button-danger w-full p-3 text-xl"
                    onClick={handleStopTimer}
                  />
                </div>
              ) : (
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
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}