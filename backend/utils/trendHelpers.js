const moment = require('moment');

/**
 * Groups activity data by specified time interval
 * @param {Array} data - Array of activity log entries
 * @param {string} interval - Time interval ('day', 'week', or 'month')
 * @returns {Object} Data grouped by time interval
 */
function groupDataByTimeInterval(data, interval) {
  const groupedData = {};

  data.forEach(item => {
    let groupKey;
    const itemDate = moment(item.Date);

    switch (interval) {
      case 'week':
        groupKey = itemDate.startOf('week').format('YYYY-MM-DD');
        break;
      case 'month':
        groupKey = itemDate.startOf('month').format('YYYY-MM');
        break;
      default: // day
        groupKey = item.Date;
    }

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        date: groupKey,
        aiCodeLines: 0,
        chatInteractions: 0,
        inlineSuggestions: 0,
        inlineAcceptances: 0,
        users: new Set()
      };
    }

    // Aggregate metrics
    groupedData[groupKey].aiCodeLines += parseInt(item.Chat_AICodeLines || 0) + parseInt(item.Inline_AICodeLines || 0);
    groupedData[groupKey].chatInteractions += parseInt(item.Chat_MessagesInteracted || 0);
    groupedData[groupKey].inlineSuggestions += parseInt(item.Inline_SuggestionsCount || 0);
    groupedData[groupKey].inlineAcceptances += parseInt(item.Inline_AcceptanceCount || 0);
    groupedData[groupKey].users.add(item.UserId);
  });

  // Convert user Sets to counts
  Object.values(groupedData).forEach(group => {
    group.uniqueUsers = group.users.size;
    delete group.users;
  });

  return groupedData;
}

/**
 * Calculates productivity trends from grouped data
 * @param {Object} groupedData - Data grouped by time interval
 * @returns {Object} Calculated trends
 */
