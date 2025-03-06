export interface User {
    id: number;
    auth_id: string;
    email: string;
    name: string | null;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface CreateUserDto {
    auth_id: string;
    email: string;
    name?: string;
  }
  
  // Project types
  export interface Project {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    color: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface CreateProjectDto {
    name: string;
    description?: string;
    color?: string;
  }
  
  export interface UpdateProjectDto {
    name?: string;
    description?: string;
    color?: string;
    is_active?: boolean;
  }
  
  // Task types
  export interface Task {
    id: number;
    project_id: number;
    user_id: number;
    name: string;
    description: string | null;
    is_completed: boolean;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface CreateTaskDto {
    project_id: number;
    name: string;
    description?: string;
  }
  
  export interface UpdateTaskDto {
    project_id?: number;
    name?: string;
    description?: string;
    is_completed?: boolean;
  }
  
  // Time Entry types
  export interface TimeEntry {
    id: number;
    task_id: number;
    user_id: number;
    start_time: Date;
    end_time: Date | null;
    duration: number | null;
    description: string | null;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface CreateTimeEntryDto {
    task_id: number;
    start_time: Date;
    end_time?: Date;
    duration?: number;
    description?: string;
  }
  
  export interface UpdateTimeEntryDto {
    task_id?: number;
    start_time?: Date;
    end_time?: Date;
    duration?: number;
    description?: string;
  }
  
  // Tag types
  export interface Tag {
    id: number;
    user_id: number;
    name: string;
    color: string;
    created_at: Date;
  }
  
  export interface CreateTagDto {
    name: string;
    color?: string;
  }
  
  // Statistics types
  export interface UserStats {
    totalTrackedTime: number; // in seconds
    projectStats: ProjectStats[];
    dailyStats: DailyStats[];
    weeklyStats: WeeklyStats[];
  }
  
  export interface ProjectStats {
    id: number;
    name: string;
    color: string;
    totalTime: number; // in seconds
    percentage: number;
  }
  
  export interface DailyStats {
    date: string;
    totalTime: number; // in seconds
  }
  
  export interface WeeklyStats {
    weekStart: string;
    totalTime: number; // in seconds
  }
  