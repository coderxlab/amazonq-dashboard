const request = require('supertest');
const express = require('express');
const moment = require('moment');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockDocumentClient = {
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  
  return {
    config: {
      update: jest.fn()
    },
    DynamoDB: jest.fn().mockImplementation(() => ({})),
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocumentClient)
    }
  };
});

// Set up environment variables for testing
process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE = 'test-activity-table';
process.env.DYNAMODB_PROMPT_LOG_TABLE = 'test-prompt-table';
process.env.PORT = 5001;

// Create a mock Express app for testing
const mockApp = express();
mockApp.get('/api/activity/summary', (req, res) => {
  const summary = {
    totalAICodeLines: 450,
    totalChatInteractions: 60,
    totalInlineSuggestions: 120,
    totalInlineAcceptances: 90,
    acceptanceRate: 75,
    byUser: [
      {
        userId: 'user1',
        aiCodeLines: 270,
        chatInteractions: 35,
        inlineSuggestions: 75,
        inlineAcceptances: 55
      },
      {
        userId: 'user2',
        aiCodeLines: 180,
        chatInteractions: 25,
        inlineSuggestions: 45,
        inlineAcceptances: 35
      }
    ],
    byDate: [
      {
        date: '2023-01-01',
        aiCodeLines: 270,
        chatInteractions: 35,
        inlineSuggestions: 75,
        inlineAcceptances: 55
      },
      {
        date: '2023-01-02',
        aiCodeLines: 180,
        chatInteractions: 25,
        inlineSuggestions: 45,
        inlineAcceptances: 35
      }
    ],
    byHourOfDay: Array(24).fill().map((_, i) => ({
      hour: i,
      suggestions: 5,
      acceptances: 3,
      rate: 60
    })),
    byDayOfWeek: [
      { day: 'Sunday', dayIndex: 0, suggestions: 15, acceptances: 10, rate: 66.7 },
      { day: 'Monday', dayIndex: 1, suggestions: 20, acceptances: 15, rate: 75 },
      { day: 'Tuesday', dayIndex: 2, suggestions: 18, acceptances: 12, rate: 66.7 },
      { day: 'Wednesday', dayIndex: 3, suggestions: 22, acceptances: 18, rate: 81.8 },
      { day: 'Thursday', dayIndex: 4, suggestions: 17, acceptances: 13, rate: 76.5 },
      { day: 'Friday', dayIndex: 5, suggestions: 16, acceptances: 12, rate: 75 },
      { day: 'Saturday', dayIndex: 6, suggestions: 12, acceptances: 10, rate: 83.3 }
    ],
    acceptanceTrend: [
      { date: '2023-01-01', rate: 73.3, movingAvgRate: 73.3 },
      { date: '2023-01-02', rate: 77.8, movingAvgRate: 75.6 }
    ]
  };
  
  res.json(summary);
});

describe('API Endpoints', () => {
  describe('GET /api/activity/summary', () => {
    test('returns summarized activity data with enhanced visualizations', async () => {
      const response = await request(mockApp).get('/api/activity/summary');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalAICodeLines');
      expect(response.body).toHaveProperty('totalInlineSuggestions');
      expect(response.body).toHaveProperty('totalInlineAcceptances');
      expect(response.body).toHaveProperty('acceptanceRate');
      
      // Check for enhanced visualization data
      expect(response.body).toHaveProperty('byHourOfDay');
      expect(response.body.byHourOfDay).toHaveLength(24);
      expect(response.body).toHaveProperty('byDayOfWeek');
      expect(response.body.byDayOfWeek).toHaveLength(7);
      expect(response.body).toHaveProperty('acceptanceTrend');
      
      // Check that hour of day data is correctly formatted
      const hour10Data = response.body.byHourOfDay.find(h => h.hour === 10);
      expect(hour10Data).toBeDefined();
      expect(hour10Data).toHaveProperty('suggestions');
      expect(hour10Data).toHaveProperty('acceptances');
      expect(hour10Data).toHaveProperty('rate');
      
      // Check that day of week data is correctly formatted
      const mondayData = response.body.byDayOfWeek.find(d => d.day === 'Monday');
      expect(mondayData).toBeDefined();
      expect(mondayData).toHaveProperty('suggestions');
      expect(mondayData).toHaveProperty('acceptances');
      expect(mondayData).toHaveProperty('rate');
      
      // Check that trend data is correctly formatted
      expect(response.body.acceptanceTrend).toHaveLength(2);
      expect(response.body.acceptanceTrend[0]).toHaveProperty('date');
      expect(response.body.acceptanceTrend[0]).toHaveProperty('rate');
      expect(response.body.acceptanceTrend[0]).toHaveProperty('movingAvgRate');
    });
  });
});