/**
 * Prompt Analytics API Endpoints
 * 
 * This module provides API endpoints for analyzing Amazon Q Developer prompts.
 */

const express = require('express');
const moment = require('moment');
const router = express.Router();

/**
 * Helper function to filter prompt logs by date range
 */
const filterByDateRange = (results, startDate, endDate) => {
  if (!startDate || !endDate) return results;
  
  const startMoment = moment(startDate).startOf('day');
  const endMoment = moment(endDate).endOf('day');
  
  return results.filter(item => {
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
    
    return itemTimestamp.isBetween(startMoment, endMoment, null, '[]');
  });
};

/**
 * Helper function to count words in a string
 */
const countWords = (str) => {
  if (!str) return 0;
  return str.trim().split(/\s+/).length;
};

/**
 * Helper function to categorize prompts based on content
 */
const categorizePrompt = (prompt) => {
  if (!prompt) return 'Unknown';
  
  const promptLower = prompt.toLowerCase();
  
  // Define categories and their keywords
  const categories = {
    'Code Generation': ['create', 'generate', 'write', 'implement', 'code', 'function', 'class', 'method'],
    'Code Explanation': ['explain', 'describe', 'clarify', 'understand', 'what does', 'how does'],
    'Debugging': ['debug', 'fix', 'error', 'issue', 'problem', 'not working', 'fails', 'exception'],
    'Documentation': ['document', 'comment', 'documentation', 'jsdoc', 'javadoc', 'readme'],
    'Best Practices': ['best practice', 'pattern', 'convention', 'standard', 'optimize', 'improve'],
    'Learning': ['learn', 'tutorial', 'guide', 'example', 'how to', 'teach me'],
    'API Usage': ['api', 'endpoint', 'request', 'response', 'http', 'rest', 'graphql']
  };
  
  // Check each category
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => promptLower.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
};

/**
 * Get prompt type distribution
 */
router.get('/type-distribution', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const docClient = req.app.locals.docClient;
    
const { userId, startDate, endDate } = req.query;
    const docClient = req.app.locals.docClient;
    
    const params = buildQueryParams(process.env.DYNAMODB_PROMPT_LOG_TABLE, userId);
    
    const scanResults = await docClient.scan(params).promise();
      TableName: process.env.DYNAMODB_PROMPT_LOG_TABLE
    };
    
    // Add filters if provided
    let filterExpressions = [];
    let expressionAttributeValues = {};
    
    if (userId) {
      filterExpressions.push('UserId = :userId');
      expressionAttributeValues[':userId'] = userId;
    }
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      results = filterByDateRange(results, startDate, endDate);
    }
    
    // Count prompt types
    const typeDistribution = {};
    
    results.forEach(item => {
      const triggerType = item.ChatTriggerType || 'UNKNOWN';
      
      if (!typeDistribution[triggerType]) {
        typeDistribution[triggerType] = 0;
      }
      
      typeDistribution[triggerType]++;
    });
    
    // Convert to array format for easier frontend processing
    const distribution = Object.entries(typeDistribution).map(([type, count]) => ({
      type,
      count
    }));
    
    res.json({
      total: results.length,
      distribution
    });
  } catch (error) {
});
  } catch (error) {
    console.error('Error fetching prompt type distribution:', error);
    res.status(500).json({ error: 'An error occurred while fetching prompt type distribution' });
  }
});
    res.status(500).json({ error: 'Failed to fetch prompt type distribution' });
  }
});

/**
 * Get prompt length distribution
 */
