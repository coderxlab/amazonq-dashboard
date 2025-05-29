const request = require('supertest');
const express = require('express');
const moment = require('moment');
const { mockDocClient, mockData, setupMockResponses, resetMocks, setupTestEnv } = require('./mockDb');
const trendsRoutes = require('../routes/trends');

// Reset all mocks and setup test environment before each test
beforeEach(() => {
  resetMocks();
  setupTestEnv();
});

describe('Trends API Routes', () => {
  let app;
  
  beforeEach(() => {
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/trends', trendsRoutes);
  });

  afterEach(() => {
    resetMocks();
  });

  describe('GET /api/trends/activity', () => {
    const mockActivityData = [
      {
        Date: '2024-03-01',
        UserId: 'user1',
        Chat_AICodeLines: 10,
        Chat_MessagesInteracted: 5
      },
      {
        Date: '2024-03-02',
        UserId: 'user1',
        Chat_AICodeLines: 15,
        Chat_MessagesInteracted: 8
      }
    ];

    it('should return filtered activity data', async () => {
      setupMockResponses([{ Items: mockActivityData }]);

      const response = await request(app)
        .get('/api/trends/activity')
        .query({
          userId: 'user1',
          startDate: '2024-03-01',
          endDate: '2024-03-02'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(mockDocClient.scan).toHaveBeenCalledWith({
        TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
        FilterExpression: '#date BETWEEN :startDate AND :endDate AND UserId = :userId',
        ExpressionAttributeNames: { '#date': 'Date' },
        ExpressionAttributeValues: {
          ':startDate': '2024-03-01',
          ':endDate': '2024-03-02',
          ':userId': 'user1'
        }
      });
    });
  });

  describe('GET /api/trends/productivity', () => {
    const mockProductivityData = [
      {
        Date: '2024-03-01',
        UserId: 'user1',
        Chat_AICodeLines: 10,
        Chat_MessagesInteracted: 5
      },
      {
        Date: '2024-03-02',
        UserId: 'user1',
        Chat_AICodeLines: 15,
        Chat_MessagesInteracted: 8
      }
    ];

    it('should return productivity trends', async () => {
      setupMockResponses([{ Items: mockProductivityData }]);

      const response = await request(app)
        .get('/api/trends/productivity')
        .query({
          userId: 'user1',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          interval: 'day'
        });

      expect(response.status).toBe(200);
      expect(mockDocClient.scan).toHaveBeenCalledWith({
        TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
        FilterExpression: '#date BETWEEN :startDate AND :endDate AND UserId = :userId',
        ExpressionAttributeNames: { '#date': 'Date' },
        ExpressionAttributeValues: {
          ':startDate': '2024-03-01',
          ':endDate': '2024-03-02',
          ':userId': 'user1'
        }
      });
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/trends/productivity')
        .query({
          userId: 'user1'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Start date and end date are required');
    });

    it('should validate interval parameter', async () => {
      const response = await request(app)
        .get('/api/trends/productivity')
        .query({
          userId: 'user1',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          interval: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid interval. Must be one of: day, week, month');
    });

    it('should handle empty result set', async () => {
      setupMockResponses([{ Items: [] }]);

      const response = await request(app)
        .get('/api/trends/productivity')
        .query({
          userId: 'user1',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          interval: 'day'
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle server errors', async () => {
      mockDocClient.promise.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/trends/productivity')
        .query({
          userId: 'user1',
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          interval: 'day'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('An error occurred while fetching productivity trends');
      expect(response.body.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('GET /api/trends/adoption', () => {
    const mockAdoptionData = [
      {
        Date: '2024-03-01',
        UserId: 'user1',
        Chat_AICodeLines: 10
      },
      {
        Date: '2024-03-02',
        UserId: 'user1',
        Chat_AICodeLines: 15
      }
    ];

    it('should return adoption comparison data', async () => {
      setupMockResponses([
        { Items: mockAdoptionData },
        { Items: mockAdoptionData.slice(0, 1) },
        { Items: mockAdoptionData.slice(1) }
      ]);

      const response = await request(app)
        .get('/api/trends/adoption')
        .query({
          userId: 'user1',
          daysBeforeAfter: 30
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('adoptionDate');
      expect(response.body).toHaveProperty('beforePeriod');
      expect(response.body).toHaveProperty('afterPeriod');
      
      // Verify the first scan call includes the correct expression attributes
      expect(mockDocClient.scan).toHaveBeenCalledWith({
        TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
        FilterExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': 'user1'
        },
        ProjectionExpression: '#date',
        ExpressionAttributeNames: {
          '#date': 'Date'
        }
      });
    });

    it('should require userId parameter', async () => {
      const response = await request(app)
        .get('/api/trends/adoption');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User ID is required');
    });
  });

  describe('GET /api/trends/correlation', () => {
    const mockCorrelationData = [
      {
        Date: '2024-03-01',
        UserId: 'user1',
        Chat_AICodeLines: 10,
        Chat_MessagesInteracted: 5
      },
      {
        Date: '2024-03-02',
        UserId: 'user1',
        Chat_AICodeLines: 15,
        Chat_MessagesInteracted: 8
      }
    ];

    it('should return correlation analysis', async () => {
      setupMockResponses([{ Items: mockCorrelationData }]);

      const response = await request(app)
        .get('/api/trends/correlation')
        .query({
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          metric: 'aiCodeLines'
        });

      expect(response.status).toBe(200);
      expect(mockDocClient.scan).toHaveBeenCalledWith({
        TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
        FilterExpression: '#date BETWEEN :startDate AND :endDate',
        ExpressionAttributeNames: { '#date': 'Date' },
        ExpressionAttributeValues: {
          ':startDate': '2024-03-01',
          ':endDate': '2024-03-02'
        }
      });
    });

    it('should validate required date parameters', async () => {
      const response = await request(app)
        .get('/api/trends/correlation')
        .query({
          metric: 'aiCodeLines'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Start date and end date are required');
    });

    it('should validate metric parameter', async () => {
      const response = await request(app)
        .get('/api/trends/correlation')
        .query({
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          metric: 'invalidMetric'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid metric. Must be one of:');
    });

    it('should handle empty result set', async () => {
      setupMockResponses([{ Items: [] }]);

      const response = await request(app)
        .get('/api/trends/correlation')
        .query({
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          metric: 'aiCodeLines'
        });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should handle server errors', async () => {
      mockDocClient.promise.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/trends/correlation')
        .query({
          startDate: '2024-03-01',
          endDate: '2024-03-02',
          metric: 'aiCodeLines'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('An error occurred while fetching correlation analysis');
      expect(response.body.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('GET /api/trends/export', () => {
    const mockExportData = [
      {
        Date: '2024-03-01',
        UserId: 'user1',
        Chat_AICodeLines: 10,
        Chat_MessagesInteracted: 5
      },
      {
        Date: '2024-03-02',
        UserId: 'user1',
        Chat_AICodeLines: 15,
        Chat_MessagesInteracted: 8
      }
    ];

    it('should export data in CSV format', async () => {
      setupMockResponses([{ Items: mockExportData }]);

      const response = await request(app)
        .get('/api/trends/export')
        .query({
          type: 'productivity',
          userId: 'user1',
          startDate: '2024-03-01',
          endDate: '2024-03-02'
        });

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.header['content-disposition']).toContain('attachment; filename=productivity-trends-');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/trends/export')
        .query({
          userId: 'user1'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Type, start date, and end date are required');
    });
  });
});