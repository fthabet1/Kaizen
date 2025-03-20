import axios from './axiosConfig';

// Interval between server availability checks (in ms)
const CHECK_INTERVAL = 10000; // 10 seconds

interface ServerCheckOptions {
  onServerAvailable?: () => void;
  onServerUnavailable?: () => void;
  maxRetries?: number;
}

/**
 * Starts checking if the API server is available and retries at regular intervals
 * 
 * @param options Configuration options for the server check
 * @returns A function to stop the server check
 */
export const startServerAvailabilityCheck = (options: ServerCheckOptions = {}) => {
  const { 
    onServerAvailable, 
    onServerUnavailable,
    maxRetries = Infinity
  } = options;
  
  let checkCount = 0;
  let intervalId: number | null = null;
  let isChecking = false;
  
  const checkServer = async () => {
    if (isChecking) return; // Prevent overlapping checks
    
    isChecking = true;
    checkCount++;
    
    try {
      // Use the health endpoint to check server availability
      const response = await axios.get('/api/health', { 
        timeout: 3000,
        // Don't trigger global error handlers
        validateStatus: () => true 
      });
      
      if (response.status === 200) {
        console.log('API server is available');
        if (onServerAvailable) onServerAvailable();
        
        // Server is available, stop checking
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        console.warn(`API server returned status ${response.status}`);
        if (onServerUnavailable) onServerUnavailable();
      }
    } catch (error) {
      console.error('API server is unavailable:', error);
      if (onServerUnavailable) onServerUnavailable();
    } finally {
      isChecking = false;
      
      // If we've reached max retries, stop checking
      if (checkCount >= maxRetries && intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
  
  // Check immediately on start
  checkServer();
  
  // Set up regular checking
  intervalId = window.setInterval(checkServer, CHECK_INTERVAL);
  
  // Return a function to stop checking
  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}; 