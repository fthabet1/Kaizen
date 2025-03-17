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