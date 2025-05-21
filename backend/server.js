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


module.exports = app;