function calculateProductivityTrends(groupedData) {
  const trends = {
    timePoints: [],
    metrics: {
      aiCodeLines: [],
      chatInteractions: [],
      inlineSuggestions: [],
      inlineAcceptances: [],
      acceptanceRate: []
    },
    movingAverages: {
      aiCodeLines: [],
      chatInteractions: [],
      inlineSuggestions: [],
      inlineAcceptances: [],
      acceptanceRate: []
    },
    growthRates: {
      aiCodeLines: [],
      chatInteractions: [],
      inlineSuggestions: [],
      inlineAcceptances: [],
      acceptanceRate: []
    },
    totals: {
      aiCodeLines: 0,
      chatInteractions: 0,
      inlineSuggestions: 0,
      inlineAcceptances: 0
    }
  };

  // Sort data points by date
  const sortedData = Object.values(groupedData).sort((a, b) => moment(a.date).diff(moment(b.date)));

  // Calculate moving averages window size (7 days or length of data if smaller)
  const windowSize = Math.min(7, sortedData.length);

  // Pre-calculate acceptance rates for all points to avoid redundant calculations
  const acceptanceRates = sortedData.map(point => 
    point.inlineSuggestions > 0 ? (point.inlineAcceptances / point.inlineSuggestions) * 100 : 0
  );

  sortedData.forEach((point, index) => {
    const acceptanceRate = acceptanceRates[index];
    
    // Add time point
    trends.timePoints.push(point.date);
    
    // Add base metrics in one step
    trends.metrics.aiCodeLines.push(point.aiCodeLines);
    trends.metrics.chatInteractions.push(point.chatInteractions);
    trends.metrics.inlineSuggestions.push(point.inlineSuggestions);
    trends.metrics.inlineAcceptances.push(point.inlineAcceptances);
    trends.metrics.acceptanceRate.push(acceptanceRate);

    // Update totals in the same loop
    trends.totals.aiCodeLines += point.aiCodeLines;
    trends.totals.chatInteractions += point.chatInteractions;
    trends.totals.inlineSuggestions += point.inlineSuggestions;
    trends.totals.inlineAcceptances += point.inlineAcceptances;

    // Calculate moving averages efficiently
    const windowStartIndex = Math.max(0, index - windowSize + 1);
    const windowPoints = sortedData.slice(windowStartIndex, index + 1);
    
    // Calculate sums for moving averages in one pass
    const windowSums = windowPoints.reduce((sums, p, i) => {
      sums.aiCodeLines += p.aiCodeLines;
      sums.chatInteractions += p.chatInteractions;
      sums.inlineSuggestions += p.inlineSuggestions;
      sums.inlineAcceptances += p.inlineAcceptances;
      sums.acceptanceRate += acceptanceRates[windowStartIndex + i];
      return sums;
    }, {
      aiCodeLines: 0,
      chatInteractions: 0,
      inlineSuggestions: 0,
      inlineAcceptances: 0,
      acceptanceRate: 0
    });
    
    // Add moving averages
    const windowLength = windowPoints.length;
    trends.movingAverages.aiCodeLines.push(windowSums.aiCodeLines / windowLength);
    trends.movingAverages.chatInteractions.push(windowSums.chatInteractions / windowLength);
    trends.movingAverages.inlineSuggestions.push(windowSums.inlineSuggestions / windowLength);
    trends.movingAverages.inlineAcceptances.push(windowSums.inlineAcceptances / windowLength);
    trends.movingAverages.acceptanceRate.push(windowSums.acceptanceRate / windowLength);

    // Calculate growth rates
    if (index > 0) {
      const prevPoint = sortedData[index - 1];
      const prevAcceptanceRate = acceptanceRates[index - 1];
      
      trends.growthRates.aiCodeLines.push(
        calculateGrowthRate(prevPoint.aiCodeLines, point.aiCodeLines)
      );
      trends.growthRates.chatInteractions.push(
        calculateGrowthRate(prevPoint.chatInteractions, point.chatInteractions)
      );
      trends.growthRates.inlineSuggestions.push(
        calculateGrowthRate(prevPoint.inlineSuggestions, point.inlineSuggestions)
      );
      trends.growthRates.inlineAcceptances.push(
        calculateGrowthRate(prevPoint.inlineAcceptances, point.inlineAcceptances)
      );
      trends.growthRates.acceptanceRate.push(
        calculateGrowthRate(prevAcceptanceRate, acceptanceRate)
      );
    } else {
      // No growth rate for first point
      trends.growthRates.aiCodeLines.push(null);
      trends.growthRates.chatInteractions.push(null);
      trends.growthRates.inlineSuggestions.push(null);
      trends.growthRates.inlineAcceptances.push(null);
      trends.growthRates.acceptanceRate.push(null);
    }
  });

  return trends;
}

/**
 * Calculates growth rate between two values
 * @param {number} prev - Previous value
 * @param {number} current - Current value
 * @returns {number} Growth rate as a percentage
 */
function calculateGrowthRate(prev, current) {
  if (prev === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - prev) / prev) * 100;
}

/**
 * Calculates aggregate metrics for a set of activity logs
 * @param {Array} data - Array of activity log entries
 * @returns {Object} Aggregated metrics
 */
function calculateAggregateMetrics(data) {
  const metrics = {
    aiCodeLines: 0,
    chatInteractions: 0,
    inlineSuggestions: 0,
    inlineAcceptances: 0,
    uniqueUsers: new Set(),
    daysActive: new Set()
  };

  data.forEach(item => {
    metrics.aiCodeLines += parseInt(item.Chat_AICodeLines || 0) + parseInt(item.Inline_AICodeLines || 0);
    metrics.chatInteractions += parseInt(item.Chat_MessagesInteracted || 0);
    metrics.inlineSuggestions += parseInt(item.Inline_SuggestionsCount || 0);
    metrics.inlineAcceptances += parseInt(item.Inline_AcceptanceCount || 0);
    metrics.uniqueUsers.add(item.UserId);
    metrics.daysActive.add(item.Date);
  });

  // Convert Sets to counts
  metrics.uniqueUsers = metrics.uniqueUsers.size;
  metrics.daysActive = metrics.daysActive.size;

  return metrics;
}

/**
 * Calculates percentage changes between before and after metrics
 * @param {Object} beforeMetrics - Metrics from before period
 * @param {Object} afterMetrics - Metrics from after period
 * @returns {Object} Percentage changes
 */
