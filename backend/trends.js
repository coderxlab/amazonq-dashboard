// Trend analysis endpoints for Amazon Q Developer Productivity Dashboard
const express = require('express');
const moment = require('moment');
const router = express.Router();

// Get trend analysis data
router.get('/api/trends', async (req, res) => {
  try {
    const { userId, startDate, endDate, period = 'day', windowSize = 3 } = req.query;
    
    // Get the document client from the parent module
    const docClient = req.app.get('docClient');
    
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
        const itemDate = parseDate(item.Date);
        if (!itemDate) return false;
        
        return itemDate.isBetween(startMoment, endMoment, null, '[]');
      });
    }
    
    // Group data by time period
    const groupedData = groupByTimePeriod(results, period);
    
    // Calculate moving averages
    const dataWithMA = calculateMovingAverages(groupedData, parseInt(windowSize));
    
    // Calculate growth rates
    const dataWithGrowth = calculateGrowthRates(dataWithMA);
    
    // Calculate productivity metrics
    const trendData = calculateProductivityMetrics(dataWithGrowth);
    
    res.json({
      period,
      windowSize: parseInt(windowSize),
      data: trendData
    });
  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// Get before/after adoption comparison
router.get('/api/adoption-impact', async (req, res) => {
  try {
    const { userId, windowDays = 30 } = req.query;
    
    // Get the document client from the parent module
    const docClient = req.app.get('docClient');
    
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
    const results = scanResults.Items;
    
    // Group data by user
    const userAdoptionData = {};
    
    results.forEach(item => {
      const userId = item.UserId;
      const itemDate = parseDate(item.Date);
      if (!itemDate) return;
      
      if (!userAdoptionData[userId]) {
        userAdoptionData[userId] = {
          userId,
          firstUsageDate: itemDate,
          lastUsageDate: itemDate,
          activities: []
        };
      }
      
      // Update first and last usage dates
      if (itemDate.isBefore(userAdoptionData[userId].firstUsageDate)) {
        userAdoptionData[userId].firstUsageDate = itemDate;
      }
      if (itemDate.isAfter(userAdoptionData[userId].lastUsageDate)) {
        userAdoptionData[userId].lastUsageDate = itemDate;
      }
      
      // Add activity data
      userAdoptionData[userId].activities.push({
        date: itemDate,
        chatAICodeLines: parseInt(item.Chat_AICodeLines || 0),
        chatMessagesInteracted: parseInt(item.Chat_MessagesInteracted || 0),
        inlineAICodeLines: parseInt(item.Inline_AICodeLines || 0),
        inlineAcceptanceCount: parseInt(item.Inline_AcceptanceCount || 0),
        inlineSuggestionsCount: parseInt(item.Inline_SuggestionsCount || 0)
      });
    });
    
    // Calculate before/after metrics for each user
    const adoptionImpact = Object.values(userAdoptionData).map(userData => {
      // Sort activities by date
      userData.activities.sort((a, b) => a.date.diff(b.date));
      
      const adoptionDate = userData.firstUsageDate;
      const windowDuration = parseInt(windowDays);
      
      // Get activities before adoption (if any)
      const beforeActivities = userData.activities.filter(activity => 
        activity.date.isBefore(adoptionDate.clone().add(windowDuration, 'days'))
      );
      
      // Get activities after adoption
      const afterActivities = userData.activities.filter(activity => 
        activity.date.isAfter(adoptionDate.clone().add(windowDuration, 'days'))
      );
      
      // Calculate metrics for before period
      const beforeMetrics = {
        period: 'before',
        totalDays: beforeActivities.length,
        aiCodeLines: beforeActivities.reduce((sum, act) => sum + act.chatAICodeLines + act.inlineAICodeLines, 0),
        chatInteractions: beforeActivities.reduce((sum, act) => sum + act.chatMessagesInteracted, 0),
        inlineSuggestions: beforeActivities.reduce((sum, act) => sum + act.inlineSuggestionsCount, 0),
        inlineAcceptances: beforeActivities.reduce((sum, act) => sum + act.inlineAcceptanceCount, 0)
      };
      
      // Calculate metrics for after period
      const afterMetrics = {
        period: 'after',
        totalDays: afterActivities.length,
        aiCodeLines: afterActivities.reduce((sum, act) => sum + act.chatAICodeLines + act.inlineAICodeLines, 0),
        chatInteractions: afterActivities.reduce((sum, act) => sum + act.chatMessagesInteracted, 0),
        inlineSuggestions: afterActivities.reduce((sum, act) => sum + act.inlineSuggestionsCount, 0),
        inlineAcceptances: afterActivities.reduce((sum, act) => sum + act.inlineAcceptanceCount, 0)
      };
      
      // Calculate daily averages
      if (beforeMetrics.totalDays > 0) {
        beforeMetrics.aiCodeLinesPerDay = beforeMetrics.aiCodeLines / beforeMetrics.totalDays;
        beforeMetrics.chatInteractionsPerDay = beforeMetrics.chatInteractions / beforeMetrics.totalDays;
        beforeMetrics.inlineSuggestionsPerDay = beforeMetrics.inlineSuggestions / beforeMetrics.totalDays;
        beforeMetrics.inlineAcceptancesPerDay = beforeMetrics.inlineAcceptances / beforeMetrics.totalDays;
      }
      
      if (afterMetrics.totalDays > 0) {
        afterMetrics.aiCodeLinesPerDay = afterMetrics.aiCodeLines / afterMetrics.totalDays;
        afterMetrics.chatInteractionsPerDay = afterMetrics.chatInteractions / afterMetrics.totalDays;
        afterMetrics.inlineSuggestionsPerDay = afterMetrics.inlineSuggestions / afterMetrics.totalDays;
        afterMetrics.inlineAcceptancesPerDay = afterMetrics.inlineAcceptances / afterMetrics.totalDays;
      }
      
      // Calculate percentage changes
      const changes = {
        aiCodeLinesChange: beforeMetrics.aiCodeLinesPerDay > 0 
          ? ((afterMetrics.aiCodeLinesPerDay - beforeMetrics.aiCodeLinesPerDay) / beforeMetrics.aiCodeLinesPerDay) * 100 
          : null,
        chatInteractionsChange: beforeMetrics.chatInteractionsPerDay > 0 
          ? ((afterMetrics.chatInteractionsPerDay - beforeMetrics.chatInteractionsPerDay) / beforeMetrics.chatInteractionsPerDay) * 100 
          : null,
        inlineSuggestionsChange: beforeMetrics.inlineSuggestionsPerDay > 0 
          ? ((afterMetrics.inlineSuggestionsPerDay - beforeMetrics.inlineSuggestionsPerDay) / beforeMetrics.inlineSuggestionsPerDay) * 100 
          : null,
        inlineAcceptancesChange: beforeMetrics.inlineAcceptancesPerDay > 0 
          ? ((afterMetrics.inlineAcceptancesPerDay - beforeMetrics.inlineAcceptancesPerDay) / beforeMetrics.inlineAcceptancesPerDay) * 100 
          : null
      };
      
      return {
        userId: userData.userId,
        adoptionDate: adoptionDate.format('YYYY-MM-DD'),
        windowDays: windowDuration,
        before: beforeMetrics,
        after: afterMetrics,
        changes
      };
    });
    
    res.json(adoptionImpact);
  } catch (error) {
    console.error('Error calculating adoption impact:', error);
    res.status(500).json({ error: 'Failed to calculate adoption impact' });
  }
});

