const request = require('supertest');
const express = require('express');
const AWS = require('aws-sdk');
const moment = require('moment');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockDocClient = {
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  return {
    DynamoDB: jest.fn(() => ({
      // Mock methods if needed
    })),
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocClient)
    },
    config: {
      update: jest.fn()
    }
  };
});

// Import server after mocking AWS
const app = require('./server');

describe('API Endpoints', () => {
  let mockDocClient;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get reference to mock DocumentClient
    mockDocClient = new AWS.DynamoDB.DocumentClient();
  });
  
  describe('GET /api/activity/acceptance-rate-trends', () => {
    const mockActivityData = [
      {
        UserId: 'user1',
        Date: '2025-01-01',
        Inline_AcceptanceCount: 75,
        Inline_SuggestionsCount: 100
      },
      {
        UserId: 'user1',
        Date: '2025-01-02',
        Inline_AcceptanceCount: 80,
        Inline_SuggestionsCount: 100
      },
      {
        UserId: 'user2',
        Date: '2025-01-01',
        Inline_AcceptanceCount: 60,
        Inline_SuggestionsCount: 100
      }
    ];
    
    test('returns acceptance rate trends with daily granularity', async () => {
      mockDocClient.promise.mockResolvedValue({ Items: mockActivityData });
      
      const response = await request(app)
        .get('/api/activity/acceptance-rate-trends')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-02',
          granularity: 'daily'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.granularity).toBe('daily');
      expect(response.body.currentPeriod).toHaveLength(2);
      expect(response.body.currentPeriod[0].period).toBe('2025-01-01');
      expect(response.body.currentPeriod[0].acceptanceRate).toBe(67.5); // (75+60)/(100+100) = 67.5%
      expect(response.body.currentPeriod[1].period).toBe('2025-01-02');
      expect(response.body.currentPeriod[1].acceptanceRate).toBe(80); // 80/100 = 80%
    });
    
    test('returns acceptance rate trends with weekly granularity', async () => {
      mockDocClient.promise.mockResolvedValue({ Items: mockActivityData });
      
      const response = await request(app)
        .get('/api/activity/acceptance-rate-trends')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-07',
          granularity: 'weekly'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.granularity).toBe('weekly');
      
      // All data should be grouped into one week
      expect(response.body.currentPeriod).toHaveLength(1);
      
      // The week key format depends on the implementation
      expect(response.body.currentPeriod[0].period).toContain('2025');
      expect(response.body.currentPeriod[0].acceptanceRate).toBe(71.67); // (75+80+60)/(100+100+100) = 71.67%
    });
    
    test('returns acceptance rate trends with monthly granularity', async () => {
      mockDocClient.promise.mockResolvedValue({ Items: mockActivityData });
      
      const response = await request(app)
        .get('/api/activity/acceptance-rate-trends')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          granularity: 'monthly'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.granularity).toBe('monthly');
      
      // All data should be grouped into one month
      expect(response.body.currentPeriod).toHaveLength(1);
      expect(response.body.currentPeriod[0].period).toBe('2025-01');
      expect(response.body.currentPeriod[0].acceptanceRate).toBe(71.67); // (75+80+60)/(100+100+100) = 71.67%
    });
    
    test('includes previous period data when requested', async () => {
      const previousPeriodData = [
        {
          UserId: 'user1',
          Date: '2024-12-30',
          Inline_AcceptanceCount: 65,
          Inline_SuggestionsCount: 100
        },
        {
          UserId: 'user1',
          Date: '2024-12-31',
          Inline_AcceptanceCount: 70,
          Inline_SuggestionsCount: 100
        }
      ];
      
      mockDocClient.promise.mockResolvedValue({ 
        Items: [...mockActivityData, ...previousPeriodData] 
      });
      
      const response = await request(app)
        .get('/api/activity/acceptance-rate-trends')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-02',
          granularity: 'daily',
          compareWithPrevious: 'true'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.hasPreviousPeriod).toBe(true);
      expect(response.body.previousPeriod).toHaveLength(2);
      expect(response.body.previousPeriod[0].period).toBe('2024-12-30');
      expect(response.body.previousPeriod[0].acceptanceRate).toBe(65);
      expect(response.body.previousPeriod[1].period).toBe('2024-12-31');
      expect(response.body.previousPeriod[1].acceptanceRate).toBe(70);
    });
    
    test('filters by user ID when provided', async () => {
      mockDocClient.promise.mockResolvedValue({ Items: mockActivityData });
      
      const response = await request(app)
        .get('/api/activity/acceptance-rate-trends')
        .query({
          userId: 'user1',
          startDate: '2025-01-01',
          endDate: '2025-01-02',
          granularity: 'daily'
        });
      
      expect(response.status).toBe(200);
      expect(mockDocClient.scan).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'UserId = :userId',
          ExpressionAttributeValues: { ':userId': 'user1' }
        })
      );
    });
    
    test('handles errors gracefully', async () => {
      mockDocClient.promise.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/activity/acceptance-rate-trends')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-01-02'
        });
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch acceptance rate trends');
    });
  });
});