const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const moment = require('moment');
const logger = require('./logger'); // We'll create this logger module later

// Authorization middleware
const authorize = (req, res, next) => {
  // Check for authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Authorization required',
      code: 'UNAUTHORIZED'
    });
  }
  
  // In a real application, you would validate the token/credentials here
  // For now, we'll just check if the header exists
  // TODO: Implement proper token validation
  
  next();
};

// Configure AWS
const docClient = new AWS.DynamoDB.DocumentClient();

/**
 * Get productivity trends over time
 * Analyzes productivity metrics over specified time periods
 */
router.get('/productivity', authorize, async (req, res) => {
  try {
    const { userId, startDate, endDate, interval = 'day' } = req.query;
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required',
        code: 'INVALID_PARAMETERS'
      });
    }
    
    // Validate interval parameter
    const validIntervals = ['day', 'week', 'month'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ 
        error: 'Invalid interval. Must be one of: day, week, month',
        code: 'INVALID_PARAMETERS'
      });
    }
    
    // Set up query parameters
    const params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      IndexName: 'DateIndex', // Assuming there's a GSI on the Date field
      KeyConditionExpression: '#date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      },
      ExpressionAttributeValues: {
        ':startDate': startDate,
        ':endDate': endDate
      }
    };
    
    // Add user filter if provided
    if (userId) {
      params.FilterExpression = 'UserId = :userId';
      params.ExpressionAttributeValues[':userId'] = userId;
    }
    
    // Use query instead of scan for better performance
    let activityData;
    try {
      activityData = await docClient.query(params).promise();
    } catch (error) {
      // If DateIndex doesn't exist, fall back to scan with filter
      if (error.code === 'ValidationException' && error.message.includes('IndexName')) {
        delete params.IndexName;
        delete params.KeyConditionExpression;
        
        params.FilterExpression = params.FilterExpression 
          ? `#date BETWEEN :startDate AND :endDate AND ${params.FilterExpression}`
          : '#date BETWEEN :startDate AND :endDate';
          
        activityData = await docClient.scan(params).promise();
        
        // Log warning about inefficient operation
        logger.warn('Using scan operation instead of query. Consider creating a GSI on Date field for better performance.');
      } else {
        throw error;
      }
    }
    
    // Group data by time interval
    const groupedData = groupDataByTimeInterval(activityData.Items, interval);
    
    // Calculate trends
    const trends = calculateProductivityTrends(groupedData);
    
    res.json(trends);
  } catch (error) {
    logger.error('Error fetching productivity trends:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'An error occurred while fetching productivity trends',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Get before/after adoption comparison
 * Compares metrics before and after Amazon Q adoption
 */
router.get('/adoption', authorize, async (req, res) => {
  try {
    const { userId, daysBeforeAfter = 30 } = req.query;
    
    // Validate parameters
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        code: 'INVALID_PARAMETERS'
      });
    }
    
    // First, determine the adoption date (first usage of Amazon Q)
    const adoptionParams = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      FilterExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ProjectionExpression: 'Date'
    };
    
    const adoptionResult = await docClient.scan(adoptionParams).promise();
    
    if (!adoptionResult.Items || adoptionResult.Items.length === 0) {
      return res.status(404).json({ 
        error: 'No activity data found for this user',
        code: 'NOT_FOUND'
      });
    }
    
    // Find the earliest date
    const adoptionDate = adoptionResult.Items
      .map(item => moment(item.Date))
      .sort((a, b) => a - b)[0]
      .format('YYYY-MM-DD');
    
    // Calculate before and after date ranges
    const beforeStartDate = moment(adoptionDate).subtract(daysBeforeAfter, 'days').format('YYYY-MM-DD');
    const afterEndDate = moment(adoptionDate).add(daysBeforeAfter, 'days').format('YYYY-MM-DD');
    
    // Get data before adoption
    const beforeParams = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      FilterExpression: 'UserId = :userId AND #date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':startDate': beforeStartDate,
        ':endDate': moment(adoptionDate).subtract(1, 'day').format('YYYY-MM-DD')
      }
    };
    
    // Get data after adoption
    const afterParams = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      FilterExpression: 'UserId = :userId AND #date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':startDate': adoptionDate,
        ':endDate': afterEndDate
      }
    };
    
    // Execute both queries in parallel for better performance
    const [beforeData, afterData] = await Promise.all([
      docClient.scan(beforeParams).promise(),
      docClient.scan(afterParams).promise()
    ]);
    
    // Calculate metrics for before and after periods
    const beforeMetrics = calculateAggregateMetrics(beforeData.Items);
    const afterMetrics = calculateAggregateMetrics(afterData.Items);
    
    // Calculate percentage changes
    const comparison = calculatePercentageChanges(beforeMetrics, afterMetrics);
    
    res.json({
      adoptionDate,
      beforePeriod: {
        startDate: beforeStartDate,
        endDate: moment(adoptionDate).subtract(1, 'day').format('YYYY-MM-DD'),
        metrics: beforeMetrics
      },
      afterPeriod: {
        startDate: adoptionDate,
        endDate: afterEndDate,
        metrics: afterMetrics
      },
      percentageChanges: comparison
    });
  } catch (error) {
    logger.error('Error fetching adoption comparison:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'An error occurred while fetching adoption comparison',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Get correlation analysis between Amazon Q usage and productivity metrics
 */
router.get('/correlation', authorize, async (req, res) => {
  try {
    const { startDate, endDate, metric = 'aiCodeLines' } = req.query;
    
    // Validate parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required',
        code: 'INVALID_PARAMETERS'
      });
    }
    
    // Validate metric parameter
    const validMetrics = ['aiCodeLines', 'chatInteractions', 'inlineSuggestions', 'inlineAcceptances'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ 
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
        code: 'INVALID_PARAMETERS'
      });
    }
    
    // Set up query parameters
    const params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      FilterExpression: '#date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      },
      ExpressionAttributeValues: {
        ':startDate': startDate,
        ':endDate': endDate
      }
    };
    
    // Use scan operation (consider optimizing with query if possible)
    const result = await docClient.scan(params).promise();
    
    // Calculate correlation data
    const correlationData = calculateCorrelation(result.Items, metric);
    
    res.json(correlationData);
  } catch (error) {
    logger.error('Error fetching correlation analysis:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'An error occurred while fetching correlation analysis',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Export trend data in CSV format
 */
router.get('/export', authorize, async (req, res) => {
  try {
    const { type, userId, startDate, endDate } = req.query;
    
    // Validate parameters
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Type, start date, and end date are required',
        code: 'INVALID_PARAMETERS'
      });
    }
    
    // Validate type parameter
    const validTypes = ['productivity', 'adoption', 'correlation'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_PARAMETERS'
      });
    }
    
    // Set up query parameters
    const params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      FilterExpression: '#date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      },
      ExpressionAttributeValues: {
        ':startDate': startDate,
        ':endDate': endDate
      }
    };
    
    // Add user filter if provided
    if (userId) {
      params.FilterExpression += ' AND UserId = :userId';
      params.ExpressionAttributeValues[':userId'] = userId;
    }
    
    // Use scan operation
    const result = await docClient.scan(params).promise();
    
    // Generate CSV data based on type
    let csvData;
    switch (type) {
      case 'productivity':
        csvData = generateProductivityCsv(result.Items);
        break;
      case 'adoption':
        if (!userId) {
          return res.status(400).json({ 
            error: 'User ID is required for adoption export',
            code: 'INVALID_PARAMETERS'
          });
        }
        csvData = generateAdoptionCsv(result.Items, userId);
        break;
      case 'correlation':
        csvData = generateCorrelationCsv(result.Items);
        break;
    }
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-trends-${startDate}-to-${endDate}.csv`);
    
    res.send(csvData);
  } catch (error) {
    logger.error('Error exporting trend data:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'An error occurred while exporting trend data',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});