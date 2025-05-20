require('dotenv').config();
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration - apply before any routes
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

// Routes
app.get('/', (req, res) => {
  res.send('Amazon Q Developer Productivity Dashboard API');
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    // Query the activity log table to get unique users
    const params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      ProjectionExpression: 'UserId'
    };

    const scanResults = await docClient.scan(params).promise();
    
    // Extract unique user IDs
    const userIds = [...new Set(scanResults.Items.map(item => item.UserId))];
    
    res.json(userIds);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get activity logs with optional filtering
app.get('/api/activity', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    let params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE
    };
    
    // Add filters if provided
    if (userId) {
      params.FilterExpression = 'UserId = :userId';
      params.ExpressionAttributeValues = {
        ':userId': userId
      };
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      const startMoment = moment(startDate).startOf('day');
      const endMoment = moment(endDate).endOf('day');
      
      results = results.filter(item => {
        // Handle different date formats
        let itemDate;
        
        // If Date is a string
        if (typeof item.Date === 'string') {
          // Try different date formats
          if (item.Date.includes('-')) {
            // Format: YYYY-MM-DD
            itemDate = moment(item.Date);
          } else if (item.Date.includes('/')) {
            // Format: MM/DD/YYYY
            itemDate = moment(item.Date, 'MM/DD/YYYY');
          } else {
            // Format: MM-DD-YYYY
            itemDate = moment(item.Date, 'MM-DD-YYYY');
          }
        } 
        // If Date is in DynamoDB format with S attribute
        else if (item.Date && item.Date.S) {
          itemDate = moment(item.Date.S);
        }
        // Fallback to current date (should not happen)
        else {
          console.warn('Item has no valid date:', item);
          return false;
        }
        
        return itemDate.isBetween(startMoment, endMoment, null, '[]');
      });
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get acceptance rate trends with time granularity
app.get('/api/activity/acceptance-rate-trends', async (req, res) => {
  try {
    const { userId, startDate, endDate, granularity = 'daily', compareWithPrevious = 'false' } = req.query;
    
    let params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE
    };
    
    // Add filters if provided
    if (userId) {
      params.FilterExpression = 'UserId = :userId';
      params.ExpressionAttributeValues = {
        ':userId': userId
      };
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    let previousPeriodResults = [];
    
    if (startDate && endDate) {
      const startMoment = moment(startDate).startOf('day');
      const endMoment = moment(endDate).endOf('day');
      
      // Calculate previous period date range if comparison is requested
      let previousStartMoment, previousEndMoment;
      if (compareWithPrevious === 'true') {
        const periodDuration = endMoment.diff(startMoment, 'days') + 1;
        previousEndMoment = startMoment.clone().subtract(1, 'days');
        previousStartMoment = previousEndMoment.clone().subtract(periodDuration - 1, 'days');
      }
      
      results = results.filter(item => {
        // Handle different date formats
        let itemDate;
        
        // If Date is a string
        if (typeof item.Date === 'string') {
          // Try different date formats
          if (item.Date.includes('-')) {
            // Format: YYYY-MM-DD
            itemDate = moment(item.Date);
          } else if (item.Date.includes('/')) {
            // Format: MM/DD/YYYY
            itemDate = moment(item.Date, 'MM/DD/YYYY');
          } else {
            // Format: MM-DD-YYYY
            itemDate = moment(item.Date, 'MM-DD-YYYY');
          }
        } 
        // If Date is in DynamoDB format with S attribute
        else if (item.Date && item.Date.S) {
          itemDate = moment(item.Date.S);
        }
        // Fallback to current date (should not happen)
        else {
          console.warn('Item has no valid date:', item);
          return false;
        }
        
        // If comparison is requested, also collect previous period data
        if (compareWithPrevious === 'true' && 
            itemDate.isBetween(previousStartMoment, previousEndMoment, null, '[]')) {
          previousPeriodResults.push(item);
        }
        
        return itemDate.isBetween(startMoment, endMoment, null, '[]');
      });
    }
    
    // Group data by the specified granularity
    const groupedData = {};
    const previousGroupedData = {};
    
    // Helper function to get the group key based on granularity
    const getGroupKey = (dateStr, granularity) => {
      const date = moment(dateStr);
      switch (granularity) {
        case 'weekly':
          // Format: YYYY-WW (year and week number)
          return `${date.year()}-W${date.isoWeek().toString().padStart(2, '0')}`;
        case 'monthly':
          // Format: YYYY-MM (year and month)
          return date.format('YYYY-MM');
        case 'daily':
        default:
          // Format: YYYY-MM-DD
          return date.format('YYYY-MM-DD');
      }
    };
    
    // Group current period data
    results.forEach(item => {
      const groupKey = getGroupKey(item.Date, granularity);
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          period: groupKey,
          inlineSuggestions: 0,
          inlineAcceptances: 0,
          acceptanceRate: 0
        };
      }
      
      const inlineAcceptanceCount = parseInt(item.Inline_AcceptanceCount || 0);
      const inlineSuggestionsCount = parseInt(item.Inline_SuggestionsCount || 0);
      
      groupedData[groupKey].inlineSuggestions += inlineSuggestionsCount;
      groupedData[groupKey].inlineAcceptances += inlineAcceptanceCount;
    });
    
    // Calculate acceptance rates for current period
    Object.values(groupedData).forEach(group => {
      if (group.inlineSuggestions > 0) {
        group.acceptanceRate = (group.inlineAcceptances / group.inlineSuggestions) * 100;
      }
    });
    
    // Group previous period data if comparison is requested
    if (compareWithPrevious === 'true') {
      previousPeriodResults.forEach(item => {
        const groupKey = getGroupKey(item.Date, granularity);
        
        if (!previousGroupedData[groupKey]) {
          previousGroupedData[groupKey] = {
            period: groupKey,
            inlineSuggestions: 0,
            inlineAcceptances: 0,
            acceptanceRate: 0
          };
        }
        
        const inlineAcceptanceCount = parseInt(item.Inline_AcceptanceCount || 0);
        const inlineSuggestionsCount = parseInt(item.Inline_SuggestionsCount || 0);
        
        previousGroupedData[groupKey].inlineSuggestions += inlineSuggestionsCount;
        previousGroupedData[groupKey].inlineAcceptances += inlineAcceptanceCount;
      });
      
      // Calculate acceptance rates for previous period
      Object.values(previousGroupedData).forEach(group => {
        if (group.inlineSuggestions > 0) {
          group.acceptanceRate = (group.inlineAcceptances / group.inlineSuggestions) * 100;
        }
      });
    }
    
    // Convert to arrays and sort by period
    const currentPeriodData = Object.values(groupedData).sort((a, b) => {
      return moment(a.period, 'YYYY-MM-DD').diff(moment(b.period, 'YYYY-MM-DD'));
    });
    
    const previousPeriodData = Object.values(previousGroupedData).sort((a, b) => {
      return moment(a.period, 'YYYY-MM-DD').diff(moment(b.period, 'YYYY-MM-DD'));
    });
    
    // Format response
    const response = {
      granularity,
      currentPeriod: currentPeriodData,
      hasPreviousPeriod: compareWithPrevious === 'true',
      previousPeriod: compareWithPrevious === 'true' ? previousPeriodData : []
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching acceptance rate trends:', error);
    res.status(500).json({ error: 'Failed to fetch acceptance rate trends' });
  }
});

// Get prompt logs with optional filtering
app.get('/api/prompts', async (req, res) => {
  try {
    const { userId, startDate, endDate, searchTerm, limit = 50, page = 1, includeEmpty = 'false' } = req.query;
    
    let params = {
      TableName: process.env.DYNAMODB_PROMPT_LOG_TABLE
    };
    
    // Add filters if provided
    let filterExpressions = [];
    let expressionAttributeValues = {};
    
    if (userId) {
      filterExpressions.push('UserId = :userId');
      expressionAttributeValues[':userId'] = userId;
    }
    
    if (searchTerm) {
      // Search in both prompt and response using expression attribute names for reserved keywords
      filterExpressions.push('(contains(Prompt, :searchTerm) OR contains(#response, :searchTerm))');
      expressionAttributeValues[':searchTerm'] = searchTerm;
      
      // Add expression attribute names for reserved keywords
      if (!params.ExpressionAttributeNames) {
        params.ExpressionAttributeNames = {};
      }
      params.ExpressionAttributeNames['#response'] = 'Response';
    }
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
      
      // Make sure ExpressionAttributeNames is included in params if it was set
      if (params.ExpressionAttributeNames && Object.keys(params.ExpressionAttributeNames).length === 0) {
        delete params.ExpressionAttributeNames;
      }
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      const startMoment = moment(startDate).startOf('day');
      const endMoment = moment(endDate).endOf('day');
      
      console.log(`Filtering logs between ${startMoment.format()} and ${endMoment.format()}`);
      
      results = results.filter(item => {
        // Handle different timestamp formats
        let itemTimestamp;
        
        // If TimeStamp is a string (ISO format)
        if (typeof item.TimeStamp === 'string') {
          itemTimestamp = moment(item.TimeStamp);
        } 
        // If TimeStamp is in DynamoDB format with S attribute
        else if (item.TimeStamp && item.TimeStamp.S) {
          itemTimestamp = moment(item.TimeStamp.S);
        }
        // If timestamp is in a different field
        else if (item.timeStamp) {
          itemTimestamp = moment(item.timeStamp);
        }
        // Fallback to current time (should not happen)
        else {
          console.warn('Item has no valid timestamp:', item);
          return false;
        }
        
        const isInRange = itemTimestamp.isBetween(startMoment, endMoment, null, '[]');
        if (isInRange) {
          console.log(`Item in range: ${itemTimestamp.format()}`);
        }
        return isInRange;
      });
      
      console.log(`Filtered to ${results.length} items`);
    }
    
    // Filter out empty records if includeEmpty is false
    // This is done after fetching results since we need to use trim() which isn't available in DynamoDB expressions
    if (includeEmpty !== 'true') {
      results = results.filter(item => {
        return item.Prompt && item.Response && 
               item.Prompt.trim() !== '' && 
               item.Response.trim() !== '';
      });
    }

    // Sort results by timestamp (newest first)
    results.sort((a, b) => {
      const timestampA = moment(a.TimeStamp?.S || a.TimeStamp || a.timeStamp);
      const timestampB = moment(b.TimeStamp?.S || b.TimeStamp || b.timeStamp);
      return timestampB - timestampA; // Descending order
    });
    
    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      total: results.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(results.length / limit),
      data: paginatedResults
    });
  } catch (error) {
    console.error('Error fetching prompt logs:', error);
    res.status(500).json({ error: 'Failed to fetch prompt logs' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
