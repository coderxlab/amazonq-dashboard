const request = require('supertest');
const express = require('express');
const AWS = require('aws-sdk');
const moment = require('moment');

// Mock AWS DynamoDB
jest.mock('aws-sdk', () => {
  const mockDocClient = {
    scan: jest.fn().mockReturnThis(),
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

describe('GET /api/activity/compare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return comparative metrics for two periods', async () => {
    // Mock data
    const mockItems = [
      {
        UserId: 'user1',
        Date: '2024-01-01',
        Chat_AICodeLines: '10',
        Inline_AICodeLines: '5',
        Chat_MessagesInteracted: '3',
        Inline_SuggestionsCount: '8',
        Inline_AcceptanceCount: '6'
      },
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

    docClient.promise.mockResolvedValue({ Items: mockItems });

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
  });

  it('should filter by user IDs when provided', async () => {
    // Mock data
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

    docClient.promise.mockResolvedValue({ Items: mockItems });

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
    expect(docClient.scan).toHaveBeenCalledWith(
      expect.objectContaining({
        FilterExpression: 'UserId = :userId',
        ExpressionAttributeValues: { ':userId': 'user1' }
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
        compareEndDate: '2023-12-31'
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch comparative metrics' });
  });
});