// Get correlation analysis
router.get('/api/correlation', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    // Get the document client from the parent module
    const docClient = req.app.get('docClient');
    
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
        const itemDate = parseDate(item.Date);
        if (!itemDate) return false;
        
        return itemDate.isBetween(startMoment, endMoment, null, '[]');
      });
    }
    
    // Prepare data for correlation analysis
    const correlationData = results.map(item => {
      return {
        date: item.Date,
        chatAICodeLines: parseInt(item.Chat_AICodeLines || 0),
        chatMessagesInteracted: parseInt(item.Chat_MessagesInteracted || 0),
        inlineAICodeLines: parseInt(item.Inline_AICodeLines || 0),
        inlineAcceptanceCount: parseInt(item.Inline_AcceptanceCount || 0),
        inlineSuggestionsCount: parseInt(item.Inline_SuggestionsCount || 0),
        totalAICodeLines: parseInt(item.Chat_AICodeLines || 0) + parseInt(item.Inline_AICodeLines || 0)
      };
    });
    
    // Calculate correlation coefficients
    const correlations = calculateCorrelations(correlationData);
    
    // Prepare scatter plot data
    const scatterData = prepareScatterData(correlationData);
    
    res.json({
      correlations,
      scatterData
    });
  } catch (error) {
    console.error('Error calculating correlations:', error);
    res.status(500).json({ error: 'Failed to calculate correlations' });
  }
});

