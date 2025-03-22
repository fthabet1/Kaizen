/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
import { useTimer } from '../../contexts/TimerContext';
import { useRouter } from 'next/navigation';
import axios from '../../utils/axiosConfig';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { formatTime } from '../../utils/timeUtils';

// PrimeReact imports
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnFilterElementTemplateOptions } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

interface Project {
  id: number;
  name: string;
  color: string;
}

interface RecentActivity {
  id: number;
  task_id: number;
  task_name: string;
  project_id: number;
  project_name: string;
  project_color: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  description: string | null;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

export default function RecentActivityTable() {
  const { user, token, isReady } = useAuth();
  const { deleteTimeEntry: handleTimerEntryDelete } = useTimer();
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: 'contains' },
    project_name: { value: null, matchMode: 'contains' },
    task_name: { value: null, matchMode: 'contains' },
    start_time: { value: null, matchMode: 'between' }
  });
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [expandedRows, setExpandedRows] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);

  // Setup event listener for API connection errors
  useEffect(() => {
    const handleApiConnectionError = (event: CustomEvent) => {
      toast.current?.show({
        severity: 'error',
        summary: 'Connection Error',
        detail: event.detail.message,
        life: 5000
      });
    };

    window.addEventListener('apiConnectionError', handleApiConnectionError as EventListener);
    
    return () => {
      window.removeEventListener('apiConnectionError', handleApiConnectionError as EventListener);
    };
  }, []);

  useEffect(() => {
    if (isReady && user && token) {
      fetchData();
    } else if (isReady && !user) {
      setLoading(false);
      setRecentActivity([]);
    }
  }, [user, isReady, token]);

  const fetchData = async () => {
    if (!token) {
      console.error('No authentication token available');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Fetching time entries and projects data');
      
      const requestConfig = {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      };
      
      const [activityResponse, projectsResponse] = await Promise.all([
        axios.get('/api/time-entries?limit=50', requestConfig),
        axios.get('/api/projects', requestConfig)
      ]);
      
      if (activityResponse.data && Array.isArray(activityResponse.data)) {
        console.log(`Loaded ${activityResponse.data.length} time entries`);
        setRecentActivity(activityResponse.data);
      } else {
        console.warn('Unexpected time entries response format', activityResponse.data);
        setRecentActivity([]);
      }
      
      if (projectsResponse.data && Array.isArray(projectsResponse.data)) {
        console.log(`Loaded ${projectsResponse.data.length} projects`);
        setProjects(projectsResponse.data);
      } else {
        console.warn('Unexpected projects response format', projectsResponse.data);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Check if it's a network error
      if (axios.isAxiosError(error) && !error.response) {
        toast.current?.show({
          severity: 'error',
          summary: 'Connection Error',
          detail: 'Unable to connect to the server. Please check if the API is running.',
          life: 5000
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load recent activity data. Please try refreshing.',
          life: 3000
        });
      }
      
      // Set empty arrays to prevent UI errors
      setRecentActivity([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    
    (_filters['global'] as any).value = value;
    
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onDateRangeChange = (range: [Date | null, Date | null]) => {
    setDateRange(range);
    
    const _filters = { ...filters };
    (_filters['start_time'] as any).value = range[0] && range[1] ? 
      { start: range[0], end: range[1] } : null;
    
    setFilters(_filters);
  };

  const onProjectFilterChange = (e: { value: Project[] }) => {
    const selectedProjects = e.value;
    setSelectedProjects(selectedProjects);
    
    const _filters = { ...filters };
    (_filters['project_name'] as any).value = selectedProjects.length > 0 ? 
      selectedProjects.map(p => p.name) : null;
    
    setFilters(_filters);
  };

  const renderHeader = () => {
    return (
      <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-3">
        <div className="flex align-items-center">
          
            
            <InputText 
              value={globalFilterValue} 
              onChange={onGlobalFilterChange} 
              placeholder="Search" 
              className="w-full"
            />
          
        </div>
        
        <div className="flex gap-2 flex-column sm:flex-row">
          <MultiSelect
            value={selectedProjects}
            options={projects}
            onChange={onProjectFilterChange}
            optionLabel="name"
            placeholder="Select Projects"
            className="w-full sm:w-14rem"
            display="chip"
          />
          
          <Calendar
            value={dateRange[0] ? [dateRange[0], dateRange[1]] : null}
            onChange={(e) => {
              if (e.value && Array.isArray(e.value) && e.value.length === 2) {
                onDateRangeChange([e.value[0], e.value[1]]);
              } else {
                onDateRangeChange([null, null]);
              }
            }}
            selectionMode="range"
            readOnlyInput
            placeholder="Date Range"
            showIcon
            className="w-full sm:w-14rem"
          />
          
          <Button 
            label="Reset" 
            icon="pi pi-filter-slash" 
            className="p-button-outlined" 
            onClick={() => {
              setGlobalFilterValue('');
              setSelectedProjects([]);
              setDateRange([null, null]);
              setFilters({
                global: { value: null, matchMode: 'contains' },
                project_name: { value: null, matchMode: 'contains' },
                task_name: { value: null, matchMode: 'contains' },
                start_time: { value: null, matchMode: 'between' }
              });
            }}
          />
        </div>
      </div>
    );
  };

  const dateBodyTemplate = (rowData: RecentActivity) => {
    return format(parseISO(rowData.start_time), 'MMM d, yyyy');
  };

  const timeBodyTemplate = (rowData: RecentActivity) => {
    return (
      <div>
        <div>{format(parseISO(rowData.start_time), 'h:mm a')}</div>
        <div className="text-color-secondary">
          {rowData.end_time ? format(parseISO(rowData.end_time), 'h:mm a') : 'In Progress'}
        </div>
      </div>
    );
  };

  const durationBodyTemplate = (rowData: RecentActivity) => {
    return formatTime(rowData.duration);
  };

  const projectBodyTemplate = (rowData: RecentActivity) => {
    return (
      <div className="flex align-items-center">
        <div 
          className="border-circle mr-2 flex-shrink-0" 
          style={{ 
            backgroundColor: rowData.project_color || '#ccc', 
            width: '0.75rem', 
            height: '0.75rem' 
          }}
        ></div>
        <span>{rowData.project_name}</span>
      </div>
    );
  };

  const taskBodyTemplate = (rowData: RecentActivity) => {
    return rowData.task_name;
  };

  const descriptionBodyTemplate = (rowData: RecentActivity) => {
    return rowData.description || <span className="text-color-secondary">No description</span>;
  };

  const actionsBodyTemplate = (rowData: RecentActivity) => {
    return (
      <div className="flex gap-2 justify-content-center">
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-danger p-button-text"
          tooltip="Delete entry"
          tooltipOptions={{ position: 'top' }}
          onClick={() => confirmDelete(rowData.id, rowData.task_name)}
          loading={deleting === rowData.id}
          disabled={deleting !== null}
        />
      </div>
    );
  };

  const deleteTimeEntry = async (entryId: number) => {
    if (!token) {
      console.error('No authentication token available for deletion');
      toast.current?.show({
        severity: 'error',
        summary: 'Authentication Error',
        detail: 'Please log in again to delete time entries',
        life: 3000
      });
      return;
    }
    
    try {
      setDeleting(entryId);
      
      // First delete from the server
      await axios.delete(`/api/time-entries/${entryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      
      // Then update the TimerContext if needed
      await handleTimerEntryDelete(entryId);
      
      // Finally, update local state by removing the deleted entry
      setRecentActivity(prev => prev.filter(entry => entry.id !== entryId));
      
      // Trigger dashboard refresh
      fetchData();
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('timeEntryDeleted'));
      
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Time entry deleted successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Error deleting time entry:', error);
      
      // Check if it's a network error
      if (axios.isAxiosError(error) && !error.response) {
        toast.current?.show({
          severity: 'error',
          summary: 'Connection Error',
          detail: 'Unable to connect to the server. Please try again later.',
          life: 5000
        });
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.current?.show({
          severity: 'error',
          summary: 'Authentication Error',
          detail: 'Your session has expired. Please log in again.',
          life: 3000
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete time entry. Please try again.',
          life: 3000
        });
      }
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = (entryId: number, taskName: string) => {
    confirmDialog({
      message: `Are you sure you want to delete the time entry for "${taskName}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteTimeEntry(entryId),
      reject: () => { /* do nothing */ }
    });
  };

  const updateTimeEntryDescription = async (entryId: number, description: string) => {
    if (!token) {
      console.error('No authentication token available for updating');
      toast.current?.show({
        severity: 'error',
        summary: 'Authentication Error',
        detail: 'Please log in again to update time entries',
        life: 3000
      });
      return;
    }
    
    try {
      setSavingDescription(true);
      
      // Update the time entry on the server
      await axios.put(`/api/time-entries/${entryId}`, 
        { description },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 5000
        }
      );
      
      // Update local state
      setRecentActivity(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, description } 
            : entry
        )
      );
      
      // Exit edit mode
      setEditingEntry(null);
      setEditingDescription('');
      
      // Show success message
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Time entry description updated successfully',
        life: 3000
      });
    } catch (error) {
      console.error('Error updating time entry:', error);
      
      // Check if it's a network error
      if (axios.isAxiosError(error) && !error.response) {
        toast.current?.show({
          severity: 'error',
          summary: 'Connection Error',
          detail: 'Unable to connect to the server. Please try again later.',
          life: 5000
        });
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast.current?.show({
          severity: 'error',
          summary: 'Authentication Error',
          detail: 'Your session has expired. Please log in again.',
          life: 3000
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update time entry. Please try again.',
          life: 3000
        });
      }
    } finally {
      setSavingDescription(false);
    }
  };

  const rowExpansionTemplate = (data: RecentActivity) => {
    const isEditing = editingEntry === data.id;
    
    const handleEditClick = () => {
      setEditingEntry(data.id);
      setEditingDescription(data.description || '');
    };
    
    const handleCancelEdit = () => {
      setEditingEntry(null);
      setEditingDescription('');
    };
    
    const handleSaveDescription = () => {
      updateTimeEntryDescription(data.id, editingDescription);
    };
    
    return (
      <div className="p-3">
        <h5>Details</h5>
        <div className="grid">
          <div className="col-12 md:col-6">
            <div className="flex flex-column">
              <div className="mb-2">
                <span className="font-semibold mr-2">Task:</span>
                <span>{data.task_name}</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold mr-2">Project:</span>
                <span>{data.project_name}</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold mr-2">Start Time:</span>
                <span>{format(parseISO(data.start_time), 'MMMM d, yyyy h:mm a')}</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold mr-2">End Time:</span>
                <span>
                  {data.end_time 
                    ? format(parseISO(data.end_time), 'MMMM d, yyyy h:mm a')
                    : 'In Progress'}
                </span>
              </div>
            </div>
          </div>
          <div className="col-12 md:col-6">
            <div className="flex flex-column">
              <div className="mb-2">
                <span className="font-semibold mr-2">Duration:</span>
                <span>{formatTime(data.duration)}</span>
              </div>
              <div>
                <div className="flex justify-content-between align-items-center mb-2">
                  <span className="font-semibold">Description:</span>
                  {!isEditing && (
                    <Button 
                      icon="pi pi-pencil" 
                      className="p-button-rounded p-button-text p-button-sm" 
                      onClick={handleEditClick}
                      tooltip="Edit description"
                      tooltipOptions={{ position: 'top' }}
                    />
                  )}
                </div>
                
                {isEditing ? (
                  <div className="flex flex-column">
                    <InputText 
                      value={editingDescription} 
                      onChange={(e) => setEditingDescription(e.target.value)}
                      autoFocus
                      className="mb-2"
                      placeholder="Enter a description"
                    />
                    <div className="flex justify-content-end gap-2 mt-2">
                      <Button 
                        label="Cancel" 
                        icon="pi pi-times" 
                        className="p-button-outlined p-button-sm"
                        onClick={handleCancelEdit}
                        disabled={savingDescription}
                      />
                      <Button 
                        label="Save" 
                        icon="pi pi-check" 
                        className="p-button-sm"
                        onClick={handleSaveDescription}
                        loading={savingDescription}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 border-1 surface-border border-round">
                    {data.description || 'No description provided'}
                  </div>
                )}
              </div>
              
              {!isEditing && (
                <div className="mt-3 flex justify-content-end">
                  <Button
                    label="Delete Entry"
                    icon="pi pi-trash"
                    className="p-button-danger p-button-sm"
                    onClick={() => confirmDelete(data.id, data.task_name)}
                    loading={deleting === data.id}
                    disabled={deleting !== null || savingDescription}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const dateFilterTemplate = (options: ColumnFilterElementTemplateOptions) => {
    return (
      <Calendar
        value={dateRange[0] ? [dateRange[0], dateRange[1]] : null}
        onChange={(e) => {
          if (e.value && Array.isArray(e.value) && e.value.length === 2) {
            onDateRangeChange([e.value[0], e.value[1]]);
            if (options.filterCallback) {
              options.filterCallback();
            }
          }
        }}
        selectionMode="range"
        readOnlyInput
        placeholder="Date Range"
        className="w-full"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <ProgressSpinner style={{ width: '50px', height: '50px' }} />
      </div>
    );
  }

  return (
    <Card>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      <DataTable 
        value={recentActivity}
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="id"
        paginator 
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
        filters={filters}
        filterDisplay="menu"
        globalFilterFields={['task_name', 'project_name', 'description']}
        header={renderHeader()}
        emptyMessage="No time entries found"
        className="p-datatable-sm"
        responsiveLayout="stack"
        breakpoint="768px"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column 
          field="start_time" 
          header="Date" 
          body={dateBodyTemplate}
          sortable
          style={{ minWidth: '8rem' }}
          filter 
          filterField="start_time"
          filterElement={dateFilterTemplate}
          showFilterMatchModes={false}
        />
        <Column 
          header="Time" 
          body={timeBodyTemplate}
          style={{ minWidth: '8rem' }}
        />
        <Column 
          field="project_name" 
          header="Project" 
          body={projectBodyTemplate}
          sortable
          filter
          filterField="project_name"
          style={{ minWidth: '10rem' }}
        />
        <Column 
          field="task_name" 
          header="Task" 
          body={taskBodyTemplate}
          sortable
          filter
          filterField="task_name"
          style={{ minWidth: '10rem' }}
        />
        <Column 
          field="duration" 
          header="Duration" 
          body={durationBodyTemplate}
          sortable
          style={{ minWidth: '8rem' }}
        />
        <Column 
          field="description" 
          header="Description" 
          body={descriptionBodyTemplate}
          style={{ minWidth: '12rem' }}
        />
        <Column 
          body={actionsBodyTemplate}
          headerStyle={{ width: '5rem', textAlign: 'center' }}
          bodyStyle={{ textAlign: 'center' }}
          header="Actions"
          exportable={false}
        />
      </DataTable>
    </Card>
  );
}