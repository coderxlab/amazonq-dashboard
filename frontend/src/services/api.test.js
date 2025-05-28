import axios from 'axios';
import { getComparativeMetrics } from './api';

jest.mock('axios');

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

      axios.get.mockResolvedValueOnce(mockResponse);

      const filters = {
        userIds: ['user1', 'user2'],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31'
      };

      const result = await getComparativeMetrics(filters);

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:5000/activity/compare?startDate=2024-01-01&endDate=2024-01-31&compareStartDate=2023-12-01&compareEndDate=2023-12-31&userIds=user1%2Cuser2'
      );
    });

    it('handles errors when fetching comparative metrics', async () => {
      const mockError = new Error('API Error');
      axios.get.mockRejectedValueOnce(mockError);

      await expect(getComparativeMetrics({})).rejects.toThrow('API Error');
    });
  });
});