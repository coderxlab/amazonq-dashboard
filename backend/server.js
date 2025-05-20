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



// Get activity summary metrics
app.get('/api/activity/summary', async (req, res) => {
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
    
    // Calculate summary metrics
    const summary = {
      totalAICodeLines: 0,
      totalChatInteractions: 0,
      totalInlineSuggestions: 0,
      totalInlineAcceptances: 0,
      acceptanceRate: 0,
      byUser: {},
      byDate: {},
      // New data structures for enhanced visualizations
      byHourOfDay: Array(24).fill().map(() => ({ 
        suggestions: 0, 
        acceptances: 0, 
        rate: 0 
      })),
      byDayOfWeek: Array(7).fill().map(() => ({ 
        suggestions: 0, 
        acceptances: 0, 
        rate: 0 
      })),
      acceptanceTrend: []
    };
    
    // Process each item to build summary data
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
      
      // Track by date
      if (!summary.byDate[item.Date]) {
        summary.byDate[item.Date] = {
          date: item.Date,
          aiCodeLines: 0,
          chatInteractions: 0,
          inlineSuggestions: 0,
          inlineAcceptances: 0
        };
      }
      
      summary.byDate[item.Date].aiCodeLines += chatAICodeLines + inlineAICodeLines;
      summary.byDate[item.Date].chatInteractions += chatMessagesInteracted;
      summary.byDate[item.Date].inlineSuggestions += inlineSuggestionsCount;
      summary.byDate[item.Date].inlineAcceptances += inlineAcceptanceCount;
      
      // Extract time information for heatmap data
      let itemDateTime;
      
      // Handle different date/time formats
      if (typeof item.TimeStamp === 'string') {
        itemDateTime = moment(item.TimeStamp);
      } else if (item.TimeStamp && item.TimeStamp.S) {
        itemDateTime = moment(item.TimeStamp.S);
      } else if (typeof item.Date === 'string') {
        // If we only have date, use noon as default time
        if (item.Date.includes('-')) {
          itemDateTime = moment(item.Date + ' 12:00:00');
        } else if (item.Date.includes('/')) {
          itemDateTime = moment(item.Date + ' 12:00:00', 'MM/DD/YYYY HH:mm:ss');
        } else {
          itemDateTime = moment(item.Date + ' 12:00:00', 'MM-DD-YYYY HH:mm:ss');
        }
      }
      
      if (itemDateTime && itemDateTime.isValid()) {
        const hour = itemDateTime.hour();
        const dayOfWeek = itemDateTime.day(); // 0 = Sunday, 6 = Saturday
        
        // Update hour of day data
        summary.byHourOfDay[hour].suggestions += inlineSuggestionsCount;
        summary.byHourOfDay[hour].acceptances += inlineAcceptanceCount;
        
        // Update day of week data
        summary.byDayOfWeek[dayOfWeek].suggestions += inlineSuggestionsCount;
        summary.byDayOfWeek[dayOfWeek].acceptances += inlineAcceptanceCount;
      }
    });
    
    // Calculate acceptance rates
    if (summary.totalInlineSuggestions > 0) {
      summary.acceptanceRate = (summary.totalInlineAcceptances / summary.totalInlineSuggestions) * 100;
    }
    
    // Calculate rates for hour of day
    summary.byHourOfDay = summary.byHourOfDay.map((hour, index) => {
      return {
        hour: index,
        suggestions: hour.suggestions,
        acceptances: hour.acceptances,
        rate: hour.suggestions > 0 ? (hour.acceptances / hour.suggestions) * 100 : 0
      };
    });
    
    // Calculate rates for day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    summary.byDayOfWeek = summary.byDayOfWeek.map((day, index) => {
      return {
        day: dayNames[index],
        dayIndex: index,
        suggestions: day.suggestions,
        acceptances: day.acceptances,
        rate: day.suggestions > 0 ? (day.acceptances / day.suggestions) * 100 : 0
      };
    });
    
    // Calculate trend data (7-day moving average)
    const dateArray = Object.values(summary.byDate).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    if (dateArray.length > 0) {
      // Create a continuous date range to fill in missing dates
      const firstDate = moment(dateArray[0].date);
      const lastDate = moment(dateArray[dateArray.length - 1].date);
      const daysDiff = lastDate.diff(firstDate, 'days');
      
      const continuousDates = {};
      for (let i = 0; i <= daysDiff; i++) {
        const currentDate = moment(firstDate).add(i, 'days').format('YYYY-MM-DD');
        continuousDates[currentDate] = {
          date: currentDate,
          suggestions: 0,
          acceptances: 0,
          rate: 0
        };
      }
      
      // Fill in actual data
      dateArray.forEach(item => {
        const dateStr = moment(item.date).format('YYYY-MM-DD');
        if (continuousDates[dateStr]) {
          continuousDates[dateStr].suggestions = item.inlineSuggestions;
          continuousDates[dateStr].acceptances = item.inlineAcceptances;
          continuousDates[dateStr].rate = item.inlineSuggestions > 0 
            ? (item.inlineAcceptances / item.inlineSuggestions) * 100 
            : 0;
        }
      });
      
      // Convert to array and calculate moving averages
      const continuousDatesArray = Object.values(continuousDates);
      
      // Calculate 7-day moving average for acceptance rate
      for (let i = 0; i < continuousDatesArray.length; i++) {
        const startIndex = Math.max(0, i - 3); // 3 days before
        const endIndex = Math.min(continuousDatesArray.length - 1, i + 3); // 3 days after
        const windowSize = endIndex - startIndex + 1;
        
        let totalSuggestions = 0;
        let totalAcceptances = 0;
        
        for (let j = startIndex; j <= endIndex; j++) {
          totalSuggestions += continuousDatesArray[j].suggestions;
          totalAcceptances += continuousDatesArray[j].acceptances;
        }
        
        const movingAvgRate = totalSuggestions > 0 
          ? (totalAcceptances / totalSuggestions) * 100 
          : 0;
        
        summary.acceptanceTrend.push({
          date: continuousDatesArray[i].date,
          rate: continuousDatesArray[i].rate,
          movingAvgRate: movingAvgRate
        });
      }
    }
    
    // Convert byUser and byDate objects to arrays for easier frontend processing
    summary.byUser = Object.values(summary.byUser);
    summary.byDate = Object.values(summary.byDate).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

// Get prompt logs with optional filtering
app.get('/api/prompts', async (req, res) => {
  try {
    const { userId, startDate, endDate, searchTerm, limit = 50, page = 1 } = req.query;
    
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
      filterExpressions.push('contains(Prompt, :searchTerm)');
      expressionAttributeValues[':searchTerm'] = searchTerm;
    }
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
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

// Export app for testing
module.exports = app;
