'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useRouter } from 'next/navigation';
// IMPORTANT: Use the configured axios instance instead of the default one
import axios from '../../utils/axiosConfig';
import Link from 'next/link';

// PrimeReact Components
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toolbar } from 'primereact/toolbar';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';

interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

export default function ProjectsPage() {
  const { user, loading, isReady } = useAuth();
  const router = useRouter();
  const toast = useRef<Toast>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectDialog, setProjectDialog] = useState(false);
  const [isNewProject, setIsNewProject] = useState(true);
  const [project, setProject] = useState<Project>({
    id: 0,
    name: '',
    description: '',
    color: '#0EA5E9',
    is_active: true,
    created_at: new Date().toISOString()
  });
  const [globalFilter, setGlobalFilter] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (isReady && !user) {
      router.push('/auth/login');
    }
  }, [user, isReady, router]);

  // Fetch projects
  useEffect(() => {
    if (user && isReady) {
      fetchProjects();
    }
  }, [user, isReady]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      console.log('Fetching projects...');
      const response = await axios.get('/api/projects');
      console.log('Projects fetched successfully:', response.data);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects', error);
      toast.current?.show({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to fetch projects', 
        life: 3000 
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const openNew = () => {
    setProject({
      id: 0,
      name: '',
      description: '',
      color: '#0EA5E9',
      is_active: true,
      created_at: new Date().toISOString()
    });
    setIsNewProject(true);
    setProjectDialog(true);
  };

  const openEdit = (projectToEdit: Project) => {
    console.log('Opening edit dialog for project:', projectToEdit);
    // Create a clean copy to avoid reference issues
    setProject({ 
      id: projectToEdit.id,
      name: projectToEdit.name,
      description: projectToEdit.description,
      color: projectToEdit.color,
      is_active: projectToEdit.is_active,
      created_at: projectToEdit.created_at
    });
    setIsNewProject(false);
    setProjectDialog(true);
  };

  const hideDialog = () => {
    setProjectDialog(false);
  };

  const handleSaveProject = async () => {
    try {
      if (!project.name.trim()) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Project name is required',
          life: 3000
        });
        return;
      }

      if (isNewProject) {
        // Create new project
        console.log('Creating new project with data:', {
          name: project.name,
          description: project.description,
          color: project.color
        });
        
        const response = await axios.post('/api/projects', {
          name: project.name,
          description: project.description,
          color: project.color
        });
        
        console.log('Project created successfully, response:', response.data);
        
        // Update state
        setProjects(prevProjects => [...prevProjects, response.data]);
        
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Project created successfully',
          life: 3000
        });
      } else {
        // Update existing project
        console.log('Updating project ID:', project.id, 'with data:', {
          name: project.name,
          description: project.description,
          color: project.color
        });
        
        const response = await axios.put(`/api/projects/${project.id}`, {
          name: project.name,
          description: project.description,
          color: project.color
        });
        
        console.log('Project updated successfully, response:', response.data);
        
        // Create a completely new array for React state update
        const updatedProjects = [...projects];
        const index = updatedProjects.findIndex(p => p.id === project.id);
        
        if (index !== -1) {
          updatedProjects[index] = response.data;
          setProjects(updatedProjects);
          console.log('Updated projects array:', updatedProjects);
        }
        
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Project updated successfully',
          life: 3000
        });
      }
      
      setProjectDialog(false);
      
      // Force refresh projects after a brief delay to ensure server has processed the change
      setTimeout(() => {
        console.log('Refreshing projects list after update');
        fetchProjects();
      }, 300);
      
    } catch (error) {
      console.error('Error saving project:', error);
      
      let errorMessage = 'Failed to save project';
      
      if (axios.isAxiosError(error) && error.response) {
        console.error('API error details:', {
          status: error.response.status,
          data: error.response.data
        });
        
        errorMessage += `: ${error.response.data?.error || error.message}`;
      }
      
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000
      });
    }
  };

  const confirmDeleteProject = (project: Project) => {
    confirmDialog({
      message: 'Are you sure you want to delete this project? This will also delete all associated tasks and time entries.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => handleDeleteProject(project.id)
    });
  };

  const handleDeleteProject = async (id: number) => {
    try {
      console.log('Deleting project ID:', id);
      await axios.delete(`/api/projects/${id}`);
      
      setProjects(projects.filter(p => p.id !== id));
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Project deleted successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Error deleting project', error);
      
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete project',
        life: 3000
      });
      
      // Refresh projects on error to ensure UI consistency
      fetchProjects();
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      console.log('Toggling project activity. Project ID:', id, 'Current status:', isActive);
      
      const response = await axios.put(`/api/projects/${id}`, {
        is_active: !isActive,
      });
      
      console.log('Toggle activity response:', response.data);
      
      // Create a new array with the updated project
      const updatedProjects = projects.map(p => 
        p.id === id ? response.data : p
      );
      
      setProjects(updatedProjects);
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: `Project ${!isActive ? 'activated' : 'archived'} successfully`,
        life: 3000
      });
    } catch (error) {
      console.error('Error updating project', error);
      
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update project status',
        life: 3000
      });
      
      // Refresh projects on error to ensure UI consistency
      fetchProjects();
    }
  };

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

  // DataTable Templates
  const projectNameTemplate = (rowData: Project) => {
    return (
      <div className="flex align-items-center">
        <div 
          className="flex-shrink-0 w-1rem h-1rem border-circle mr-2" 
          style={{ backgroundColor: rowData.color }}
        ></div>
        <div>
          <div className="font-medium">{rowData.name}</div>
          <Link href={`/projects/${rowData.id}`} className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer">
            View Details
          </Link>
        </div>
      </div>
    );
  };

  const descriptionTemplate = (rowData: Project) => {
    return (
      <div className="truncate max-w-xs">
        {rowData.description || <span className="text-gray-400 italic">No description</span>}
      </div>
    );
  };

  const statusTemplate = (rowData: Project) => {
    return (
      <Tag 
        severity={rowData.is_active ? 'success' : 'secondary'} 
        value={rowData.is_active ? 'Active' : 'Archived'}
        className="text-xs"
      />
    );
  };

  const dateTemplate = (rowData: Project) => {
    return new Date(rowData.created_at).toLocaleDateString();
  };

  const actionTemplate = (rowData: Project) => {
    return (
      <div className="flex gap-2 justify-content-end">
        <Button 
          icon={rowData.is_active ? "pi pi-box" : "pi pi-check"} 
          className="p-button-rounded p-button-text" 
          tooltip={rowData.is_active ? "Archive" : "Activate"}
          tooltipOptions={{ position: 'left' }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            handleToggleActive(rowData.id, rowData.is_active);
          }} 
        />
        <Button 
          icon="pi pi-pencil" 
          className="p-button-rounded p-button-text" 
          tooltip="Edit"
          tooltipOptions={{ position: 'left' }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            openEdit(rowData);
          }} 
        />
        <Button 
          icon="pi pi-trash" 
          className="p-button-rounded p-button-text p-button-danger" 
          tooltip="Delete"
          tooltipOptions={{ position: 'left' }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click
            confirmDeleteProject(rowData);
          }} 
        />
      </div>
    );
  };

  const header = (
    <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center">
      <h5 className="m-0">Manage Projects</h5>

        <InputText 
          type="search" 
          onInput={(e) => setGlobalFilter((e.target as HTMLInputElement).value)} 
          placeholder="Search..." 
        />

    </div>
  );

  const toolbarStart = () => {
    return (
      <h1 className="text-2xl font-medium m-0">Projects</h1>
    );
  };
  
  const toolbarEnd = () => {
    return (
      <Button 
        label="New Project" 
        icon="pi pi-plus" 
        onClick={openNew} 
        className="p-button-primary" 
      />
    );
  };

  const projectDialogFooter = (
    <>
      <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} />
      <Button label={isNewProject ? "Create" : "Save"} icon="pi pi-check" onClick={handleSaveProject} />
    </>
  );

  const emptyMessage = () => {
    return (
      <div className="text-center py-5">
        <i className="pi pi-folder-open text-4xl text-gray-400 mb-3"></i>
        <h3 className="text-lg font-medium text-900 mb-2">No Projects Found</h3>
        <p className="text-color-secondary mb-4">Get started by creating your first project.</p>
        <Button label="Create Project" icon="pi pi-plus" onClick={openNew} />
      </div>
    );
  };

  if (loading || (!isReady) || loadingProjects) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4">
      <Toast ref={toast} position="top-right" />
      <Card>
        <Toolbar start={toolbarStart} end={toolbarEnd} className="mb-4" />
        
        {/* For desktop view (custom table implementation) */}
        <div className="hidden md:block">
          <DataTable 
            value={projects} 
            paginator 
            rows={10} 
            dataKey="id" 
            rowHover
            stripedRows
            emptyMessage={emptyMessage}
            className="p-datatable-projects"
            header={header}
            globalFilter={globalFilter}
          >
            <Column 
              field="name" 
              header="Project" 
              body={projectNameTemplate} 
              sortable 
              style={{ width: '25%' }} 
            />
            <Column 
              field="description" 
              header="Description" 
              body={descriptionTemplate}
              sortable 
              style={{ width: '35%' }} 
            />
            <Column 
              field="created_at" 
              header="Created" 
              body={dateTemplate} 
              sortable 
              style={{ width: '15%' }} 
            />
            <Column 
              field="is_active" 
              header="Status" 
              body={statusTemplate} 
              sortable 
              style={{ width: '10%' }} 
            />
            <Column 
              body={actionTemplate} 
              headerStyle={{ width: '15%', textAlign: 'center' }}
              bodyStyle={{ textAlign: 'right', overflow: 'visible' }}
            />
          </DataTable>
        </div>

        {/* For mobile view (stack layout) */}
        <div className="block md:hidden">
          <DataTable 
            value={projects} 
            paginator 
            rows={10} 
            dataKey="id" 
            rowHover
            stripedRows
            emptyMessage={emptyMessage}
            responsiveLayout="stack"
            breakpoint="768px"
            globalFilter={globalFilter}
          >
            <Column 
              field="name" 
              header="Project" 
              body={projectNameTemplate} 
              sortable 
            />
            <Column 
              field="is_active" 
              header="Status" 
              body={statusTemplate} 
              sortable 
            />
            <Column 
              body={actionTemplate} 
              headerStyle={{ width: '25%', textAlign: 'center' }}
              bodyStyle={{ textAlign: 'right', overflow: 'visible' }}
            />
          </DataTable>
        </div>
      </Card>

      <Dialog 
        visible={projectDialog} 
        header={isNewProject ? 'Create Project' : 'Edit Project'} 
        modal 
        className="p-fluid"
        footer={projectDialogFooter} 
        onHide={hideDialog}
        style={{ width: '450px' }}
      >
        <div className="field mt-4 mb-4">
          <label htmlFor="name" className="font-medium mb-2 block">Project Name*</label>
          <InputText 
            id="name" 
            value={project.name} 
            onChange={(e) => setProject({...project, name: e.target.value})} 
            required 
            autoFocus 
            placeholder="Enter project name"
            className={project.name ? '' : 'p-invalid'}
          />
          {!project.name && <small className="p-error">Project name is required.</small>}
        </div>

        <div className="field mb-4">
          <label htmlFor="description" className="font-medium mb-2 block">Description</label>
          <InputTextarea 
            id="description" 
            value={project.description || ''} 
            onChange={(e) => setProject({...project, description: e.target.value})} 
            rows={3} 
            placeholder="Enter project description (optional)"
          />
        </div>

        <div className="field">
          <label className="font-medium mb-2 block">Color</label>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setProject({...project, color})}
                className={`w-2rem h-2rem border-circle cursor-pointer border-none ${
                  project.color === color ? 'shadow-4' : ''
                }`}
                style={{ 
                  backgroundColor: color,
                  outline: project.color === color ? '3px solid var(--primary-color)' : 'none',
                  outlineOffset: '2px'
                }}
                aria-label={`Select ${color} color`}
              ></button>
            ))}
          </div>
        </div>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}