// Helper function to parse date from various formats
const parseDate = (dateString) => {
  if (typeof dateString === 'string') {
    // Try different date formats
    if (dateString.includes('-')) {
      // Format: YYYY-MM-DD
      return moment(dateString);
    } else if (dateString.includes('/')) {
      // Format: MM/DD/YYYY
      return moment(dateString, 'MM/DD/YYYY');
    } else {
      // Format: MM-DD-YYYY
      return moment(dateString, 'MM-DD-YYYY');
    }
  } 
  // If Date is in DynamoDB format with S attribute
  else if (dateString && dateString.S) {
    return moment(dateString.S);
  }
  return null;
};

// Helper function to group data by time period (day, week, month)
const groupByTimePeriod = (data, period) => {
  const groupedData = {};
  
  data.forEach(item => {
    const date = parseDate(item.Date);
    if (!date) return;
    
    let periodKey;
    
    switch(period) {
      case 'day':
        periodKey = date.format('YYYY-MM-DD');
        break;
      case 'week':
        periodKey = `${date.year()}-W${date.isoWeek()}`;
        break;
      case 'month':
        periodKey = date.format('YYYY-MM');
        break;
      default:
        periodKey = date.format('YYYY-MM-DD');
    }
    
    if (!groupedData[periodKey]) {
      groupedData[periodKey] = {
        period: periodKey,
        aiCodeLines: 0,
        chatInteractions: 0,
        inlineSuggestions: 0,
        inlineAcceptances: 0,
        count: 0
      };
    }
    
    // Parse numeric values (handling potential undefined values)
    const chatAICodeLines = parseInt(item.Chat_AICodeLines || 0);
    const chatMessagesInteracted = parseInt(item.Chat_MessagesInteracted || 0);
    const inlineAICodeLines = parseInt(item.Inline_AICodeLines || 0);
    const inlineAcceptanceCount = parseInt(item.Inline_AcceptanceCount || 0);
    const inlineSuggestionsCount = parseInt(item.Inline_SuggestionsCount || 0);
    
    // Update totals
    groupedData[periodKey].aiCodeLines += chatAICodeLines + inlineAICodeLines;
    groupedData[periodKey].chatInteractions += chatMessagesInteracted;
    groupedData[periodKey].inlineSuggestions += inlineSuggestionsCount;
    groupedData[periodKey].inlineAcceptances += inlineAcceptanceCount;
    groupedData[periodKey].count += 1;
  });
  
  // Convert to array and sort by period
  return Object.values(groupedData).sort((a, b) => {
    return a.period.localeCompare(b.period);
  });
};

// Calculate moving averages for trend smoothing
const calculateMovingAverages = (data, windowSize = 3) => {
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    const window = [];
    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      window.push(data[j]);
    }
    
    const avgItem = { ...data[i] };
    
    // Calculate averages for each metric
    const metrics = ['aiCodeLines', 'chatInteractions', 'inlineSuggestions', 'inlineAcceptances'];
    metrics.forEach(metric => {
      const sum = window.reduce((acc, item) => acc + item[metric], 0);
      avgItem[`${metric}MA`] = sum / window.length;
    });
    
    result.push(avgItem);
  }
  
  return result;
};

