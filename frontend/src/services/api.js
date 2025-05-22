import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service functions
export const getUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getActivityLogs = async (filters = {}) => {
  try {
    const { userId, startDate, endDate } = filters;
    const params = {};
    
    if (userId) params.userId = userId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/activity', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }
};

export const getActivitySummary = async (filters = {}) => {
  try {
    const { userId, startDate, endDate } = filters;
    const params = {};
    
    if (userId) params.userId = userId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/activity/summary', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    throw error;
  }
};

export const getComparativeMetrics = async (filters = {}) => {
  try {
    const { userIds, startDate, endDate, compareStartDate, compareEndDate } = filters;
    const params = {};
    
    if (userIds) params.userIds = Array.isArray(userIds) ? userIds.join(',') : userIds;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (compareStartDate) params.compareStartDate = compareStartDate;
    if (compareEndDate) params.compareEndDate = compareEndDate;
    
    const response = await api.get('/activity/compare', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching comparative metrics:', error);
    throw error;
  }
};

export const getPromptLogs = async (filters = {}) => {
  try {
    const { userId, startDate, endDate, searchTerm, page, limit, includeEmpty } = filters;
    const params = {};
    
    if (userId) params.userId = userId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (searchTerm) params.searchTerm = searchTerm;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (includeEmpty !== undefined) params.includeEmpty = includeEmpty;
    
    const response = await api.get('/prompts', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching prompt logs:', error);
    throw error;
  }
};

// New trend analysis API functions
export const getProductivityTrends = async (filters = {}) => {
  try {
    const { userId, startDate, endDate, interval = 'day' } = filters;
    const params = {};
    
    if (userId) params.userId = userId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (interval) params.interval = interval;
    
    const response = await api.get('/trends/productivity', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching productivity trends:', error);
    throw error;
  }
};

export const getAdoptionComparison = async (filters = {}) => {
  try {
    const { userId, daysBeforeAfter } = filters;
    const params = {};
    
    if (!userId) {
      throw new Error('User ID is required for adoption comparison');
    }
    
    params.userId = userId;
    if (daysBeforeAfter) params.daysBeforeAfter = daysBeforeAfter;
    
    const response = await api.get('/trends/adoption', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching adoption comparison:', error);
    throw error;
  }
};

export const getCorrelationAnalysis = async (filters = {}) => {
  try {
    const { startDate, endDate, metric = 'aiCodeLines' } = filters;
    const params = {};
    
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required for correlation analysis');
    }
    
    params.startDate = startDate;
    params.endDate = endDate;
    if (metric) params.metric = metric;
    
    const response = await api.get('/trends/correlation', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching correlation analysis:', error);
    throw error;
  }
};

export const exportTrendData = async (filters = {}) => {
  try {
    const { type, userId, startDate, endDate } = filters;
    const params = {};
    
    if (!type || !startDate || !endDate) {
      throw new Error('Type, start date, and end date are required for export');
    }
    
    params.type = type;
    params.startDate = startDate;
    params.endDate = endDate;
    if (userId) params.userId = userId;
    
    // Use axios directly for blob response
    const response = await axios({
      url: `${API_URL}/trends/export`,
      method: 'GET',
      params,
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}-trends-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return true;
  } catch (error) {
    console.error('Error exporting trend data:', error);
    throw error;
  }
};

// Export the api instance for testing
export const _api = api;