router.get('/length-distribution', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const docClient = req.app.locals.docClient;
    
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
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      results = filterByDateRange(results, startDate, endDate);
    }
    
    // Calculate length metrics
    const lengthData = {
      characterCount: {
        min: Infinity,
        max: 0,
        avg: 0,
        distribution: {
          'Very Short (1-50)': 0,
          'Short (51-100)': 0,
          'Medium (101-250)': 0,
          'Long (251-500)': 0,
          'Very Long (500+)': 0
        }
      },
      wordCount: {
        min: Infinity,
        max: 0,
        avg: 0,
        distribution: {
          'Very Short (1-10)': 0,
          'Short (11-20)': 0,
          'Medium (21-50)': 0,
          'Long (51-100)': 0,
          'Very Long (100+)': 0
        }
      }
    };
    
    let totalCharCount = 0;
    let totalWordCount = 0;
    let validPrompts = 0;
    
    results.forEach(item => {
      if (!item.Prompt || item.Prompt.trim() === '') return;
      
      validPrompts++;
      const charCount = item.Prompt.length;
      const wordCount = countWords(item.Prompt);
      
      // Update character count metrics
      lengthData.characterCount.min = Math.min(lengthData.characterCount.min, charCount);
      lengthData.characterCount.max = Math.max(lengthData.characterCount.max, charCount);
      totalCharCount += charCount;
      
      // Update word count metrics
      lengthData.wordCount.min = Math.min(lengthData.wordCount.min, wordCount);
      lengthData.wordCount.max = Math.max(lengthData.wordCount.max, wordCount);
      totalWordCount += wordCount;
      
      // Update character count distribution
      if (charCount <= 50) {
        lengthData.characterCount.distribution['Very Short (1-50)']++;
      } else if (charCount <= 100) {
        lengthData.characterCount.distribution['Short (51-100)']++;
      } else if (charCount <= 250) {
        lengthData.characterCount.distribution['Medium (101-250)']++;
      } else if (charCount <= 500) {
        lengthData.characterCount.distribution['Long (251-500)']++;
      } else {
        lengthData.characterCount.distribution['Very Long (500+)']++;
      }
      
      // Update word count distribution
      if (wordCount <= 10) {
        lengthData.wordCount.distribution['Very Short (1-10)']++;
      } else if (wordCount <= 20) {
        lengthData.wordCount.distribution['Short (11-20)']++;
      } else if (wordCount <= 50) {
        lengthData.wordCount.distribution['Medium (21-50)']++;
      } else if (wordCount <= 100) {
        lengthData.wordCount.distribution['Long (51-100)']++;
      } else {
        lengthData.wordCount.distribution['Very Long (100+)']++;
      }
    });
    
    // Calculate averages
    if (validPrompts > 0) {
      lengthData.characterCount.avg = Math.round(totalCharCount / validPrompts);
      lengthData.wordCount.avg = Math.round(totalWordCount / validPrompts);
    }
    
    // Handle case where no valid prompts were found
    if (lengthData.characterCount.min === Infinity) {
      lengthData.characterCount.min = 0;
    }
    if (lengthData.wordCount.min === Infinity) {
      lengthData.wordCount.min = 0;
    }
    
    // Convert distributions to array format for easier frontend processing
    lengthData.characterCount.distributionArray = Object.entries(lengthData.characterCount.distribution).map(([range, count]) => ({
      range,
      count
    }));
    
    lengthData.wordCount.distributionArray = Object.entries(lengthData.wordCount.distribution).map(([range, count]) => ({
      range,
      count
    }));
    
    res.json({
      total: validPrompts,
      lengthData
    });
  } catch (error) {
    console.error('Error fetching prompt length distribution:', error);
    res.status(500).json({ error: 'Failed to fetch prompt length distribution' });
  }
});

/**
 * Get prompt categories distribution
 */
router.get('/categories', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const docClient = req.app.locals.docClient;
    
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
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      results = filterByDateRange(results, startDate, endDate);
    }
    
    // Categorize prompts
    const categories = {};
    let validPrompts = 0;
    
    results.forEach(item => {
      if (!item.Prompt || item.Prompt.trim() === '') return;
      
      validPrompts++;
      const category = categorizePrompt(item.Prompt);
      
      if (!categories[category]) {
        categories[category] = 0;
      }
      
      categories[category]++;
    });
    
    // Convert to array format for easier frontend processing
    const categoriesArray = Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      percentage: validPrompts > 0 ? Math.round((count / validPrompts) * 100) : 0
    }));
    
    // Sort by count (descending)
    categoriesArray.sort((a, b) => b.count - a.count);
    
    res.json({
      total: validPrompts,
      categories: categoriesArray
    });
  } catch (error) {
    console.error('Error fetching prompt categories:', error);
    res.status(500).json({ error: 'Failed to fetch prompt categories' });
  }
});