// Calculate growth rates between periods
const calculateGrowthRates = (data) => {
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    const item = { ...data[i] };
    
    if (i > 0) {
      const prevItem = data[i-1];
      const metrics = ['aiCodeLines', 'chatInteractions', 'inlineSuggestions', 'inlineAcceptances'];
      
      metrics.forEach(metric => {
        if (prevItem[metric] > 0) {
          item[`${metric}Growth`] = ((item[metric] - prevItem[metric]) / prevItem[metric]) * 100;
        } else {
          item[`${metric}Growth`] = 0;
        }
      });
    } else {
      // First item has no growth rate
      item.aiCodeLinesGrowth = 0;
      item.chatInteractionsGrowth = 0;
      item.inlineSuggestionsGrowth = 0;
      item.inlineAcceptancesGrowth = 0;
    }
    
    result.push(item);
  }
  
  return result;
};

// Calculate productivity metrics
const calculateProductivityMetrics = (data) => {
  return data.map(item => {
    const result = { ...item };
    
    // Calculate acceptance rate
    if (item.inlineSuggestions > 0) {
      result.acceptanceRate = (item.inlineAcceptances / item.inlineSuggestions) * 100;
    } else {
      result.acceptanceRate = 0;
    }
    
    // Calculate productivity score (a composite metric)
    result.productivityScore = (
      (item.aiCodeLines * 0.4) + 
      (item.chatInteractions * 0.2) + 
      (item.inlineAcceptances * 0.4)
    );
    
    return result;
  });
};

// Calculate correlation coefficients
const calculateCorrelations = (data) => {
  // Define the metrics to correlate
  const metrics = [
    'chatAICodeLines',
    'chatMessagesInteracted',
    'inlineAICodeLines',
    'inlineAcceptanceCount',
    'inlineSuggestionsCount',
    'totalAICodeLines'
  ];
  
  const correlations = {};
  
  // Calculate correlation between each pair of metrics
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const metric1 = metrics[i];
      const metric2 = metrics[j];
      
      // Extract values for the two metrics
      const values1 = data.map(item => item[metric1]);
      const values2 = data.map(item => item[metric2]);
      
      // Calculate correlation coefficient
      const correlation = pearsonCorrelation(values1, values2);
      
      // Store the correlation
      if (!correlations[metric1]) {
        correlations[metric1] = {};
      }
      correlations[metric1][metric2] = correlation;
      
      // Store the reverse correlation as well
      if (!correlations[metric2]) {
        correlations[metric2] = {};
      }
      correlations[metric2][metric1] = correlation;
    }
  }
  
  return correlations;
};

// Calculate Pearson correlation coefficient
const pearsonCorrelation = (x, y) => {
  const n = x.length;
  
  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate covariance and standard deviations
  let covariance = 0;
  let varX = 0;
  let varY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    
    covariance += diffX * diffY;
    varX += diffX * diffX;
    varY += diffY * diffY;
  }
  
  // Handle division by zero
  if (varX === 0 || varY === 0) {
    return 0;
  }
  
  // Calculate correlation coefficient
  return covariance / Math.sqrt(varX * varY);
};

// Prepare scatter plot data for visualization
const prepareScatterData = (data) => {
  // Define the metrics to include in scatter plots
  const metrics = [
    'chatAICodeLines',
    'chatMessagesInteracted',
    'inlineAICodeLines',
    'inlineAcceptanceCount',
    'inlineSuggestionsCount',
    'totalAICodeLines'
  ];
  
  const scatterData = {};
  
  // Create scatter plot data for each pair of metrics
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const metric1 = metrics[i];
      const metric2 = metrics[j];
      
      // Create data points for the scatter plot
      const points = data.map(item => ({
        x: item[metric1],
        y: item[metric2],
        date: item.date
      }));
      
      // Store the scatter plot data
      const key = `${metric1}_vs_${metric2}`;
      scatterData[key] = {
        xLabel: metric1,
        yLabel: metric2,
        points
      };
    }
  }
  
  return scatterData;
};

module.exports = router;