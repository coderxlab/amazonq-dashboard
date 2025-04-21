# Amazon Q Developer Productivity Dashboard

A dashboard for tracking and visualizing developer productivity metrics when using Amazon Q Developer.

## Overview

This application provides insights into how developers interact with Amazon Q Developer by analyzing logs stored in DynamoDB. The dashboard includes:

- Developer productivity metrics
- AI code generation statistics
- Acceptance rates for suggestions
- Detailed prompt logs

## Features

- **Developer Productivity Overview**
  - Summary cards with key metrics
  - Bar chart showing AI code lines per developer
  - Line chart showing AI code lines over time
  - Developer activity summary table

- **Prompt Log Viewer**
  - Detailed view of all prompts and completions
  - Filter by user, date range, and prompt type
  - Search functionality
  - Export to CSV

- **Filtering Options**
  - Date range selection
  - Developer filtering
  - Prompt type filtering

## Tech Stack

- **Frontend**: React, Chart.js, TailwindCSS
- **Backend**: Express.js
- **Data**: DynamoDB tables (AmazonQDevLogging and AmazonQDevPromptLog)

## Project Structure

```
amazon-q-productivity/
├── backend/             # Express.js API
├── frontend/            # React application
└── .amazonq/            # Project documentation and guides
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- AWS account with access to the DynamoDB tables containing Amazon Q Developer usage logs

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/amazon-q-productivity.git
cd amazon-q-productivity
```

2. Install backend dependencies
```
cd backend
npm install
```

3. Install frontend dependencies
```
cd frontend
npm install
```

4. Configure environment variables
```
# For backend
cd backend
cp .env.example .env

# For frontend
cd frontend
cp .env.example .env
```
Edit the `.env` files with your AWS credentials and other configuration.

### Running the Application

1. Start the backend server
```
cd backend
npm run dev
```

2. Start the frontend development server
```
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## AWS Integration

The application requires access to two DynamoDB tables:

1. `AmazonQDevLogging` - Contains user activity metrics
2. `AmazonQDevPromptLog` - Contains detailed prompt and response logs

Make sure your AWS credentials have appropriate permissions to access these tables.

## Data Format

### Activity Logs (DynamoDB)

```json
{
  "UserId": {"S": "e408b4a8-1011-70c3-1796-21d8bff478c8"},
  "Date": {"S": "2025-04-17"},
  "Chat_AICodeLines": {"N": "0"},
  "Chat_MessagesInteracted": {"N": "4"},
  "Chat_MessagesSent": {"N": "69"},
  "Inline_AICodeLines": {"N": "49"},
  "Inline_AcceptanceCount": {"N": "49"},
  "Inline_SuggestionsCount": {"N": "70"}
}
```

### Prompt Logs (DynamoDB)

```json
{
  "Prompt": {"S": "Explain the event in management events in cloud trail..."},
  "ChatTriggerType": {"S": "MANUAL"},
  "RequestId": {"S": "b8034aad-f431-4ad3-8ff1-f22711ffc7e3"},
  "UserId": {"S": "d-9067fb0efd.e408b4a8-1011-70c3-1796-21d8bff478c8"},
  "TimeStamp": {"S": "2025-04-17T03:12:55.223691657"},
  "Response": {"S": "Let me explain these CloudTrail management events..."}
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
