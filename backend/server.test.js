const request = require('supertest');
const express = require('express');
const moment = require('moment');
const { mockDocClient, mockData, setupMockResponses, resetMocks, setupTestEnv } = require('./tests/mockDb');

// Import server after mocking AWS (mock is set up in mockDb.js)
const app = require('./server');

// Reset all mocks and setup test environment before each test
beforeEach(() => {
  resetMocks();
  setupTestEnv();
});

// Create a mock Express app for testing
const mockApp = express();

describe('GET /api/activity/compare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return comparative metrics for two periods', async () => {
    // Setup mock responses using our mock data
    const mockCurrentItems = [mockData.users[0]];
    const mockPreviousItems = [{
      ...mockData.users[0],
      Date: '2023-12-01',
      Chat_AICodeLines: '8',
      Inline_AICodeLines: '4',
      Chat_MessagesInteracted: '2',
      Inline_SuggestionsCount: '5',
      Inline_AcceptanceCount: '3'
    }];

    // Setup mock responses for both periods
    setupMockResponses([
      { Items: mockCurrentItems },   // First query (current period)
      { Items: mockPreviousItems }   // Second query (previous period)
    ]);

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
    expect(mockDocClient.query).toHaveBeenCalledWith({
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
    // Use mock data for multiple users
    setupMockResponses([
      { Items: mockData.users }
    ]);

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
    expect(mockDocClient.query).toHaveBeenCalledTimes(4); // 2 users × 2 periods
    expect(mockDocClient.query).toHaveBeenCalledWith({
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

    // Use mock data
    setupMockResponses([
      { Items: [mockData.users[0]] }
    ]);

    const response = await request(app)
      .get('/api/activity/compare')
      .query({
        userIds: 'user1'
      });

    expect(response.status).toBe(200);
    expect(mockDocClient.query).toHaveBeenCalledTimes(2); // One for each period

    // Verify current period query (last week)
    expect(mockDocClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: expect.objectContaining({
          ':startDate': '2024-01-08', // 1 week ago
          ':endDate': '2024-01-15'    // current date
        })
      })
    );

    // Verify previous period query (week before last)
    expect(mockDocClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: expect.objectContaining({
          ':startDate': '2023-12-31', // Previous week start
          ':endDate': '2024-01-07'    // Previous week end
        })
      })
    );
  });

  it('should handle errors gracefully', async () => {
    // Mock a database error
    mockDocClient.promise.mockRejectedValue(new Error('Database error'));

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
    // Setup mock responses for scan and queries
    setupMockResponses([
      { Items: mockData.users },  // Scan response for getting all users
      { Items: [mockData.users[0]] },  // Query response for user1 current period
      { Items: [mockData.users[1]] },  // Query response for user2 current period
      { Items: [mockData.users[0]] }   // Query response for previous period (reused for both users)
    ]);

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
    expect(mockDocClient.scan).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
        ProjectionExpression: 'UserId'
      })
    );

    // Verify query was called for each user and period
    expect(mockDocClient.query).toHaveBeenCalledTimes(3); // 2 users current + 1 shared previous
    expect(mockDocClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
        KeyConditionExpression: 'UserId = :userId AND #date BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: expect.objectContaining({
          ':userId': 'user1',
          ':startDate': '2024-01-01',
          ':endDate': '2024-01-31'
        })
      })
    );
  });
});

describe('API Endpoints', () => {
  describe('GET /api/activity/summary', () => {
    test('returns summarized activity data with enhanced visualizations', async () => {
      // Setup mock responses for activity data
      setupMockResponses([
        { Items: mockData.users }
      ]);

      const response = await request(app).get('/api/activity/summary');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalAICodeLines');
      expect(response.body).toHaveProperty('totalInlineSuggestions');
      expect(response.body).toHaveProperty('totalInlineAcceptances');
      expect(response.body).toHaveProperty('acceptanceRate');
      
      // Check for enhanced visualization data
      expect(response.body).toHaveProperty('byDayOfWeek');
      expect(response.body.byDayOfWeek).toHaveLength(7);
      expect(response.body).toHaveProperty('trendAnalysis');
      
      // Check that day of week data is correctly formatted
      const mondayData = response.body.byDayOfWeek.find(d => d.dayName === 'Monday');
      expect(mondayData).toBeDefined();
      expect(mondayData).toHaveProperty('suggestions');
      expect(mondayData).toHaveProperty('acceptances');
      expect(mondayData).toHaveProperty('rate');
      
      // Check that trend data is correctly formatted
      expect(response.body.trendAnalysis).toBeDefined();
      expect(response.body.trendAnalysis.daily).toBeDefined();
      expect(response.body.trendAnalysis.weekly).toBeDefined();
      expect(response.body.trendAnalysis.monthly).toBeDefined();
    });

    test('handles errors gracefully', async () => {
      // Mock a database error
      mockDocClient.promise.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/activity/summary');
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch activity summary' });
    });

    test('filters by user ID when provided', async () => {
      // Setup mock response with filtered data
      setupMockResponses([
        { Items: [mockData.users[0]] }
      ]);

      const response = await request(app)
        .get('/api/activity/summary')
        .query({ userId: 'user1' });
      
      expect(response.status).toBe(200);
      expect(mockDocClient.scan).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'UserId = :userId',
          ExpressionAttributeValues: { ':userId': 'user1' }
        })
      );
    });

    test('filters by date range when provided', async () => {
      // Setup mock response
      setupMockResponses([
        { Items: mockData.users }
      ]);

      const response = await request(app)
        .get('/api/activity/summary')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });
      
      expect(response.status).toBe(200);
      // Results should be filtered in memory since DynamoDB doesn't support complex date filtering
      expect(response.body.byDate).toBeDefined();
      expect(response.body.byDate.every(item => 
        moment(item.date).isBetween('2024-01-01', '2024-01-31', null, '[]')
      )).toBe(true);
    });
  });
});