// Set up environment variables for testing
process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE = 'test-activity-log';
process.env.DYNAMODB_PROMPT_LOG_TABLE = 'test-prompt-log';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';