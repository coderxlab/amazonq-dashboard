# Amazon Q Developer Productivity Dashboard

## AWS Integration Setup

This document provides instructions for setting up the AWS integration for the Amazon Q Developer Productivity Dashboard.

### Prerequisites

1. AWS account with access to the S3 bucket containing Amazon Q Developer usage logs
2. AWS CLI installed and configured
3. Node.js and npm installed

### AWS Configuration

1. Create an IAM user with the following permissions:
   - `s3:ListBucket` on the `aws-q-dev-user-usage-logging` bucket
   - `s3:GetObject` on objects within the `aws-q-dev-user-usage-logging` bucket

2. Generate access keys for this IAM user

3. Configure your environment variables:
   - Copy `.env.example` to `.env`
   - Update the AWS credentials in the `.env` file:
     ```
     AWS_ACCESS_KEY_ID=your_access_key_id
     AWS_SECRET_ACCESS_KEY=your_secret_access_key
     AWS_REGION=us-east-1
     AWS_S3_BUCKET=aws-q-dev-user-usage-logging
     ```

### Testing AWS Integration

1. Start the backend server:
   ```
   cd backend
   npm install
   npm run dev
   ```
   The backend server will run on port 3001.

2. Test the API endpoint:
   ```
   curl http://localhost:3001/api/data/available-logs
   ```

   This should return a list of available log files in the S3 bucket.

### S3 Log Structure

The S3 bucket contains two types of logs:

1. **Activity Logs**: CSV files with user activity metrics
   - Format: `activity_logs/YYYY-MM-DD/user_activity.csv`
   - Contains metrics like AI code lines, messages interacted, etc.

2. **Prompt Logs**: JSON files with detailed prompt and response data
   - Format: `prompt_logs/YYYY-MM-DD/user_prompts.json`
   - Contains the full text of prompts and AI responses

### Data Processing

The backend processes these logs as follows:

1. Retrieves raw logs from S3
2. Parses and transforms the data into a consistent format
3. Aggregates metrics as needed
4. Serves the processed data via REST API endpoints

For development purposes, sample data is included in the `data` directory.
