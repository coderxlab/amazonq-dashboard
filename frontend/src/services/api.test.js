import { getComparativeMetrics, _api } from './api';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn()
  }))
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getComparativeMetrics', () => {
    it('fetches comparative metrics successfully', async () => {
      const mockResponse = {
        data: {
          current: {
            aiCodeLines: 100,
            chatInteractions: 50
          },
          previous: {
            aiCodeLines: 80,
            chatInteractions: 40
          },
          changes: {
            aiCodeLines: 25,
            chatInteractions: 25
          }
        }
      };

      _api.get.mockResolvedValueOnce(mockResponse);

      const filters = {
        userIds: ['user1', 'user2'],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31'
      };

      const result = await getComparativeMetrics(filters);

      expect(result).toEqual(mockResponse.data);
      expect(_api.get).toHaveBeenCalledWith('/activity/compare', {
        params: {
          userIds: 'user1,user2',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          compareStartDate: '2023-12-01',
          compareEndDate: '2023-12-31'
        }
      });
    });

    it('handles errors when fetching comparative metrics', async () => {
      const mockError = new Error('API Error');
      _api.get.mockRejectedValueOnce(mockError);

      await expect(getComparativeMetrics({})).rejects.toThrow('API Error');
    });
  });
});