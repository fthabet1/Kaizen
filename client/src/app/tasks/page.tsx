'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTimer } from '../../contexts/TimerContext';

interface Project {
  id: number;
  name: string;
  color: string;
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  is_completed: boolean;
  created_at: string;
}

export default function TasksPage() {
  const { user, loading } = useAuth();
  const { isRunning, currentTask, startTimer } = useTimer();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    project_id: 0,
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState({
    projectId: 0,
    showCompleted: false,
    searchTerm: '',
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Fetch tasks and projects
  useEffect(() => {
    if (user) {
      fetchTasksAndProjects();
    }
  }, [user, filter]);

  const fetchTasksAndProjects = async () => {
    try {
      setLoadingData(true);
      
      // Build query params for tasks
      const params = new URLSearchParams();
      if (filter.projectId > 0) {
        params.append('project_id', filter.projectId.toString());
      }
      if (!filter.showCompleted) {
        params.append('is_completed', 'false');
      }
      if (filter.searchTerm) {
        params.append('search', filter.searchTerm);
      }
      
      const [tasksResponse, projectsResponse] = await Promise.all([
        axios.get(`/api/tasks?${params.toString()}`),
        axios.get('/api/projects?is_active=true'),
      ]);
      
      setTasks(tasksResponse.data);
      setProjects(projectsResponse.data);
      
      // Set default project if none selected and projects exist
      if (newTask.project_id === 0 && projectsResponse.data.length > 0) {
        setNewTask({
          ...newTask,
          project_id: projectsResponse.data[0].id,
        });
      }
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newTask.project_id === 0) {
      alert('Please select a project');
      return;
    }
    
    try {
      const response = await axios.post('/api/tasks', newTask);
      setTasks([...tasks, response.data]);
      setNewTask({
        name: '',
        description: '',
        project_id: newTask.project_id, // Keep the same project selected
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating task', error);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask) return;
    
    try {
      const response = await axios.put(`/api/tasks/${editingTask.id}`, {
        name: editingTask.name,
        description: editingTask.description,
        project_id: editingTask.project_id,
      });
      
      setTasks(
        tasks.map((t) => (t.id === editingTask.id ? response.data : t))
      );
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task? This will also delete all associated time entries.')) {
      return;
    }
    
    try {
      await axios.delete(`/api/tasks/${id}`);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const handleToggleComplete = async (id: number, isCompleted: boolean) => {
    try {
      const response = await axios.put(`/api/tasks/${id}`, {
        is_completed: !isCompleted,
      });
      
      setTasks(
        tasks.map((t) => (t.id === id ? response.data : t))
      );
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  const handleStartTaskTimer = async (task: Task) => {
    if (isRunning && currentTask?.id === task.id) {
      // Already tracking this task
      return;
    }
    
    try {
      await startTimer(task.id, task.project_id);
    } catch (error) {
      console.error('Error starting timer', error);
    }
  };

  const getProjectById = (id: number) => {
    return projects.find((p) => p.id === id);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <label htmlFor="search-tasks" className="sr-only">
              Search Tasks
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                id="search-tasks"
                name="search-tasks"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search tasks"
                type="search"
                value={filter.searchTerm}
                onChange={(e) =>
                  setFilter({ ...filter, searchTerm: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label htmlFor="project-filter" className="sr-only">
              Filter by Project
            </label>
            <select
              id="project-filter"
              name="project-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter.projectId}
              onChange={(e) =>
                setFilter({ ...filter, projectId: parseInt(e.target.value) })
              }
            >
              <option value={0}>All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="show-completed"
              name="show-completed"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={filter.showCompleted}
              onChange={(e) =>
                setFilter({ ...filter, showCompleted: e.target.checked })
              }
            />
            <label
              htmlFor="show-completed"
              className="ml-2 block text-sm text-gray-900"
            >
              Show completed tasks
            </label>
          </div>
        </div>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
          <form onSubmit={handleCreateTask}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="task-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Task Name
                </label>
                <input
                  type="text"
                  id="task-name"
                  required
                  value={newTask.name}
                  onChange={(e) =>
                    setNewTask({ ...newTask, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task name"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (optional)
                </label>
                <textarea
                  id="task-description"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter task description"
                ></textarea>
              </div>

              <div>
                <label
                  htmlFor="task-project"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Project
                </label>
                <select
                  id="task-project"
                  required
                  value={newTask.project_id}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      project_id: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0} disabled>
                    Select a project
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Task Form */}
      {editingTask && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Edit Task</h2>
          <form onSubmit={handleUpdateTask}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="edit-task-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Task Name
                </label>
                <input
                  type="text"
                  id="edit-task-name"
                  required
                  value={editingTask.name}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task name"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-task-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (optional)
                </label>
                <textarea
                  id="edit-task-description"
                  value={editingTask.description || ''}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter task description"
                ></textarea>
              </div>

              <div>
                <label
                  htmlFor="edit-task-project"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Project
                </label>
                <select
                  id="edit-task-project"
                  required
                  value={editingTask.project_id}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      project_id: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Update Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Task
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => {
                  const project = getProjectById(task.project_id);
                  const isCurrentlyTracking = isRunning && currentTask?.id === task.id;
                  
                  return (
                    <tr key={task.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {task.name}
                        </div>
                        {task.description && (
                          <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {project && (
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: project.color }}
                            ></div>
                            <div className="text-sm text-gray-900">{project.name}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {new Date(task.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.is_completed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {task.is_completed ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {!task.is_completed && (
                            <button
                              onClick={() => handleStartTaskTimer(task)}
                              className={`${
                                isCurrentlyTracking
                                  ? 'text-green-600'
                                  : 'text-blue-600 hover:text-blue-900'
                              }`}
                            >
                              {isCurrentlyTracking ? 'Tracking...' : 'Start Timer'}
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleComplete(task.id, task.is_completed)}
                            className={`text-${task.is_completed ? 'yellow' : 'green'}-600 hover:text-${task.is_completed ? 'yellow' : 'green'}-900`}
                          >
                            {task.is_completed ? 'Reopen' : 'Complete'}
                          </button>
                          <button
                            onClick={() => setEditingTask(task)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 px-6">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter.projectId > 0 || filter.searchTerm || filter.showCompleted
                ? 'Try adjusting your filters'
                : 'Get started by creating a new task'}
            </p>
            {!filter.projectId && !filter.searchTerm && !filter.showCompleted && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  New Task
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