function calculatePercentageChanges(beforeMetrics, afterMetrics) {
  const changes = {};

  Object.keys(beforeMetrics).forEach(key => {
    if (beforeMetrics[key] === 0) {
      changes[key] = afterMetrics[key] > 0 ? 100 : 0;
    } else {
      changes[key] = ((afterMetrics[key] - beforeMetrics[key]) / beforeMetrics[key]) * 100;
    }
  });

  return changes;
}

/**
 * Calculates correlation between metrics
 * @param {Array} data - Array of activity log entries
 * @param {string} metric - Target metric for correlation analysis
 * @returns {Object} Correlation analysis results
 */
function calculateCorrelation(data, metric) {
  const dailyData = groupDataByTimeInterval(data, 'day');
  const sortedDays = Object.values(dailyData).sort((a, b) => moment(a.date).diff(moment(b.date)));

  const metrics = {
    aiCodeLines: [],
    chatInteractions: [],
    inlineSuggestions: [],
    inlineAcceptances: []
  };

  sortedDays.forEach(day => {
    metrics.aiCodeLines.push(day.aiCodeLines);
    metrics.chatInteractions.push(day.chatInteractions);
    metrics.inlineSuggestions.push(day.inlineSuggestions);
    metrics.inlineAcceptances.push(day.inlineAcceptances);
  });

  const correlations = {};
  const targetMetricValues = metrics[metric];

  Object.keys(metrics).forEach(key => {
    if (key !== metric) {
      correlations[key] = calculatePearsonCorrelation(targetMetricValues, metrics[key]);
    }
  });

  return {
    targetMetric: metric,
    correlations,
    timePoints: sortedDays.map(day => day.date),
    values: {
      [metric]: targetMetricValues,
      ...metrics
    }
  };
}

/**
 * Calculates Pearson correlation coefficient between two arrays
 * @param {Array} x - First array of numbers
 * @param {Array} y - Second array of numbers
 * @returns {number} Correlation coefficient
 */
function calculatePearsonCorrelation(x, y) {
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Generates CSV data for productivity trends
 * @param {Array} data - Array of activity log entries
 * @returns {string} CSV formatted string
 */
function generateProductivityCsv(data) {
  const dailyData = groupDataByTimeInterval(data, 'day');
  const sortedDays = Object.values(dailyData).sort((a, b) => moment(a.date).diff(moment(b.date)));

  const headers = ['Date', 'AI Code Lines', 'Chat Interactions', 'Inline Suggestions', 'Inline Acceptances', 'Acceptance Rate (%)'];
  const rows = sortedDays.map(day => [
    day.date,
    day.aiCodeLines,
    day.chatInteractions,
    day.inlineSuggestions,
    day.inlineAcceptances,
    day.inlineSuggestions > 0 ? ((day.inlineAcceptances / day.inlineSuggestions) * 100).toFixed(2) : '0.00'
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Generates CSV data for adoption comparison
 * @param {Array} data - Array of activity log entries
 * @param {string} userId - User ID for filtering
 * @returns {string} CSV formatted string
 */
function generateAdoptionCsv(data, userId) {
  const userMetrics = calculateAggregateMetrics(data.filter(item => item.UserId === userId));
  const headers = ['Metric', 'Value'];
  const rows = Object.entries(userMetrics).map(([key, value]) => [key, value]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Generates CSV data for correlation analysis
 * @param {Array} data - Array of activity log entries
 * @returns {string} CSV formatted string
 */
function generateCorrelationCsv(data) {
  const metrics = ['aiCodeLines', 'chatInteractions', 'inlineSuggestions', 'inlineAcceptances'];
  const headers = ['Target Metric', ...metrics];
  const rows = metrics.map(metric => {
    const correlations = calculateCorrelation(data, metric).correlations;
    return [
      metric,
      1, // Self-correlation
      ...metrics.filter(m => m !== metric).map(m => correlations[m])
    ];
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

module.exports = {
  groupDataByTimeInterval,
  calculateProductivityTrends,
  calculateAggregateMetrics,
  calculatePercentageChanges,
  calculateCorrelation,
  generateProductivityCsv,
  generateAdoptionCsv,
  generateCorrelationCsv
};