/*
API Function: get_products_api
Handles communication with the backend get_products endpoint
Provides error handling and data formatting for the products dashboard
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
 * Fetches all products from the backend API
 * @returns {Promise<Object>} Promise that resolves to the API response
 */
export const getProducts = async () => {
  try {
    console.log('API: Fetching products from backend...');
    
    // Make POST request to get_products endpoint
    const response = await apiClient.post('/get_products', {});
    
    console.log('API: Products fetched successfully');
    console.log(`API: Retrieved ${response.data.total_count} products`);
    
    // Check if the response indicates success
    if (response.data.return_code === 'SUCCESS') {
      return {
        success: true,
        data: response.data,
        products: response.data.products,
        totalCount: response.data.total_count
      };
    } else {
      // Backend returned an error code
      throw new Error(response.data.message || 'Unknown error from server');
    }
    
  } catch (error) {
    console.error('API: Error fetching products:', error);
    
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
  getProducts
};
