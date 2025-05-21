const request = require('supertest');
const express = require('express');
const AWS = require('aws-sdk');
const moment = require('moment');
const trendsRoutes = require('../trends');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockDocClient = {
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocClient)
    }
  };
});

describe('Trends API Routes', () => {
  let app;
  let mockDocClient;

  beforeEach(() => {
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/trends', trendsRoutes);

    // Get reference to mock DocumentClient
    mockDocClient = new AWS.DynamoDB.DocumentClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      mockDocClient.promise.mockResolvedValueOnce({ Items: mockActivityData });

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
      mockDocClient.promise.mockResolvedValueOnce({ Items: mockProductivityData });

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
      mockDocClient.promise
        .mockResolvedValueOnce({ Items: mockAdoptionData }) // First scan for adoption date
        .mockResolvedValueOnce({ Items: mockAdoptionData.slice(0, 1) }) // Before data
        .mockResolvedValueOnce({ Items: mockAdoptionData.slice(1) }); // After data

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
      mockDocClient.promise.mockResolvedValueOnce({ Items: mockCorrelationData });

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
      mockDocClient.promise.mockResolvedValueOnce({ Items: mockExportData });

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