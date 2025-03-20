import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

axios.defaults.baseURL = API_URL;

axios.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`, 
                config.params ? `Params: ${JSON.stringify(config.params)}` : '');
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}: Status ${response.status}`);
    return response;
  },
  async (error) => {
    const { config, response } = error;
    
    if (response) {
      console.error(`API Error: ${response.status} ${response.statusText} for ${config?.url}`, 
                   response.data || 'No error details provided');
    } else if (error.request) {
      console.error(`API Request failed (no response): ${config?.url}`, error.message);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    if (response && response.status === 401) {
      console.error('Authentication error - user may need to log in again');
      const authErrorEvent = new CustomEvent('authError', { 
        detail: { message: 'Your session has expired. Please log in again.' } 
      });
      window.dispatchEvent(authErrorEvent);
    }
    
    if (error.message === 'Network Error' || !response) {
      console.error('Network error or server unavailable - check server connection');
      
      const networkErrorEvent = new CustomEvent('apiConnectionError', { 
        detail: { message: 'Unable to connect to the server. Please check your connection.' } 
      });
      window.dispatchEvent(networkErrorEvent);
    }
    
    return Promise.reject(error);
  }
);

export default axios;