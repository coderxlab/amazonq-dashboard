import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

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
    console.log("here in getComparativeMetrics")
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

// Export the api instance for testing
export const _api = api;