const request = require('supertest');
const express = require('express');
const AWS = require('aws-sdk');
const moment = require('moment');

// Mock AWS DynamoDB
jest.mock('aws-sdk', () => {
  const mockDocClient = {
    scan: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  return {
    DynamoDB: jest.fn(),
    config: {
      update: jest.fn()
    },
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocClient)
    }
  };
});

// Import server after mocking AWS
const app = require('./server');
const docClient = new AWS.DynamoDB.DocumentClient();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  docClient.scan.mockReturnThis();
  docClient.query.mockReturnThis();
});

// Set up environment variables for testing
process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE = 'test-activity-table';
process.env.DYNAMODB_PROMPT_LOG_TABLE = 'test-prompt-table';
process.env.PORT = 5001;

// Create a mock Express app for testing
const mockApp = express();

describe('GET /api/activity/compare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return comparative metrics for two periods', async () => {
    // Mock data for current period
    const mockCurrentItems = [
      {
        UserId: 'user1',
        Date: '2024-01-01',
        Chat_AICodeLines: '10',
        Inline_AICodeLines: '5',
        Chat_MessagesInteracted: '3',
        Inline_SuggestionsCount: '8',
        Inline_AcceptanceCount: '6'
      }
    ];

    // Mock data for previous period
    const mockPreviousItems = [
      {
        UserId: 'user1',
        Date: '2023-12-01',
        Chat_AICodeLines: '8',
        Inline_AICodeLines: '4',
        Chat_MessagesInteracted: '2',
        Inline_SuggestionsCount: '5',
        Inline_AcceptanceCount: '3'
      }
    ];

    // Mock query responses for both periods
    docClient.promise
      .mockResolvedValueOnce({ Items: mockCurrentItems })   // First query (current period)
      .mockResolvedValueOnce({ Items: mockPreviousItems }); // Second query (previous period)

    const response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31',
        userIds: 'user1'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('current');
    expect(response.body).toHaveProperty('previous');
    expect(response.body.current).toEqual({
      aiCodeLines: 15,
      chatInteractions: 3,
      inlineSuggestions: 8,
      inlineAcceptances: 6
    });
    expect(response.body.previous).toEqual({
      aiCodeLines: 12,
      chatInteractions: 2,
      inlineSuggestions: 5,
      inlineAcceptances: 3
    });

    // Verify query parameters
    expect(docClient.query).toHaveBeenCalledWith({
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      KeyConditionExpression: 'UserId = :userId AND #date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      },
      ExpressionAttributeValues: {
        ':userId': 'user1',
        ':startDate': '2024-01-01',
        ':endDate': '2024-01-31'
      }
    });
  });

  it('should handle multiple user IDs', async () => {
    // Mock data for multiple users
    const mockItems = [
      {
        UserId: 'user1',
        Date: '2024-01-01',
        Chat_AICodeLines: '10',
        Chat_MessagesInteracted: '3'
      },
      {
        UserId: 'user2',
        Date: '2024-01-01',
        Chat_AICodeLines: '5',
        Chat_MessagesInteracted: '2'
      }
    ];

    // Mock query responses for both users
    docClient.promise.mockResolvedValue({ Items: mockItems });

    const response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31',
        userIds: 'user1,user2'
      });

    expect(response.status).toBe(200);
    expect(docClient.query).toHaveBeenCalledTimes(4); // 2 users × 2 periods
    expect(docClient.query).toHaveBeenCalledWith({
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      KeyConditionExpression: 'UserId = :userId AND #date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      },
      ExpressionAttributeValues: {
        ':userId': 'user1',
        ':startDate': '2024-01-01',
        ':endDate': '2024-01-31'
      }
    });
  });

  it('should use default date ranges when not provided', async () => {
    // Mock current date
    const now = moment('2024-01-15');
    jest.spyOn(moment, 'now').mockReturnValue(now);

    // Mock data
    const mockItems = [
      {
        UserId: 'user1',
        Date: '2024-01-14',
        Chat_AICodeLines: '10',
        Chat_MessagesInteracted: '3'
      }
    ];

    docClient.promise.mockResolvedValue({ Items: mockItems });

    const response = await request(app)
      .get('/api/activity/compare')
      .query({
        userIds: 'user1'
      });

    expect(response.status).toBe(200);
    expect(docClient.query).toHaveBeenCalledTimes(2); // One for each period

    // Verify current period query (last week)
    expect(docClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: expect.objectContaining({
          ':startDate': '2024-01-08', // 1 week ago
          ':endDate': '2024-01-15'    // current date
        })
      })
    );

    // Verify previous period query (week before last)
    expect(docClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: expect.objectContaining({
          ':startDate': '2023-12-31', // Previous week start
          ':endDate': '2024-01-07'    // Previous week end
        })
      })
    );
  });

  it('should handle errors gracefully', async () => {
    docClient.promise.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31',
        userIds: 'user1'
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch comparative metrics' });
  });

  it('should validate date formats', async () => {
    // Test invalid startDate format
    let response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '01-01-2024', // Wrong format
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid startDate format. Use YYYY-MM-DD' });

    // Test invalid endDate format
    response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '31/01/2024', // Wrong format
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid endDate format. Use YYYY-MM-DD' });

    // Test invalid compareStartDate format
    response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '12/01/2023', // Wrong format
        compareEndDate: '2023-12-31'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid compareStartDate format. Use YYYY-MM-DD' });

    // Test invalid compareEndDate format
    response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '31-12-2023' // Wrong format
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid compareEndDate format. Use YYYY-MM-DD' });
  });

  it('should validate date range logic', async () => {
    // Test endDate before startDate
    let response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-31',
        endDate: '2024-01-01', // Before startDate
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'endDate cannot be before startDate' });

    // Test compareEndDate before compareStartDate
    response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-31',
        compareEndDate: '2023-12-01' // Before compareStartDate
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'compareEndDate cannot be before compareStartDate' });
  });

  it('should fetch metrics for all users when no userIds provided', async () => {
    // Mock scan response for getting all users
    const mockUsers = [
      { UserId: 'user1' },
      { UserId: 'user2' }
    ];

    // Mock activity data for users
    const mockUser1Data = [
      {
        UserId: 'user1',
        Date: '2024-01-01',
        Chat_AICodeLines: '10',
        Inline_AICodeLines: '5',
        Chat_MessagesInteracted: '3',
        Inline_SuggestionsCount: '8',
        Inline_AcceptanceCount: '6'
      }
    ];

    const mockUser2Data = [
      {
        UserId: 'user2',
        Date: '2024-01-01',
        Chat_AICodeLines: '15',
        Inline_AICodeLines: '7',
        Chat_MessagesInteracted: '4',
        Inline_SuggestionsCount: '10',
        Inline_AcceptanceCount: '8'
      }
    ];

    // Mock scan and query responses
    docClient.scan.mockReturnThis();
    docClient.query.mockReturnThis();

    // Track mock calls
    let scanCallCount = 0;
    let queryCallCount = 0;

    docClient.promise.mockImplementation(() => {
      if (docClient.scan.mock.calls.length > scanCallCount) {
        scanCallCount++;
        console.log('Scan call', scanCallCount);
        return Promise.resolve({ Items: mockUsers });
      }

      queryCallCount++;
      console.log('Query call', queryCallCount);

      // First two queries are for current period
      if (queryCallCount <= 2) {
        return Promise.resolve({
          Items: queryCallCount === 1 ? mockUser1Data : mockUser2Data
        });
      }
      // Next two queries are for previous period
      else {
        return Promise.resolve({
          Items: queryCallCount === 3 ? mockUser1Data : mockUser2Data
        });
      }
    });

    const response = await request(app)
      .get('/api/activity/compare')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compareStartDate: '2023-12-01',
        compareEndDate: '2023-12-31'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('current');
    expect(response.body).toHaveProperty('previous');
    
    // Verify metrics are aggregated for all users
    expect(response.body.current).toEqual({
      aiCodeLines: 37, // (10+5) + (15+7)
      chatInteractions: 7, // 3 + 4
      inlineSuggestions: 18, // 8 + 10
      inlineAcceptances: 14 // 6 + 8
    });

    // Verify scan was called to get users
    expect(docClient.scan).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
        ProjectionExpression: 'UserId'
      })
    );

    // Verify query was called for each user
    expect(docClient.query).toHaveBeenCalledTimes(4); // 2 users × 2 periods
  });
});

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