const AWS = require('aws-sdk');

// Mock DynamoDB Document Client
const mockDocClient = {
  scan: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  put: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  get: jest.fn().mockReturnThis(),
  promise: jest.fn()
};

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDocClient)
    },
    config: {
      update: jest.fn()
    }
  };
});

// Sample test data
const mockData = {
  users: [
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
      UserId: 'user2',
      Date: '2024-01-01',
      Chat_AICodeLines: '15',
      Inline_AICodeLines: '7',
      Chat_MessagesInteracted: '4',
      Inline_SuggestionsCount: '10',
      Inline_AcceptanceCount: '8'
    }
  ],
  subscriptions: [
    {
      UserId: 'user1',
      Name: 'User One',
      SubscriptionStatus: 'Active'
    },
    {
      UserId: 'user2',
      Name: 'User Two',
      SubscriptionStatus: 'Active'
    }
  ],
  prompts: [
    {
      UserId: 'user1',
      TimeStamp: '2024-01-01T10:00:00Z',
      Prompt: 'Test prompt 1',
      Response: 'Test response 1'
    },
    {
      UserId: 'user2',
      TimeStamp: '2024-01-01T11:00:00Z',
      Prompt: 'Test prompt 2',
      Response: 'Test response 2'
    }
  ]
};

// Helper function to setup mock responses
const setupMockResponses = (responses) => {
  let callCount = 0;
  mockDocClient.promise.mockImplementation(() => {
    // If we've used all responses, use the last one
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    return Promise.resolve(response);
  });

  // Reset call count for each operation type
  mockDocClient.scan.mockImplementation(() => {
    return mockDocClient;
  });

  mockDocClient.query.mockImplementation(() => {
    return mockDocClient;
  });

  mockDocClient.put.mockImplementation(() => {
    return mockDocClient;
  });

  mockDocClient.delete.mockImplementation(() => {
    return mockDocClient;
  });

  mockDocClient.update.mockImplementation(() => {
    return mockDocClient;
  });

  mockDocClient.get.mockImplementation(() => {
    return mockDocClient;
  });
};

// Reset all mocks
const resetMocks = () => {
  jest.clearAllMocks();
  mockDocClient.scan.mockReturnThis();
  mockDocClient.query.mockReturnThis();
  mockDocClient.put.mockReturnThis();
  mockDocClient.delete.mockReturnThis();
  mockDocClient.update.mockReturnThis();
  mockDocClient.get.mockReturnThis();
};

// Setup test environment variables
const setupTestEnv = () => {
  process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE = 'test-activity-table';
  process.env.DYNAMODB_PROMPT_LOG_TABLE = 'test-prompt-table';
  process.env.DYNAMODB_SUBSCRIPTION_TABLE = 'test-subscription-table';
  process.env.PORT = 5001;
};

module.exports = {
  mockDocClient,
  mockData,
  setupMockResponses,
  resetMocks,
  setupTestEnv
};