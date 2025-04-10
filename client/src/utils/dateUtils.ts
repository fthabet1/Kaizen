/**
 * Utility functions for date handling
 */

import { format } from 'date-fns';

/**
 * Formats time in seconds to a readable format
 * @param seconds Total seconds to format
 * @returns Formatted time string (e.g. "2h 30m")
 */
export const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0h 0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
  }
  return `${minutes}m`;
};

/**
 * Parses an ISO date string from the database (which is in UTC)
 * and creates a Date object representing that moment in time
 * 
 * @param isoString The ISO date string to parse (usually with Z suffix)
 * @returns A Date object representing the same moment in time
 */
export const parseISOWithTimezone = (isoString: string): Date => {
  // Check for valid input
  if (!isoString) {
    console.error('Empty date string provided');
    return new Date(); // Return current time as fallback
  }
  
  try {
    // Ensure the string has a Z suffix for UTC if not already specified
    const utcString = isoString.endsWith('Z') 
      ? isoString 
      : isoString.includes('T') 
        ? (isoString.includes('+') || isoString.includes('-') ? isoString : `${isoString}Z`)
        : `${isoString}T00:00:00Z`;
        
    // Create Date object - JS Date inherently stores time in UTC internally
    // but will display it in local timezone when using toString(), getHours(), etc.
    const date = new Date(utcString);
    const timeDiff = date.getTimezoneOffset();

    if (timeDiff !== 0) {
        if(timeDiff > 0) {
            date.setHours(date.getHours() - timeDiff / 60);
        } else {
            date.setHours(date.getHours() + timeDiff / 60);
        }
    }

    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error, 'for string:', isoString);
    return new Date(); // Return current time as fallback
  }
};

/**
 * Converts a Date to a UTC ISO string for sending to the server
 * @param date Date to convert to UTC ISO string
 * @returns UTC ISO string (with Z suffix)
 */
export const toUTCString = (date: Date): string => {
  return date.toISOString(); // This automatically converts to UTC with Z suffix
};

/**
 * Gets the current user's timezone offset in minutes
 * @returns Timezone offset in minutes (e.g. -240 for EDT, positive for west of UTC)
 */
export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

/**
 * Gets the user's local timezone name
 * @returns Timezone name from the browser
 */
export const getLocalTimezoneName = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Formats a Date object for display in the user's local timezone
 * @param date Date object to format
 * @param formatStr Format string (e.g. 'MMM d, yyyy h:mm a')
 * @returns Formatted date string in local timezone
 */
export const formatDateForDisplay = (date: Date | null, formatStr: string): string => {
  if (!date) return '';
  
  try {
    // Get browser timezone information
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Use Intl.DateTimeFormat for reliable timezone-aware formatting
    if (formatStr === 'h:mm a, MMMM d, yyyy') {
      // Match the specific format used in the app
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: browserTimezone
      }).format(date);
      
      return formatted;
    }
    
    // Fallback to date-fns format for other format strings
    // date-fns format() uses the local timezone by default
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return 'Invalid date';
  }
};

// Re-export format and parseISO from date-fns for convenience
export { parseISO } from 'date-fns'; 