/**
 * Get common patterns in prompts
 */
router.get('/patterns', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const docClient = req.app.locals.docClient;
    
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
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      results = filterByDateRange(results, startDate, endDate);
    }
    
    // Analyze common patterns
    const startingPhrases = {};
    const commonWords = {};
    let validPrompts = 0;
    
    results.forEach(item => {
      if (!item.Prompt || item.Prompt.trim() === '') return;
      
      validPrompts++;
      const prompt = item.Prompt.trim();
      
      // Extract starting phrase (first 3-5 words)
      const words = prompt.split(/\s+/);
      const startPhrase = words.slice(0, Math.min(5, words.length)).join(' ').toLowerCase();
      
      if (!startingPhrases[startPhrase]) {
        startingPhrases[startPhrase] = 0;
      }
      startingPhrases[startPhrase]++;
      
      // Count common words (excluding stop words)
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'is', 'are', 'was', 'were'];
      words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 3 && !stopWords.includes(cleanWord)) {
          if (!commonWords[cleanWord]) {
            commonWords[cleanWord] = 0;
          }
          commonWords[cleanWord]++;
        }
      });
    });
    
    // Convert to array format and sort by frequency
    const startingPhrasesArray = Object.entries(startingPhrases)
      .map(([phrase, count]) => ({ phrase, count }))
      .filter(item => item.count > 1) // Only include phrases that appear more than once
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 starting phrases
    
    const commonWordsArray = Object.entries(commonWords)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 common words
    
    res.json({
      total: validPrompts,
      startingPhrases: startingPhrasesArray,
      commonWords: commonWordsArray
    });
  } catch (error) {
    console.error('Error fetching prompt patterns:', error);
    res.status(500).json({ error: 'Failed to fetch prompt patterns' });
  }
});

/**
 * Get prompt response quality metrics
 */
router.get('/response-quality', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const docClient = req.app.locals.docClient;
    
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
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      results = filterByDateRange(results, startDate, endDate);
    }
    
    // Calculate response quality metrics
    // For this implementation, we'll use response length and follow-up prompts as proxies for quality
    const qualityMetrics = {
      responseLength: {
        avg: 0,
        distribution: {
          'Very Short (1-100)': 0,
          'Short (101-500)': 0,
          'Medium (501-1000)': 0,
          'Long (1001-2000)': 0,
          'Very Long (2000+)': 0
        }
      },
      followUpRate: 0,
      promptsWithFollowUps: 0
    };
    
    let totalResponseLength = 0;
    let validResponses = 0;
    
    // Group prompts by user and sort by timestamp to identify follow-ups
    const promptsByUser = {};
    
    results.forEach(item => {
      if (!item.UserId) return;
      
      if (!promptsByUser[item.UserId]) {
        promptsByUser[item.UserId] = [];
      }
      
      promptsByUser[item.UserId].push({
        timestamp: moment(item.TimeStamp || item.timeStamp || item.TimeStamp?.S).valueOf(),
        prompt: item.Prompt,
        response: item.Response
      });
    });
    
    // Sort prompts by timestamp for each user
    Object.keys(promptsByUser).forEach(userId => {
      promptsByUser[userId].sort((a, b) => a.timestamp - b.timestamp);
    });
    
    // Identify follow-up prompts (prompts sent within 5 minutes of a previous prompt)
    let followUpCount = 0;
    let totalPrompts = 0;
    
    Object.keys(promptsByUser).forEach(userId => {
      const userPrompts = promptsByUser[userId];
      
      for (let i = 0; i < userPrompts.length; i++) {
        const prompt = userPrompts[i];
        
        // Skip empty prompts/responses
        if (!prompt.response || prompt.response.trim() === '') continue;
        
        validResponses++;
        totalPrompts++;
        
        // Calculate response length
        const responseLength = prompt.response.length;
        totalResponseLength += responseLength;
        
        // Update response length distribution
        if (responseLength <= 100) {
          qualityMetrics.responseLength.distribution['Very Short (1-100)']++;
        } else if (responseLength <= 500) {
          qualityMetrics.responseLength.distribution['Short (101-500)']++;
        } else if (responseLength <= 1000) {
          qualityMetrics.responseLength.distribution['Medium (501-1000)']++;
        } else if (responseLength <= 2000) {
          qualityMetrics.responseLength.distribution['Long (1001-2000)']++;
        } else {
          qualityMetrics.responseLength.distribution['Very Long (2000+)']++;
        }
        
        // Check if this is a follow-up prompt
        if (i > 0) {
          const prevPrompt = userPrompts[i - 1];
          const timeDiff = prompt.timestamp - prevPrompt.timestamp;
          
          // If prompt was sent within 5 minutes of previous prompt, consider it a follow-up
          if (timeDiff <= 5 * 60 * 1000) {
            followUpCount++;
            qualityMetrics.promptsWithFollowUps++;
            
            // Only count unique prompts with follow-ups
            i++;
            while (i < userPrompts.length) {
              const nextPrompt = userPrompts[i];
              const nextTimeDiff = nextPrompt.timestamp - prompt.timestamp;
              
              if (nextTimeDiff <= 5 * 60 * 1000) {
                followUpCount++;
                i++;
              } else {
                break;
              }
            }
            i--; // Adjust for the outer loop increment
          }
        }
      }
    });
    
    // Calculate average response length
    if (validResponses > 0) {
      qualityMetrics.responseLength.avg = Math.round(totalResponseLength / validResponses);
    }
    
    // Calculate follow-up rate
    if (totalPrompts > 0) {
      qualityMetrics.followUpRate = Math.round((followUpCount / totalPrompts) * 100);
    }
    
    // Convert response length distribution to array format
    qualityMetrics.responseLength.distributionArray = Object.entries(qualityMetrics.responseLength.distribution).map(([range, count]) => ({
      range,
      count
    }));
    
    res.json({
      total: validResponses,
      qualityMetrics
    });
  } catch (error) {
    console.error('Error fetching response quality metrics:', error);
    res.status(500).json({ error: 'Failed to fetch response quality metrics' });
  }
});

