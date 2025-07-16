/*
API Function: get_product_details_api
Handles communication with the backend get_product_details endpoint
Provides error handling and data formatting for individual product details
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

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Fetches detailed information for a specific product by groupid
 * @param {string} groupid - The product group identifier
 * @returns {Promise<Object>} Promise that resolves to the API response
 */
export const getProductDetails = async (groupid) => {
  try {
    console.log(`API: Fetching product details for groupid: ${groupid}`);

    // Validate groupid parameter
    if (!groupid) {
      throw new Error('groupid parameter is required');
    }

    // Make POST request to get_product_details endpoint
    const response = await apiClient.post('/get_product_details', { groupid });
    
    console.log('API: Product details fetched successfully');
    
    // Check if the response indicates success
    if (response.data.return_code === 'SUCCESS') {
      return {
        success: true,
        data: response.data,
        product: response.data.product
      };
    } else if (response.data.return_code === 'PRODUCT_NOT_FOUND') {
      // Product not found
      return {
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: response.data.message || 'Product not found'
      };
    } else {
      // Other backend error codes
      throw new Error(response.data.message || 'Unknown error from server');
    }
    
  } catch (error) {
    console.error('API: Error fetching product details:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 404) {
        return {
          success: false,
          error: 'PRODUCT_NOT_FOUND',
          message: data.message || 'Product not found'
        };
      } else if (status === 400) {
        return {
          success: false,
          error: 'BAD_REQUEST',
          message: data.message || 'Invalid request parameters'
        };
      } else {
        return {
          success: false,
          error: 'SERVER_ERROR',
          message: data.message || `Server error (${status})`
        };
      }
    } else if (error.request) {
      // Network error
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your connection.'
      };
    } else {
      // Other error
      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred'
      };
    }
  }
};
