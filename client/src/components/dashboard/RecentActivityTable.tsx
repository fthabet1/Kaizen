/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContexts';
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
  const { user } = useAuth();
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activityResponse, projectsResponse] = await Promise.all([
        axios.get('/api/time-entries?limit=50'),
        axios.get('/api/projects')
      ]);
      
      setRecentActivity(activityResponse.data);
      setProjects(projectsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load recent activity data',
        life: 3000
      });
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
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText 
              value={globalFilterValue} 
              onChange={onGlobalFilterChange} 
              placeholder="Search" 
              className="w-full"
            />
          </span>
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

  const rowExpansionTemplate = (data: RecentActivity) => {
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
                <span className="font-semibold mb-2">Description:</span>
                <div className="p-2 border-1 surface-border border-round mt-2">
                  {data.description || 'No description provided'}
                </div>
              </div>
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

  const navigateToTask = (taskId: number) => {
    router.push(`/tasks/${taskId}`);
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
      
      <DataTable 
        value={recentActivity}
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        onRowClick={(e) => navigateToTask(e.data.task_id)}
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
      </DataTable>
    </Card>
  );
}