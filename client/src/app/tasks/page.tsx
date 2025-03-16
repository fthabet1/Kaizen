/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTimer } from '../../contexts/TimerContext';

// PrimeReact imports
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';

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
  const { user, loading, isReady } = useAuth();
  const { isRunning, currentTask, startTimer } = useTimer();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [taskDialog, setTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    project_id: 0,
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isNewTask, setIsNewTask] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filter, setFilter] = useState({
    projectId: 0,
    showCompleted: false,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (isReady && !user) {
      router.push('/auth/login');
    }
  }, [user, isReady, router]);

  // Fetch tasks and projects
  useEffect(() => {
    if (user && isReady) {
      fetchTasksAndProjects();
    }
  }, [user, isReady, filter]);

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

  const openNew = () => {
    setNewTask({
      name: '',
      description: '',
      project_id: projects.length > 0 ? projects[0].id : 0,
    });
    setIsNewTask(true);
    setTaskDialog(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setIsNewTask(false);
    setTaskDialog(true);
  };

  const hideDialog = () => {
    setTaskDialog(false);
    setEditingTask(null);
  };

  const handleSaveTask = async () => {
    try {
      if (isNewTask) {
        // Create new task
        if (newTask.project_id === 0) {
          return; // Should be prevented by UI
        }
        
        const response = await axios.post('/api/tasks', newTask);
        setTasks([...tasks, response.data]);
        setNewTask({
          name: '',
          description: '',
          project_id: newTask.project_id, // Keep the same project selected
        });
      } else if (editingTask) {
        // Update existing task
        const response = await axios.put(`/api/tasks/${editingTask.id}`, {
          name: editingTask.name,
          description: editingTask.description,
          project_id: editingTask.project_id,
        });
        
        setTasks(
          tasks.map((t) => (t.id === editingTask.id ? response.data : t))
        );
      }
      
      setTaskDialog(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task', error);
    }
  };

  const confirmDeleteTask = (task: Task) => {
    confirmDialog({
      message: 'Are you sure you want to delete this task? This will also delete all associated time entries.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => handleDeleteTask(task.id)
    });
  };

  const handleDeleteTask = async (id: number) => {
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

  const taskNameTemplate = (rowData: Task) => {
    return (
      <div>
        <div className="font-medium">{rowData.name}</div>
        {rowData.description && (
          <div className="text-sm text-color-secondary mt-1 truncate max-w-md">
            {rowData.description}
          </div>
        )}
      </div>
    );
  };

  const projectTemplate = (rowData: Task) => {
    const project = getProjectById(rowData.project_id);
    if (!project) return null;
    
    return (
      <div className="flex align-items-center">
        <div 
          className="w-1rem h-1rem border-circle mr-2" 
          style={{ backgroundColor: project.color }}
        ></div>
        <span>{project.name}</span>
      </div>
    );
  };

  const dateTemplate = (rowData: Task) => {
    return new Date(rowData.created_at).toLocaleDateString();
  };

  const statusTemplate = (rowData: Task) => {
    return (
      <Tag 
        severity={rowData.is_completed ? 'success' : 'warning'} 
        value={rowData.is_completed ? 'Completed' : 'In Progress'}
      />
    );
  };

  const actionTemplate = (rowData: Task) => {
    const isCurrentlyTracking = isRunning && currentTask?.id === rowData.id;
    
    return (
      <div className="flex gap-2 justify-content-end">
        {!rowData.is_completed && (
          <Button 
            icon={isCurrentlyTracking ? "pi pi-clock" : "pi pi-play"} 
            className={`p-button-rounded p-button-text ${isCurrentlyTracking ? 'p-button-success' : ''}`} 
            tooltip={isCurrentlyTracking ? "Currently tracking" : "Start timer"}
            tooltipOptions={{ position: 'left' }}
            onClick={(e) => {
              e.stopPropagation();
              handleStartTaskTimer(rowData);
            }} 
          />
        )}
        <Button 
          icon={rowData.is_completed ? "pi pi-refresh" : "pi pi-check"} 
          className={`p-button-rounded p-button-text ${rowData.is_completed ? 'p-button-warning' : 'p-button-success'}`} 
          tooltip={rowData.is_completed ? "Reopen" : "Complete"}
          tooltipOptions={{ position: 'left' }}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleComplete(rowData.id, rowData.is_completed);
          }} 
        />
        <Button 
          icon="pi pi-pencil" 
          className="p-button-rounded p-button-text" 
          tooltip="Edit"
          tooltipOptions={{ position: 'left' }}
          onClick={(e) => {
            e.stopPropagation();
            openEdit(rowData);
          }} 
        />
        <Button 
          icon="pi pi-trash" 
          className="p-button-rounded p-button-text p-button-danger" 
          tooltip="Delete"
          tooltipOptions={{ position: 'left' }}
          onClick={(e) => {
            e.stopPropagation();
            confirmDeleteTask(rowData);
          }} 
        />
      </div>
    );
  };

  const header = (
    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center">
      <h5 className="m-0">Manage Tasks</h5>
      <div className="p-input-icon-left w-full md:w-auto mt-2 md:mt-0 relative">
      <InputText
        type="search"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Search..."
        className="w-full"
      />
      </div>
    </div>
  );

  const toolbarStart = () => {
    return (
      <h1 className="text-2xl font-medium m-0">Tasks</h1>
    );
  };
  
  const toolbarEnd = () => {
    return (
      <div className="flex gap-2 flex-column md:flex-row">
        <Dropdown
          value={filter.projectId}
          options={[{label: 'All Projects', value: 0}, ...projects.map(p => ({label: p.name, value: p.id}))]}
          onChange={(e) => setFilter({...filter, projectId: e.value})}
          placeholder="Filter by Project"
          className="w-full md:w-auto"
        />
        
        <div className="flex align-items-center gap-2">
          <Checkbox
            inputId="show-completed"
            checked={filter.showCompleted}
            onChange={(e) => setFilter({...filter, showCompleted: e.checked!})}
          />
          <label htmlFor="show-completed" className="text-sm">Show completed</label>
        </div>
        
        <Button 
          label="New Task" 
          icon="pi pi-plus" 
          onClick={openNew} 
          className="p-button-primary" 
        />
      </div>
    );
  };

  const taskDialogFooter = (
    <>
      <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} />
      <Button label={isNewTask ? "Create" : "Save"} icon="pi pi-check" onClick={handleSaveTask} />
    </>
  );

  const emptyMessage = () => {
    return (
      <div className="text-center py-5">
        <i className="pi pi-check-square text-4xl text-gray-400 mb-3"></i>
        <h3 className="text-lg font-medium mb-2">No Tasks Found</h3>
        <p className="mb-4">
          {filter.projectId > 0 || filter.showCompleted
            ? 'Try adjusting your filters'
            : 'Get started by creating your first task.'}
        </p>
        {!filter.projectId && !filter.showCompleted && (
          <Button label="Create Task" icon="pi pi-plus" onClick={openNew} />
        )}
      </div>
    );
  };

  if (loading || (!isReady) || loadingData) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4">
      <Card>
        <Toolbar start={toolbarStart} end={toolbarEnd} className="mb-4" />
        
        {/* Desktop View */}
        <div className="hidden md:block">
          <DataTable 
            value={tasks} 
            paginator 
            rows={10} 
            rowsPerPageOptions={[5, 10, 25]} 
            dataKey="id" 
            rowHover
            stripedRows
            globalFilter={globalFilter}
            emptyMessage={emptyMessage}
            header={header}
            className="p-datatable-tasks"
          >
            <Column 
              field="name" 
              header="Task" 
              body={taskNameTemplate} 
              sortable 
              style={{ width: '35%' }} 
            />
            <Column 
              field="project_id" 
              header="Project" 
              body={projectTemplate} 
              sortable 
              style={{ width: '20%' }} 
            />
            <Column 
              field="created_at" 
              header="Created" 
              body={dateTemplate} 
              sortable 
              style={{ width: '15%' }} 
            />
            <Column 
              field="is_completed" 
              header="Status" 
              body={statusTemplate} 
              sortable 
              style={{ width: '10%' }} 
            />
            <Column 
              body={actionTemplate} 
              headerStyle={{ width: '20%', textAlign: 'center' }}
              bodyStyle={{ textAlign: 'right', overflow: 'visible' }}
            />
          </DataTable>
        </div>
        
        {/* Mobile View */}
        <div className="block md:hidden">
          <DataTable 
            value={tasks} 
            paginator 
            rows={10} 
            dataKey="id" 
            rowHover
            stripedRows
            globalFilter={globalFilter}
            emptyMessage={emptyMessage}
            responsiveLayout="stack"
            breakpoint="768px"
          >
            <Column 
              field="name" 
              header="Task" 
              body={taskNameTemplate} 
              sortable 
            />
            <Column 
              field="is_completed" 
              header="Status" 
              body={statusTemplate} 
              sortable 
            />
            <Column 
              body={actionTemplate} 
              headerStyle={{ width: '40%', textAlign: 'center' }}
              bodyStyle={{ textAlign: 'right', overflow: 'visible' }}
            />
          </DataTable>
        </div>
      </Card>

      <Dialog 
        visible={taskDialog} 
        header={isNewTask ? 'Create Task' : 'Edit Task'} 
        modal 
        className="p-fluid"
        footer={taskDialogFooter} 
        onHide={hideDialog}
        style={{ width: '450px' }}
      >
        <div className="field mt-4 mb-4">
          <label htmlFor="name" className="font-medium mb-2 block">Task Name*</label>
          <InputText 
            id="name" 
            value={isNewTask ? newTask.name : editingTask?.name || ''} 
            onChange={(e) => isNewTask 
              ? setNewTask({...newTask, name: e.target.value})
              : setEditingTask(prev => prev ? {...prev, name: e.target.value} : prev)
            } 
            required 
            autoFocus 
            placeholder="Enter task name"
            className={isNewTask ? (newTask.name ? '' : 'p-invalid') : ''}
          />
          {isNewTask && !newTask.name && <small className="p-error">Task name is required.</small>}
        </div>

        <div className="field mb-4">
          <label htmlFor="description" className="font-medium mb-2 block">Description</label>
          <InputTextarea 
            id="description" 
            value={isNewTask ? newTask.description : editingTask?.description || ''} 
            onChange={(e) => isNewTask 
              ? setNewTask({...newTask, description: e.target.value})
              : setEditingTask(prev => prev ? {...prev, description: e.target.value} : prev)
            } 
            rows={3} 
            placeholder="Enter task description (optional)"
          />
        </div>

        <div className="field">
          <label htmlFor="project" className="font-medium mb-2 block">Project*</label>
          <Dropdown
            id="project"
            value={isNewTask ? newTask.project_id : editingTask?.project_id}
            options={projects.map(p => ({label: p.name, value: p.id}))}
            onChange={(e) => isNewTask 
              ? setNewTask({...newTask, project_id: e.value})
              : setEditingTask(prev => prev ? {...prev, project_id: e.value} : prev)
            }
            placeholder="Select a project"
            filter
            showClear={false}
            required
            className={isNewTask ? (newTask.project_id ? '' : 'p-invalid') : ''}
          />
          {isNewTask && !newTask.project_id && <small className="p-error">Project is required.</small>}
        </div>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}