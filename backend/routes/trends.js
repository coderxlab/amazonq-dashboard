const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const moment = require('moment');
const logger = require('../logger');
const {
  groupDataByTimeInterval,
  calculateProductivityTrends,
  calculateAggregateMetrics,
  calculatePercentageChanges,
  calculateCorrelation,
  generateProductivityCsv,
  generateAdoptionCsv,
  generateCorrelationCsv
} = require('../utils/trendHelpers');
const { awsConfig } = require('../config');

AWS.config.update(awsConfig);

// Configure AWS 
const docClient = new AWS.DynamoDB.DocumentClient();

/**
 * Get productivity trends over time
 * Analyzes productivity metrics over specified time periods
 */
router.get('/productivity', async (req, res) => {
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
    
    // Set up scan parameters
    const params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE
    };

    // Build filter expressions
    let filterExpressions = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};

    // Add date range filter
    filterExpressions.push('#date BETWEEN :startDate AND :endDate');
    expressionAttributeNames['#date'] = 'Date';
    expressionAttributeValues[':startDate'] = startDate;
    expressionAttributeValues[':endDate'] = endDate;

    // Add user filter if provided
    if (userId) {
      filterExpressions.push('UserId = :userId');
      expressionAttributeValues[':userId'] = userId;
    }

    // Add filter expressions to params
    params.FilterExpression = filterExpressions.join(' AND ');
    params.ExpressionAttributeValues = expressionAttributeValues;
    params.ExpressionAttributeNames = expressionAttributeNames;

    // Use scan operation
    const activityData = await docClient.scan(params).promise();

    // Additional client-side date filtering for accuracy
    let filteredItems = activityData.Items;
    const startMoment = moment(startDate).startOf('day');
    const endMoment = moment(endDate).endOf('day');
    
    filteredItems = filteredItems.filter(item => {
      const itemDate = moment(item.Date);
      return itemDate.isBetween(startMoment, endMoment, null, '[]');
    });
    
    // Group data by time interval
    const groupedData = groupDataByTimeInterval(filteredItems, interval);
    
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
router.get('/adoption', async (req, res) => {
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
      ProjectionExpression: '#date',
      ExpressionAttributeNames: {
        '#date': 'Date'
      }
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
    
    // Set up scan parameters for before and after data
    const baseParams = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE,
      FilterExpression: 'UserId = :userId AND #date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'Date'
      }
    };
    
    // Get data before adoption
    const beforeParams = {
      ...baseParams,
      ExpressionAttributeValues: {
        ':userId': userId,
        ':startDate': beforeStartDate,
        ':endDate': moment(adoptionDate).subtract(1, 'day').format('YYYY-MM-DD')
      }
    };
    
    // Get data after adoption
    const afterParams = {
      ...baseParams,
      ExpressionAttributeValues: {
        ':userId': userId,
        ':startDate': adoptionDate,
        ':endDate': afterEndDate
      }
    };
    
    // Execute both scans in parallel for better performance
    const [beforeData, afterData] = await Promise.all([
      docClient.scan(beforeParams).promise(),
      docClient.scan(afterParams).promise()
    ]);
    
    // Additional client-side date filtering for accuracy
    const beforeStartMoment = moment(beforeStartDate).startOf('day');
    const beforeEndMoment = moment(adoptionDate).subtract(1, 'day').endOf('day');
    const afterStartMoment = moment(adoptionDate).startOf('day');
    const afterEndMoment = moment(afterEndDate).endOf('day');
    
    const filteredBeforeData = beforeData.Items.filter(item => {
      const itemDate = moment(item.Date);
      return itemDate.isBetween(beforeStartMoment, beforeEndMoment, null, '[]');
    });
    
    const filteredAfterData = afterData.Items.filter(item => {
      const itemDate = moment(item.Date);
      return itemDate.isBetween(afterStartMoment, afterEndMoment, null, '[]');
    });
    
    // Calculate metrics for before and after periods
    const beforeMetrics = calculateAggregateMetrics(filteredBeforeData);
    const afterMetrics = calculateAggregateMetrics(filteredAfterData);
    
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
router.get('/correlation', async (req, res) => {
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
    
    // Set up scan parameters
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
    
    // Use scan operation
    const result = await docClient.scan(params).promise();
    
    // Additional client-side date filtering for accuracy
    const startMoment = moment(startDate).startOf('day');
    const endMoment = moment(endDate).endOf('day');
    
    const filteredItems = result.Items.filter(item => {
      const itemDate = moment(item.Date);
      return itemDate.isBetween(startMoment, endMoment, null, '[]');
    });
    
    // Calculate correlation data
    const correlationData = calculateCorrelation(filteredItems, metric);
    
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
router.get('/export', async (req, res) => {
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
    
    // Set up scan parameters
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
    
    // Additional client-side date filtering for accuracy
    const startMoment = moment(startDate).startOf('day');
    const endMoment = moment(endDate).endOf('day');
    
    const filteredItems = result.Items.filter(item => {
      const itemDate = moment(item.Date);
      return itemDate.isBetween(startMoment, endMoment, null, '[]');
    });
    
    // Generate CSV data based on type
    let csvData;
    switch (type) {
      case 'productivity':
        csvData = generateProductivityCsv(filteredItems);
        break;
      case 'adoption':
        if (!userId) {
          return res.status(400).json({ 
            error: 'User ID is required for adoption export',
            code: 'INVALID_PARAMETERS'
          });
        }
        csvData = generateAdoptionCsv(filteredItems, userId);
        break;
      case 'correlation':
        csvData = generateCorrelationCsv(filteredItems);
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

/**
 * Get activity logs with optional filtering
 */
router.get('/activity', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    // Set up base scan parameters
    let params = {
      TableName: process.env.DYNAMODB_USER_ACTIVITY_LOG_TABLE
    };

    // Build filter expressions
    let filterExpressions = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};

    // Add date range filter if provided
    if (startDate && endDate) {
      filterExpressions.push('#date BETWEEN :startDate AND :endDate');
      expressionAttributeNames['#date'] = 'Date';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    }

    // Add user filter if provided
    if (userId) {
      filterExpressions.push('UserId = :userId');
      expressionAttributeValues[':userId'] = userId;
    }

    // Add filter expressions to params if any exist
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
    }

    // Use scan operation
    const scanResults = await docClient.scan(params).promise();

    // Filter results by date range if provided (additional client-side filtering)
    let results = scanResults.Items;
    if (startDate && endDate) {
      const startMoment = moment(startDate).startOf('day');
      const endMoment = moment(endDate).endOf('day');
      
      results = results.filter(item => {
        const itemDate = moment(item.Date);
        return itemDate.isBetween(startMoment, endMoment, null, '[]');
      });
    }

    res.json(results);
  } catch (error) {
    logger.error('Error fetching activity logs:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'Failed to fetch activity logs',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Export the router
module.exports = router;