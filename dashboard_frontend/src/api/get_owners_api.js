/*
API Function: get_owners_api
Handles communication with the backend get_owners endpoint
Provides error handling and data formatting for the owner filter dropdown
*/

import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token if available
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login if needed
      localStorage.removeItem('authToken');
      // Could redirect to login page here
    }
    return Promise.reject(error);
  }
);

/**
 * Fetches all unique owners from the backend API
 * @returns {Promise<Object>} Promise that resolves to the API response
 */
export const getOwners = async () => {
  try {
    console.log('API: Fetching owners from backend...');
    
    // Make POST request to get_owners endpoint
    const response = await apiClient.post('/get_owners', {});
    
    console.log('API: Owners fetched successfully');
    console.log(`API: Retrieved ${response.data.total_count} owners`);
    
    // Check if the response indicates success
    if (response.data.return_code === 'SUCCESS') {
      return {
        success: true,
        data: response.data,
        owners: response.data.owners,
        totalCount: response.data.total_count
      };
    } else {
      // Backend returned an error code
      throw new Error(response.data.message || 'Unknown error from server');
    }
    
  } catch (error) {
    console.error('API: Error fetching owners:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || 'Server error occurred';
      const returnCode = error.response.data?.return_code || 'SERVER_ERROR';
      
      return {
        success: false,
        error: errorMessage,
        returnCode: returnCode,
        status: error.response.status
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        error: 'Unable to connect to server. Please check your connection.',
        returnCode: 'CONNECTION_ERROR'
      };
    } else {
      // Something else happened
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
        returnCode: 'UNKNOWN_ERROR'
      };
    }
  }
};

export default {
  getOwners
};
