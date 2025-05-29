const request = require('supertest');
const moment = require('moment');
const { mockDocClient, mockData, setupMockResponses, resetMocks, setupTestEnv } = require('./mockDb');

// Import server after mocking AWS (mock is set up in mockDb.js)
const app = require('../server');

// Reset all mocks and setup test environment before each test
beforeEach(() => {
  resetMocks();
  setupTestEnv();
});

describe('GET /api/prompts', () => {
  test('returns prompt logs with pagination', async () => {
    // Setup mock response
    setupMockResponses([
      { Items: mockData.prompts }
    ]);

    const response = await request(app)
      .get('/api/prompts')
      .query({
        limit: 10,
        page: 1
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(response.body).toHaveProperty('limit');
    expect(response.body).toHaveProperty('totalPages');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('filters prompts by user ID', async () => {
    // Setup mock response with filtered data
    setupMockResponses([
      { Items: [mockData.prompts[0]] }
    ]);

    const response = await request(app)
      .get('/api/prompts')
      .query({ userId: 'user1' });
    
    expect(response.status).toBe(200);
    expect(mockDocClient.scan).toHaveBeenCalledWith(
      expect.objectContaining({
        FilterExpression: 'contains(UserId, :userId)',
        ExpressionAttributeValues: { ':userId': 'user1' }
      })
    );
    expect(response.body.data.every(item => item.UserId.includes('user1'))).toBe(true);
  });

  test('filters prompts by search term', async () => {
    // Setup mock response
    setupMockResponses([
      { Items: mockData.prompts }
    ]);

    const searchTerm = 'test';
    const response = await request(app)
      .get('/api/prompts')
      .query({ searchTerm });
    
    expect(response.status).toBe(200);
    expect(mockDocClient.scan).toHaveBeenCalledWith(
      expect.objectContaining({
        FilterExpression: '(contains(Prompt, :searchTerm) OR contains(#response, :searchTerm))',
        ExpressionAttributeValues: { ':searchTerm': searchTerm },
        ExpressionAttributeNames: { '#response': 'Response' }
      })
    );
  });

  test('filters prompts by date range', async () => {
    // Setup mock response
    setupMockResponses([
      { Items: mockData.prompts }
    ]);

    const response = await request(app)
      .get('/api/prompts')
      .query({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.every(item => 
      moment(item.TimeStamp).isBetween('2024-01-01', '2024-01-31', null, '[]')
    )).toBe(true);
  });

  test('handles empty responses', async () => {
    // Setup mock response with no items
    setupMockResponses([
      { Items: [] }
    ]);

    const response = await request(app).get('/api/prompts');
    
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.data).toHaveLength(0);
  });

  test('handles database errors', async () => {
    // Mock a database error
    mockDocClient.promise.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/prompts');
    
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch prompt logs' });
  });
});