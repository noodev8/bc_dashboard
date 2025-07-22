/**
 * API functions for fetching brands data from the backend
 *
 * This module provides functions to interact with the brands API endpoints.
 * All functions return promises and handle errors appropriately.
 */

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Fetches all available brands from the backend API
 * @returns {Promise<Object>} Promise that resolves to the API response
 */
export const getBrands = async () => {
  try {
    console.log('API: Fetching brands from backend...');
    
    const response = await fetch(`${API_BASE_URL}/get_brands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`API: Successfully fetched ${data.brands?.length || 0} brands`);
    
    return data;
  } catch (error) {
    console.error('API: Error fetching brands:', error);
    throw error;
  }
};
