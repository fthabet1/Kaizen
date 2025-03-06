'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useTimer } from '../../contexts/TimerContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';

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
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">Time Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Selection */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-lg">Projects</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={`w-full flex items-center p-3 rounded-md text-left ${
                      selectedProject?.id === project.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    ></div>
                    <span className="font-medium">{project.name}</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No projects found</p>
                  <button
                    className="mt-2 text-blue-600 hover:underline"
                    onClick={() => router.push('/projects/new')}
                  >
                    Create your first project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task Selection */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-lg">Tasks</h2>
            {selectedProject && (
              <button
                onClick={() => setShowCreateTask(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="p-6">
            {selectedProject ? (
              showCreateTask ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Name
                    </label>
                    <input
                      type="text"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter task name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Enter task description"
                    ></textarea>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowCreateTask(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateTask}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Create Task
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleTaskSelect(task)}
                        className={`w-full flex items-center p-3 rounded-md text-left ${
                          selectedTask?.id === task.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <span className="font-medium">{task.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No tasks in this project</p>
                      <button
                        className="mt-2 text-blue-600 hover:underline"
                        onClick={() => setShowCreateTask(true)}
                      >
                        Create your first task
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>Select a project first</p>
              </div>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-bold text-lg">Timer</h2>
          </div>
          <div className="p-6">
            {isRunning ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-lg font-medium">{currentTask?.name}</div>
                  <div className="text-sm text-gray-500 mt-1">Currently tracking</div>
                </div>
                <button
                  onClick={handleStopTimer}
                  className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                  Stop Timer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedTask ? (
                  <>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Selected Task
                      </div>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <div className="font-medium">{selectedTask.name}</div>
                        {selectedTask.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {selectedTask.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="What are you working on?"
                      />
                    </div>
                    <button
                      onClick={handleStartTimer}
                      className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Start Timer
                    </button>
                  </>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p>Select a task to start tracking</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