/**
 * Get time-based analysis of prompts
 */
router.get('/time-analysis', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const docClient = req.app.locals.docClient;
    
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
    
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const scanResults = await docClient.scan(params).promise();
    
    // Filter by date range if provided
    let results = scanResults.Items;
    if (startDate && endDate) {
      results = filterByDateRange(results, startDate, endDate);
    }
    
    // Analyze prompts by time
    const promptsByDate = {};
    const promptsByHour = Array(24).fill(0);
    const promptsByDayOfWeek = Array(7).fill(0);
    
    results.forEach(item => {
      if (!item.TimeStamp && !item.timeStamp && !item.TimeStamp?.S) return;
      
      const timestamp = moment(item.TimeStamp || item.timeStamp || item.TimeStamp?.S);
      const dateStr = timestamp.format('YYYY-MM-DD');
      const hour = timestamp.hour();
      const dayOfWeek = timestamp.day(); // 0 = Sunday, 6 = Saturday
      
      // Count by date
      if (!promptsByDate[dateStr]) {
        promptsByDate[dateStr] = 0;
      }
      promptsByDate[dateStr]++;
      
      // Count by hour
      promptsByHour[hour]++;
      
      // Count by day of week
      promptsByDayOfWeek[dayOfWeek]++;
    });
    
    // Convert promptsByDate to array format
    const promptsByDateArray = Object.entries(promptsByDate).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => moment(a.date).diff(moment(b.date)));
    
    // Convert promptsByHour to array format
    const promptsByHourArray = promptsByHour.map((count, hour) => ({
      hour,
      count
    }));
    
    // Convert promptsByDayOfWeek to array format with day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const promptsByDayOfWeekArray = promptsByDayOfWeek.map((count, day) => ({
      day: dayNames[day],
      count
    }));
    
    res.json({
      total: results.length,
      byDate: promptsByDateArray,
      byHour: promptsByHourArray,
      byDayOfWeek: promptsByDayOfWeekArray
    });
  } catch (error) {
    console.error('Error fetching time-based analysis:', error);
    res.status(500).json({ error: 'Failed to fetch time-based analysis' });
  }
});

module.exports = router;