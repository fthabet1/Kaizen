'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { format } from 'date-fns';
import Link from 'next/link';

interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  is_completed: boolean;
  time_entry_count: number;
  total_time: number;
}

interface ProjectStats {
  id: number;
  name: string;
  color: string;
  taskCount: number;
  completedTasks: number;
  totalTasks: number;
  timeEntryCount: number;
  totalTime: number;
  dailyTime: DailyTime[];
}

interface DailyTime {
  date: string;
  totalTime: number;
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const projectId = parseInt(params.id);
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dateRange, setDateRange] = useState<string>('week');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
  });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'active', 'completed'

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Check if projectId is valid
  useEffect(() => {
    if (isNaN(projectId)) {
      router.push('/projects');
    }
  }, [projectId, router]);

  // Fetch project data
  useEffect(() => {
    if (user && !isNaN(projectId)) {
      fetchProjectData();
    }
  }, [user, projectId, dateRange]);

  const fetchProjectData = async () => {
    try {
      setLoadingData(true);
      
      // Calculate date range based on selection
      let startDate: Date | undefined;
      const endDate: Date = new Date();
      
      switch (dateRange) {
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case 'all':
          startDate = undefined;
          break;
      }
      
      // Format dates for API
      const startDateParam = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
      const endDateParam = format(endDate, 'yyyy-MM-dd');
      
      const queryParams = startDateParam 
        ? `?start_date=${startDateParam}&end_date=${endDateParam}` 
        : '';
      
      const [projectResponse, tasksResponse, statsResponse] = await Promise.all([
        axios.get(`/api/projects/${projectId}`),
        axios.get(`/api/tasks?project_id=${projectId}`),
        axios.get(`/api/projects/${projectId}/stats${queryParams}`)
      ]);
      
      setProject(projectResponse.data);
      setTasks(tasksResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching project data', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Format time from seconds to readable format
  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('/api/tasks', {
        project_id: projectId,
        name: newTask.name,
        description: newTask.description || ''
      });
      
      setTasks([...tasks, response.data]);
      setNewTask({
        name: '',
        description: '',
      });
      setShowTaskForm(false);
      
      // Refresh stats
      fetchProjectData();
    } catch (error) {
      console.error('Error creating task', error);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProject) return;
    
    try {
      const response = await axios.put(`/api/projects/${projectId}`, {
        name: editingProject.name,
        description: editingProject.description,
        color: editingProject.color
      });
      
      setProject(response.data);
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project', error);
    }
  };

  const handleToggleTaskComplete = async (taskId: number, isCompleted: boolean) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, {
        is_completed: !isCompleted
      });
      
      // Update the task in the list
      setTasks(
        tasks.map((t) => 
          t.id === taskId ? { ...t, is_completed: !isCompleted } : t
        )
      );
      
      // Refresh stats
      fetchProjectData();
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task and all associated time entries?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      
      // Remove the task from the list
      setTasks(tasks.filter((t) => t.id !== taskId));
      
      // Refresh stats
      fetchProjectData();
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'active') return !task.is_completed;
    if (taskFilter === 'completed') return task.is_completed;
    return true;
  });

  const colorOptions = [
    '#0EA5E9', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#000000', // Black
  ];

  if (loading || loadingData) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto">
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold text-gray-700">Project not found</h2>
          <Link 
            href="/projects" 
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Projects
        </Link>
      </div>

      {/* Project Header */}
      {editingProject ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Edit Project</h2>
          <form onSubmit={handleUpdateProject}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={editingProject.description || ''}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter project description"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex space-x-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setEditingProject({ ...editingProject, color })
                      }
                      className={`w-8 h-8 rounded-full ${
                        editingProject.color === color
                          ? 'ring-2 ring-offset-2 ring-blue-500'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color} color`}
                    ></button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Update Project
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <div className="flex items-center">
              <div
                className="w-6 h-6 rounded-full mr-3"
                style={{ backgroundColor: project.color }}
              ></div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Created {format(new Date(project.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={() => setEditingProject(project)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Project
            </button>
            <Link
              href={`/timer?projectId=${project.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Start Timer
            </Link>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Total Time</div>
          <div className="text-2xl font-bold">
            {stats ? formatTime(stats.totalTime) : '0h 0m'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Total Tasks</div>
          <div className="text-2xl font-bold">{stats ? stats.taskCount : 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Completed Tasks</div>
          <div className="text-2xl font-bold">
            {stats ? stats.completedTasks : 0} / {stats ? stats.totalTasks : 0}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div
              className="h-2.5 rounded-full bg-green-600"
              style={{
                width: `${
                  stats && stats.totalTasks > 0
                    ? (stats.completedTasks / stats.totalTasks) * 100
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="text-sm text-gray-500">Time Entries</div>
          <div className="text-2xl font-bold">
            {stats ? stats.timeEntryCount : 0}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Time Tracking</h2>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="year">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div className="h-64">
            {stats && stats.dailyTime && stats.dailyTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.dailyTime}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                  />
                  <YAxis
                    tickFormatter={(seconds) => `${Math.floor(seconds / 3600)}h`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatTime(value), 'Time']}
                    labelFormatter={(date) =>
                      format(new Date(date as string), 'MMMM d, yyyy')
                    }
                  />
                  <Bar
                    dataKey="totalTime"
                    fill={project.color}
                    name="Time Tracked"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No time tracking data available for this period
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Task Completion</h2>
          <div className="h-64">
            {stats && stats.totalTasks > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'Completed',
                        value: stats.completedTasks,
                      },
                      {
                        name: 'Remaining',
                        value: stats.totalTasks - stats.completedTasks,
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    <Cell fill="#10B981" /> {/* Green for completed */}
                    <Cell fill="#9CA3AF" /> {/* Gray for remaining */}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Tasks']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No tasks have been created for this project
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-bold text-lg">Tasks</h2>
          <div className="flex space-x-2">
            <div className="relative">
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Tasks</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button
              onClick={() => setShowTaskForm(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Task
            </button>
          </div>
        </div>

        {/* New Task Form */}
        {showTaskForm && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name
                  </label>
                  <input
                    type="text"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter task description"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
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

        {/* Tasks List */}
        <div>
          {filteredTasks.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <li key={task.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={task.is_completed}
                          onChange={() =>
                            handleToggleTaskComplete(task.id, task.is_completed)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <div
                          className={`text-lg font-medium ${
                            task.is_completed ? 'line-through text-gray-500' : ''
                          }`}
                        >
                          {task.name}
                        </div>
                        {task.description && (
                          <div className="text-gray-600 mt-1">
                            {task.description}
                          </div>
                        )}
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span className="mr-3">
                            {formatTime(task.total_time || 0)}
                          </span>
                          <span>
                            {task.time_entry_count || 0} time{' '}
                            {task.time_entry_count === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/timer?taskId=${task.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Start Timer
                      </Link>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No tasks found. 
              {taskFilter !== 'all' && (
                <button 
                  onClick={() => setTaskFilter('all')}
                  className="text-blue-600 hover:underline ml-1"
                >
                  Show all tasks
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
