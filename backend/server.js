require('dotenv').config();
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const moment = require('moment');
const trendsRoutes = require('./trends');

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

const docClient = new AWS.DynamoDB.DocumentClient();

// Routes
app.get('/', (req, res) => {
  res.send('Amazon Q Developer Productivity Dashboard API');
});

// Mount trends routes
app.use('/api/trends', trendsRoutes);

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
      byDayOfWeek: Array(7).fill().map(() => ({ 
        suggestions: 0, 
        acceptances: 0, 
        rate: 0 
      })),
      trendAnalysis: {
        daily: [],
        weekly: [],
        monthly: []
      },
      suggestionsVsAcceptances: []
    };
    
    // Process each item for summary metrics
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
      
      // Extract time information for heatmap
      let itemDateTime;
      
      // Handle different timestamp formats
      if (item.TimeStamp) {
        itemDateTime = moment(item.TimeStamp);
      } else if (item.Timestamp) {
        itemDateTime = moment(item.Timestamp);
      } else if (item.timestamp) {
        itemDateTime = moment(item.timestamp);
      } else {
        // If no timestamp, try to use date with a default time
        if (typeof item.Date === 'string') {
          itemDateTime = moment(item.Date);
        } else if (item.Date && item.Date.S) {
          itemDateTime = moment(item.Date.S);
        } else {
          // Skip this item for time-based aggregation
          return;
        }
      }
      
      // Aggregate by day of week (0-6, where 0 is Sunday)
      const dayOfWeek = itemDateTime.day();
      summary.byDayOfWeek[dayOfWeek].suggestions += inlineSuggestionsCount;
      summary.byDayOfWeek[dayOfWeek].acceptances += inlineAcceptanceCount;
      
      // Add to suggestions vs acceptances time series
      summary.suggestionsVsAcceptances.push({
        date: item.Date,
        suggestions: inlineSuggestionsCount,
        acceptances: inlineAcceptanceCount,
        timestamp: itemDateTime.valueOf() // For sorting
      });
    });
    
    // Calculate acceptance rates for day of week
    summary.byDayOfWeek = summary.byDayOfWeek.map((day, index) => ({
      day: index,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index],
      suggestions: day.suggestions,
      acceptances: day.acceptances,
      rate: day.suggestions > 0 ? (day.acceptances / day.suggestions) * 100 : 0
    }));
    
    // Sort suggestions vs acceptances by date
    summary.suggestionsVsAcceptances.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate overall acceptance rate
    if (summary.totalInlineSuggestions > 0) {
      summary.acceptanceRate = (summary.totalInlineAcceptances / summary.totalInlineSuggestions) * 100;
    }
    
    // Generate trend analysis
    // Convert byDate to array and sort by date
    const dateArray = Object.values(summary.byDate).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    // Calculate daily trend (7-day moving average)
    const dailyWindow = 7;
    for (let i = 0; i < dateArray.length; i++) {
      const windowStart = Math.max(0, i - dailyWindow + 1);
      const windowEnd = i + 1;
      const windowData = dateArray.slice(windowStart, windowEnd);
      
      const totalSuggestions = windowData.reduce((sum, item) => sum + item.inlineSuggestions, 0);
      const totalAcceptances = windowData.reduce((sum, item) => sum + item.inlineAcceptances, 0);
      
      const trendPoint = {
        date: dateArray[i].date,
        acceptanceRate: totalSuggestions > 0 ? (totalAcceptances / totalSuggestions) * 100 : 0,
        movingAverageDays: Math.min(i + 1, dailyWindow)
      };
      
      summary.trendAnalysis.daily.push(trendPoint);
    }
    
    // Calculate weekly trend
    const weeklyData = {};
    dateArray.forEach(item => {
      const weekNumber = moment(item.date).week();
      const year = moment(item.date).year();
      const weekKey = `${year}-W${weekNumber}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekKey,
          date: item.date, // Use the first date of this week
          suggestions: 0,
          acceptances: 0
        };
      }
      
      weeklyData[weekKey].suggestions += item.inlineSuggestions;
      weeklyData[weekKey].acceptances += item.inlineAcceptances;
    });
    
    // Convert weekly data to array and calculate rates
    summary.trendAnalysis.weekly = Object.values(weeklyData).map(week => ({
      weekKey: week.weekKey,
      date: week.date,
      acceptanceRate: week.suggestions > 0 ? (week.acceptances / week.suggestions) * 100 : 0
    })).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    // Calculate monthly trend
    const monthlyData = {};
    dateArray.forEach(item => {
      const monthKey = moment(item.date).format('YYYY-MM');
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthKey,
          date: item.date, // Use the first date of this month
          suggestions: 0,
          acceptances: 0
        };
      }
      
      monthlyData[monthKey].suggestions += item.inlineSuggestions;
      monthlyData[monthKey].acceptances += item.inlineAcceptances;
    });
    
    // Convert monthly data to array and calculate rates
    summary.trendAnalysis.monthly = Object.values(monthlyData).map(month => ({
      monthKey: month.monthKey,
      date: month.date,
      acceptanceRate: month.suggestions > 0 ? (month.acceptances / month.suggestions) * 100 : 0
    })).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    // Convert byUser and byDate objects to arrays for easier frontend processing
    summary.byUser = Object.values(summary.byUser);
    summary.byDate = Object.values(summary.byDate).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

// Get comparative metrics between two periods
app.get('/api/activity/compare', async (req, res) => {
  try {
    let { startDate, endDate, compareStartDate, compareEndDate, userIds } = req.query;
    
    // Set default date ranges if not provided (last 1 week)
    if (!startDate || !endDate) {
      endDate = moment().format('YYYY-MM-DD');
      startDate = moment().subtract(1, 'week').format('YYYY-MM-DD');
    } else {
      // Validate date formats for primary date range
      if (!moment(startDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ error: 'Invalid startDate format. Use YYYY-MM-DD' });
      }
      if (!moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ error: 'Invalid endDate format. Use YYYY-MM-DD' });
      }
      
      // Validate date range logic
      if (moment(endDate).isBefore(startDate)) {
        return res.status(400).json({ error: 'endDate cannot be before startDate' });
      }
    }

    if (!compareStartDate || !compareEndDate) {
      compareEndDate = moment(startDate).subtract(1, 'day').format('YYYY-MM-DD');
      compareStartDate = moment(compareEndDate).subtract(1, 'week').format('YYYY-MM-DD');
    } else {
      // Validate date formats for comparison date range
      if (!moment(compareStartDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ error: 'Invalid compareStartDate format. Use YYYY-MM-DD' });
      }
      if (!moment(compareEndDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ error: 'Invalid compareEndDate format. Use YYYY-MM-DD' });
      }
      
      // Validate comparison date range logic
      if (moment(compareEndDate).isBefore(compareStartDate)) {
        return res.status(400).json({ error: 'compareEndDate cannot be before compareStartDate' });
      }
    }

    // Function to get metrics for a specific date range using Query operation
    const getMetricsForPeriod = async (start, end, userFilter) => {
      const metrics = {
        aiCodeLines: 0,
        chatInteractions: 0,
        inlineSuggestions: 0,
        inlineAcceptances: 0
      };

      const startDateFormatted = moment(start).startOf('day').format('YYYY-MM-DD');
      const endDateFormatted = moment(end).endOf('day').format('YYYY-MM-DD');

      // If no userFilter provided, get all users first
      let userIdList = [];
      if (!userFilter) {
        const usersParams = {
          TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
          ProjectionExpression: 'UserId'
        };
        const userScan = await docClient.scan(usersParams).promise();
        userIdList = [...new Set(userScan.Items.map(item => item.UserId))];
      } else {
        userIdList = userFilter.split(',');
      }

      // Query each user's data in parallel
      const userQueries = userIdList.map(async userId => {
        const params = {
          TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
          KeyConditionExpression: 'UserId = :userId AND #date BETWEEN :startDate AND :endDate',
          ExpressionAttributeNames: {
            '#date': 'Date'
          },
          ExpressionAttributeValues: {
            ':userId': userId.trim(),
            ':startDate': startDateFormatted,
            ':endDate': endDateFormatted
          }
        };

        const queryResults = await docClient.query(params).promise();
        
        // Aggregate metrics from query results
        return queryResults.Items.reduce((acc, item) => {
          acc.aiCodeLines += parseInt(item.Chat_AICodeLines || 0) + parseInt(item.Inline_AICodeLines || 0);
          acc.chatInteractions += parseInt(item.Chat_MessagesInteracted || 0);
          acc.inlineSuggestions += parseInt(item.Inline_SuggestionsCount || 0);
          acc.inlineAcceptances += parseInt(item.Inline_AcceptanceCount || 0);
          return acc;
        }, {
          aiCodeLines: 0,
          chatInteractions: 0,
          inlineSuggestions: 0,
          inlineAcceptances: 0
        });
      });

      // Wait for all user queries to complete and combine results
      const userResults = await Promise.all(userQueries);
      return userResults.reduce((total, userMetrics) => {
        total.aiCodeLines += userMetrics.aiCodeLines;
        total.chatInteractions += userMetrics.chatInteractions;
        total.inlineSuggestions += userMetrics.inlineSuggestions;
        total.inlineAcceptances += userMetrics.inlineAcceptances;
        return total;
      }, metrics);
    };
    
    // Get metrics for both periods
    const [currentMetrics, previousMetrics] = await Promise.all([
      getMetricsForPeriod(startDate, endDate, userIds),
      getMetricsForPeriod(compareStartDate, compareEndDate, userIds)
    ]);
    
    res.json({
      current: currentMetrics,
      previous: previousMetrics
    });
  } catch (error) {
    console.error('Error fetching comparative metrics:', error);
    res.status(500).json({ error: 'Failed to fetch comparative metrics' });
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
      // Use contains() to match userId as part of the stored UserId which may have a prefix
      filterExpressions.push('contains(UserId, :userId)');
      expressionAttributeValues[':userId'] = userId.trim();
      console.log(`Searching for UserId containing: ${userId.trim()}`);
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
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
