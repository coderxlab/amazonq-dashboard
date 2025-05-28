// Set up environment variables for testing
process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE = 'test-activity-table';
process.env.DYNAMODB_PROMPT_LOG_TABLE = 'test-prompt-table';
process.env.DYNAMODB_SUBSCRIPTION_TABLE = 'test-subscription-table';
process.env.PORT = 5001;
process.env.NODE_ENV = 'test';