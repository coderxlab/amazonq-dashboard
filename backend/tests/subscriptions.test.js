const request = require('supertest');
const express = require('express');
const { mockDocClient, mockData, setupMockResponses, resetMocks, setupTestEnv } = require('./mockDb');

// Import server after mocking AWS (mock is set up in mockDb.js)
const app = require('../server');

// Reset all mocks and setup test environment before each test
beforeEach(() => {
  resetMocks();
  setupTestEnv();
});

describe('Subscription Routes', () => {
  describe('GET /api/subscriptions/metrics', () => {
    it('should return subscription metrics', async () => {
      // Setup mock responses with subscription data
      setupMockResponses([{
        Items: [
          {
            SubscriptionId: '1',
            SubscriptionStatus: 'Active',
            SubscriptionType: 'Individual',
            LastActivityDate: '2024-01-01'
          },
          {
            SubscriptionId: '2',
            SubscriptionStatus: 'Pending',
            SubscriptionType: 'Group',
            LastActivityDate: '2024-01-01'
          },
          {
            SubscriptionId: '3',
            SubscriptionStatus: 'Active',
            SubscriptionType: 'Group',
            LastActivityDate: '2024-01-02'
          }
        ]
      }]);

      const response = await request(app).get('/api/subscriptions/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalSubscriptions: 3,
        activeSubscriptions: 2,
        pendingSubscriptions: 1,
        individualSubscriptions: 1,
        groupSubscriptions: 2,
        subscriptionsByDate: {
          '2024-01-01': 2,
          '2024-01-02': 1
        }
      });

      // Verify DynamoDB scan was called with correct parameters
      expect(mockDocClient.scan).toHaveBeenCalledWith({
        TableName: process.env.DYNAMODB_SUBSCRIPTION_TABLE
      });
    });

    it('should handle empty subscription data', async () => {
      // Mock empty response from DynamoDB
      setupMockResponses([{ Items: [] }]);

      const response = await request(app).get('/api/subscriptions/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        pendingSubscriptions: 0,
        individualSubscriptions: 0,
        groupSubscriptions: 0,
        subscriptionsByDate: {}
      });
    });

    it('should handle DynamoDB errors', async () => {
      // Mock DynamoDB error
      mockDocClient.promise.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/subscriptions/metrics');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to fetch subscription metrics'
      });
    });
  });

  describe('GET /api/subscriptions', () => {
    it('should return all subscriptions', async () => {
      // Setup mock responses with subscription data
      setupMockResponses([{
        Items: [
          {
            SubscriptionId: '1',
            SubscriptionStatus: 'Active',
            SubscriptionType: 'Individual'
          },
          {
            SubscriptionId: '2',
            SubscriptionStatus: 'Pending',
            SubscriptionType: 'Group'
          }
        ]
      }]);

      const response = await request(app).get('/api/subscriptions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          SubscriptionId: '1',
          SubscriptionStatus: 'Active',
          SubscriptionType: 'Individual'
        },
        {
          SubscriptionId: '2',
          SubscriptionStatus: 'Pending',
          SubscriptionType: 'Group'
        }
      ]);

      // Verify DynamoDB scan was called with correct parameters
      expect(mockDocClient.scan).toHaveBeenCalledWith({
        TableName: process.env.DYNAMODB_SUBSCRIPTION_TABLE
      });
    });

    it('should handle empty subscription list', async () => {
      // Mock empty response from DynamoDB
      setupMockResponses([{ Items: [] }]);

      const response = await request(app).get('/api/subscriptions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle DynamoDB errors', async () => {
      // Mock DynamoDB error
      mockDocClient.promise.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/subscriptions');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Failed to fetch subscriptions'
      });
    });
  });
});