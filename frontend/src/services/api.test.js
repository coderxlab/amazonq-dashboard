import axios from 'axios';
import { 
  getUsers, 
  getActivityLogs, 
  getActivitySummary, 
  getPromptLogs,
  getAcceptanceRateTrends
} from './api';

// Mock axios
jest.mock('axios');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue(axios);
  });

  describe('getUsers', () => {
    test('fetches users successfully', async () => {
      const users = ['user1', 'user2'];
      axios.get.mockResolvedValue({ data: users });

      const result = await getUsers();
      
      expect(axios.get).toHaveBeenCalledWith('/users');
      expect(result).toEqual(users);
    });

    test('handles errors', async () => {
      const errorMessage = 'Network Error';
      axios.get.mockRejectedValue(new Error(errorMessage));

      await expect(getUsers()).rejects.toThrow(errorMessage);
    });
  });

  describe('getActivityLogs', () => {
    test('fetches activity logs with no filters', async () => {
      const logs = [{ id: 1 }, { id: 2 }];
      axios.get.mockResolvedValue({ data: logs });

      const result = await getActivityLogs();
      
      expect(axios.get).toHaveBeenCalledWith('/activity', { params: {} });
      expect(result).toEqual(logs);
    });

    test('fetches activity logs with filters', async () => {
      const logs = [{ id: 1 }];
      const filters = {
        userId: 'user1',
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      };
      axios.get.mockResolvedValue({ data: logs });

      const result = await getActivityLogs(filters);
      
      expect(axios.get).toHaveBeenCalledWith('/activity', { params: filters });
      expect(result).toEqual(logs);
    });
  });

  describe('getActivitySummary', () => {
    test('fetches activity summary with no filters', async () => {
      const summary = { totalAICodeLines: 100 };
      axios.get.mockResolvedValue({ data: summary });

      const result = await getActivitySummary();
      
      expect(axios.get).toHaveBeenCalledWith('/activity/summary', { params: {} });
      expect(result).toEqual(summary);
    });

    test('fetches activity summary with filters', async () => {
      const summary = { totalAICodeLines: 50 };
      const filters = {
        userId: 'user1',
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      };
      axios.get.mockResolvedValue({ data: summary });

      const result = await getActivitySummary(filters);
      
      expect(axios.get).toHaveBeenCalledWith('/activity/summary', { params: filters });
      expect(result).toEqual(summary);
    });
  });

  describe('getPromptLogs', () => {
    test('fetches prompt logs with no filters', async () => {
      const logs = { data: [{ id: 1 }], total: 1 };
      axios.get.mockResolvedValue({ data: logs });

      const result = await getPromptLogs();
      
      expect(axios.get).toHaveBeenCalledWith('/prompts', { params: {} });
      expect(result).toEqual(logs);
    });

    test('fetches prompt logs with filters', async () => {
      const logs = { data: [{ id: 1 }], total: 1 };
      const filters = {
        userId: 'user1',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        searchTerm: 'test',
        page: 1,
        limit: 10,
        includeEmpty: true
      };
      axios.get.mockResolvedValue({ data: logs });

      const result = await getPromptLogs(filters);
      
      expect(axios.get).toHaveBeenCalledWith('/prompts', { params: filters });
      expect(result).toEqual(logs);
    });
  });

  describe('getAcceptanceRateTrends', () => {
    test('fetches acceptance rate trends with no filters', async () => {
      const trends = {
        granularity: 'daily',
        currentPeriod: [{ period: '2025-01-01', acceptanceRate: 75 }],
        hasPreviousPeriod: false,
        previousPeriod: []
      };
      axios.get.mockResolvedValue({ data: trends });

      const result = await getAcceptanceRateTrends();
      
      expect(axios.get).toHaveBeenCalledWith('/activity/acceptance-rate-trends', { 
        params: { 
          granularity: 'daily',
          compareWithPrevious: 'false'
        } 
      });
      expect(result).toEqual(trends);
    });

    test('fetches acceptance rate trends with filters', async () => {
      const trends = {
        granularity: 'weekly',
        currentPeriod: [{ period: '2025-W01', acceptanceRate: 75 }],
        hasPreviousPeriod: true,
        previousPeriod: [{ period: '2024-W52', acceptanceRate: 70 }]
      };
      const filters = {
        userId: 'user1',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        granularity: 'weekly',
        compareWithPrevious: true
      };
      axios.get.mockResolvedValue({ data: trends });

      const result = await getAcceptanceRateTrends(filters);
      
      expect(axios.get).toHaveBeenCalledWith('/activity/acceptance-rate-trends', { 
        params: { 
          userId: 'user1',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          granularity: 'weekly',
          compareWithPrevious: 'true'
        } 
      });
      expect(result).toEqual(trends);
    });

    test('handles errors', async () => {
      const errorMessage = 'Network Error';
      axios.get.mockRejectedValue(new Error(errorMessage));

      await expect(getAcceptanceRateTrends()).rejects.toThrow(errorMessage);
    });
  });
});