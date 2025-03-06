import { format, formatDistanceToNow, addSeconds, formatDuration, intervalToDuration } from 'date-fns';

/**
 * Format time in seconds to human-readable format (e.g., "2h 30m")
 */
export const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
  }
  return `${minutes}m`;
};

/**
 * Format time in seconds to detailed format (e.g., "2 hours 30 minutes 15 seconds")
 */
export const formatTimeDetailed = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0 seconds';
  
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  
  return formatDuration(duration, {
    format: ['hours', 'minutes', 'seconds'],
    zero: false,
    delimiter: ' '
  });
};

/**
 * Format time in seconds to HH:MM:SS format
 */
export const formatTimeHHMMSS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

/**
 * Format a date object to a readable date string based on user's settings
 */
export const formatDate = (
  date: Date | string, 
  formatStr: string = 'MMM d, yyyy'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
};

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Add seconds to current date and return the new date
 */
export const addSecondsToNow = (seconds: number): Date => {
  return addSeconds(new Date(), seconds);
};

/**
 * Format a time period between two dates
 */
export const formatTimePeriod = (
  startDate: Date | string, 
  endDate: Date | string
): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
  
  if (sameDay) {
    return `${format(start, 'MMM d, yyyy')} ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  }
  
  return `${format(start, 'MMM d, yyyy h:mm a')} - ${format(end, 'MMM d, yyyy h:mm a')}`;
};

/**
 * Calculate duration in seconds between two dates
 */
export const calculateDuration = (
  startDate: Date | string, 
  endDate: Date | string
): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  return Math.floor((end.getTime() - start.getTime()) / 1000);
};

// client/src/utils/colorUtils.ts

/**
 * Lighten a color by a certain percentage
 */
export const lightenColor = (color: string, percent: number): string => {
  // Convert hex to RGB
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);

  // Lighten color
  r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Darken a color by a certain percentage
 */
export const darkenColor = (color: string, percent: number): string => {
  // Convert hex to RGB
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);

  // Darken color
  r = Math.max(0, Math.round(r * (1 - percent / 100)));
  g = Math.max(0, Math.round(g * (1 - percent / 100)));
  b = Math.max(0, Math.round(b * (1 - percent / 100)));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Get a contrasting text color (black or white) based on background color
 */
export const getContrastColor = (hexColor: string): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  
  // Calculate luminance - https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for bright colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Generate a random color
 */
export const generateRandomColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

/**
 * A set of predefined colors for projects and tags
 */
export const colorOptions = [
  '#0EA5E9', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#000000', // Black
];

// client/src/utils/exportUtils.ts

/**
 * Export data as CSV
 */
export const exportAsCSV = <T extends Record<string, unknown>>(data: T[], fileName: string): void => {
    if (!data || data.length === 0) return;
    
    // Convert data to CSV format
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header as keyof T];
          // Handle special characters and commas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

/**
 * Export data as JSON
 */
export const exportAsJSON = <T>(data: T, fileName: string): void => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.json`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
