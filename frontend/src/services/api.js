import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Get activity summary with optional filters
export const getActivitySummary = async (filters = {}) => {
  try {
    const { userId, startDate, endDate } = filters;
    let url = `${API_URL}/activity/summary`;
    
    // Add query parameters if filters are provided
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    throw error;
  }
};

// Get comparative metrics between two periods
export const getComparativeMetrics = async (params = {}) => {
  try {
    const { startDate, endDate, compareStartDate, compareEndDate, userIds } = params;
    let url = `${API_URL}/activity/compare`;
    
    // Add query parameters
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (compareStartDate) queryParams.append('compareStartDate', compareStartDate);
    if (compareEndDate) queryParams.append('compareEndDate', compareEndDate);
    if (userIds) queryParams.append('userIds', userIds);
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching comparative metrics:', error);
    throw error;
  }
};

// Get productivity trends data
export const getProductivityTrends = async (params = {}) => {
  try {
    const { userId, startDate, endDate, interval = 'day' } = params;
    let url = `${API_URL}/trends/productivity`;
    
    // Add query parameters
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append('userId', userId);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (interval) queryParams.append('interval', interval);
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching productivity trends:', error);
    throw error;
  }
};

// Export trend data as CSV
export const exportTrendData = async (params = {}) => {
  try {
    const { type, userId, startDate, endDate, interval = 'day' } = params;
    
    // Validate required parameters
    if (!type || !startDate || !endDate) {
      throw new Error('Type, start date, and end date are required for export');
    }
    
    let url = `${API_URL}/trends/export`;
    
    // Add query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('type', type);
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
    if (userId) queryParams.append('userId', userId);
    if (interval) queryParams.append('interval', interval);
    
    url += `?${queryParams.toString()}`;
    
    const response = await axios.get(url, { responseType: 'blob' });
    return response.data;
  } catch (error) {
    console.error('Error exporting trend data:', error);
    throw error;
  }
};

// Get prompt logs with optional filtering
export const getPromptLogs = async (params = {}) => {
  try {
    const { userId, startDate, endDate, searchTerm, limit, page, includeEmpty } = params;
    let url = `${API_URL}/prompts`;
    
    // Add query parameters
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append('userId', userId);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (searchTerm) queryParams.append('searchTerm', searchTerm);
    if (limit) queryParams.append('limit', limit);
    if (page) queryParams.append('page', page);
    if (includeEmpty !== undefined) queryParams.append('includeEmpty', includeEmpty);
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching prompt logs:', error);
    throw error;
  }
};

// Get subscription metrics
export const getSubscriptionMetrics = async () => {
  try {
    const response = await axios.get(`${API_URL}/subscriptions/metrics`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    throw error;
  }
};

// Get all subscriptions
export const getSubscriptions = async () => {
  try {
    const response = await axios.get(`${API_URL}/subscriptions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

export default {
  getActivitySummary,
  getComparativeMetrics,
  getPromptLogs,
  getSubscriptionMetrics,
  getSubscriptions,
  getProductivityTrends,
  exportTrendData
};
