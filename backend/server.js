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

// Authorization middleware
const authorize = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // For development purposes, you can bypass this check with an environment variable
  if (process.env.BYPASS_AUTH === 'true') {
    return next();
  }
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }
  
  // In a production environment, you would validate the token with your auth provider
  // For now, we'll just check if the header exists and has a basic format
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }
  
  // In a real implementation, you would verify the token here
  // const token = authHeader.split(' ')[1];
  // verifyToken(token).then(user => { req.user = user; next(); }).catch(err => res.status(401).json({ error: 'Invalid token' }));
  
  // For now, we'll just proceed
  next();
};

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


// Get activity summary metrics
app.get('/api/activity/summary', authorize, async (req, res) => {
  try {
    const { userId, startDate, endDate, granularity = 'daily' } = req.query;
    
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
      
      // Calculate previous period date range for comparison
      const currentPeriodDays = endMoment.diff(startMoment, 'days') + 1;
      const previousPeriodStartMoment = moment(startMoment).subtract(currentPeriodDays, 'days');
      const previousPeriodEndMoment = moment(startMoment).subtract(1, 'days');
      
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
        
        // Check if item is in the previous period for comparison
        const isInPreviousPeriod = itemDate.isBetween(previousPeriodStartMoment, previousPeriodEndMoment, null, '[]');
        if (isInPreviousPeriod) {
          previousPeriodResults.push(item);
          return false;
        }
        
        return itemDate.isBetween(startMoment, endMoment, null, '[]');
      });
    }
    
    // Calculate summary metrics
    const summary = {
      totalAICodeLines: 0,
      totalChatInteractions: 0,
      totalInlineSuggestions: 0,
      totalInlineAcceptances: 0,
      acceptanceRate: 0,
      byUser: {},
      byDate: {},
      acceptanceRateTimeSeries: {
        current: {},
        previous: {},
        granularity: granularity
      }
    };
    
    // Process current period results
    results.forEach(item => {
      // Parse numeric values (handling potential undefined values)
      const chatAICodeLines = parseInt(item.Chat_AICodeLines || 0);
      const chatMessagesInteracted = parseInt(item.Chat_MessagesInteracted || 0);
      const inlineAICodeLines = parseInt(item.Inline_AICodeLines || 0);
      const inlineAcceptanceCount = parseInt(item.Inline_AcceptanceCount || 0);
      const inlineSuggestionsCount = parseInt(item.Inline_SuggestionsCount || 0);
      
      // Update summary totals
      summary.totalAICodeLines += chatAICodeLines + inlineAICodeLines;
      summary.totalChatInteractions += chatMessagesInteracted;
      summary.totalInlineSuggestions += inlineSuggestionsCount;
      summary.totalInlineAcceptances += inlineAcceptanceCount;
      
      // Track by user
      if (!summary.byUser[item.UserId]) {
        summary.byUser[item.UserId] = {
          userId: item.UserId,
          aiCodeLines: 0,
          chatInteractions: 0,
          inlineSuggestions: 0,
          inlineAcceptances: 0
        };
      }
      
      summary.byUser[item.UserId].aiCodeLines += chatAICodeLines + inlineAICodeLines;
      summary.byUser[item.UserId].chatInteractions += chatMessagesInteracted;
      summary.byUser[item.UserId].inlineSuggestions += inlineSuggestionsCount;
      summary.byUser[item.UserId].inlineAcceptances += inlineAcceptanceCount;
      
      // Track by date for time series
      let dateKey = item.Date;
      let itemDate;
      
      // Parse the date to ensure consistent format
      if (typeof item.Date === 'string') {
        if (item.Date.includes('-')) {
          itemDate = moment(item.Date);
        } else if (item.Date.includes('/')) {
          itemDate = moment(item.Date, 'MM/DD/YYYY');
        } else {
          itemDate = moment(item.Date, 'MM-DD-YYYY');
        }
      } else if (item.Date && item.Date.S) {
        itemDate = moment(item.Date.S);
      } else {
        itemDate = moment(); // Fallback
      }
      
      // Format the date key based on granularity
      if (granularity === 'weekly') {
        // Use the week number and year as the key
        dateKey = `${itemDate.year()}-W${itemDate.isoWeek()}`;
      } else if (granularity === 'monthly') {
        // Use the month and year as the key
        dateKey = itemDate.format('YYYY-MM');
      } else {
        // Default to daily
        dateKey = itemDate.format('YYYY-MM-DD');
      }
      
      // Initialize the date entry if it doesn't exist
      if (!summary.byDate[dateKey]) {
        summary.byDate[dateKey] = {
          date: dateKey,
          aiCodeLines: 0,
          chatInteractions: 0,
          inlineSuggestions: 0,
          inlineAcceptances: 0,
          acceptanceRate: 0
        };
      }
      
      // Update the date entry
      summary.byDate[dateKey].aiCodeLines += chatAICodeLines + inlineAICodeLines;
      summary.byDate[dateKey].chatInteractions += chatMessagesInteracted;
      summary.byDate[dateKey].inlineSuggestions += inlineSuggestionsCount;
      summary.byDate[dateKey].inlineAcceptances += inlineAcceptanceCount;
      
      // Calculate acceptance rate for this date
      if (summary.byDate[dateKey].inlineSuggestions > 0) {
        summary.byDate[dateKey].acceptanceRate = 
          (summary.byDate[dateKey].inlineAcceptances / summary.byDate[dateKey].inlineSuggestions) * 100;
      }
      
      // Add to acceptance rate time series
      summary.acceptanceRateTimeSeries.current[dateKey] = summary.byDate[dateKey].acceptanceRate;
    });
    
    // Process previous period results for comparison
    const previousPeriodByDate = {};
    
    previousPeriodResults.forEach(item => {
      const inlineAcceptanceCount = parseInt(item.Inline_AcceptanceCount || 0);
      const inlineSuggestionsCount = parseInt(item.Inline_SuggestionsCount || 0);
      
      // Parse the date
      let itemDate;
      if (typeof item.Date === 'string') {
        if (item.Date.includes('-')) {
          itemDate = moment(item.Date);
        } else if (item.Date.includes('/')) {
          itemDate = moment(item.Date, 'MM/DD/YYYY');
        } else {
          itemDate = moment(item.Date, 'MM-DD-YYYY');
        }
      } else if (item.Date && item.Date.S) {
        itemDate = moment(item.Date.S);
      } else {
        itemDate = moment(); // Fallback
      }
      
      // Calculate the offset to align with current period
      const startMoment = moment(startDate);
      const daysDiff = itemDate.diff(moment(previousPeriodStartMoment), 'days');
      const alignedDate = moment(startMoment).add(daysDiff, 'days');
      
      // Format the date key based on granularity
      let dateKey;
      if (granularity === 'weekly') {
        dateKey = `${alignedDate.year()}-W${alignedDate.isoWeek()}`;
      } else if (granularity === 'monthly') {
        dateKey = alignedDate.format('YYYY-MM');
      } else {
        dateKey = alignedDate.format('YYYY-MM-DD');
      }
      
      // Initialize the date entry if it doesn't exist
      if (!previousPeriodByDate[dateKey]) {
        previousPeriodByDate[dateKey] = {
          inlineSuggestions: 0,
          inlineAcceptances: 0,
          acceptanceRate: 0
        };
      }
      
      // Update the date entry
      previousPeriodByDate[dateKey].inlineSuggestions += inlineSuggestionsCount;
      previousPeriodByDate[dateKey].inlineAcceptances += inlineAcceptanceCount;
      
      // Calculate acceptance rate for this date
      if (previousPeriodByDate[dateKey].inlineSuggestions > 0) {
        previousPeriodByDate[dateKey].acceptanceRate = 
          (previousPeriodByDate[dateKey].inlineAcceptances / previousPeriodByDate[dateKey].inlineSuggestions) * 100;
      }
      
      // Add to previous period time series
      summary.acceptanceRateTimeSeries.previous[dateKey] = previousPeriodByDate[dateKey].acceptanceRate;
    });
    
    // Calculate overall acceptance rate
    if (summary.totalInlineSuggestions > 0) {
      summary.acceptanceRate = (summary.totalInlineAcceptances / summary.totalInlineSuggestions) * 100;
    }
    
    // Convert byUser and byDate objects to arrays for easier frontend processing
    summary.byUser = Object.values(summary.byUser);
    summary.byDate = Object.values(summary.byDate).sort((a, b) => {
      // Sort by date, handling different formats based on granularity
      if (granularity === 'weekly') {
        // Extract year and week number for comparison
        const [aYear, aWeek] = a.date.split('-W').map(Number);
        const [bYear, bWeek] = b.date.split('-W').map(Number);
        return aYear !== bYear ? aYear - bYear : aWeek - bWeek;
      } else if (granularity === 'monthly') {
        return moment(a.date, 'YYYY-MM').diff(moment(b.date, 'YYYY-MM'));
      } else {
        return moment(a.date).diff(moment(b.date));
      }
    });
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
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
