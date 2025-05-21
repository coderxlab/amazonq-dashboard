// Prompt Analysis Endpoints
const moment = require('moment');
const promptAnalysis = require('./promptAnalysis');

// Function to set up prompt analysis endpoints
const setupPromptEndpoints = (app, docClient) => {
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

  // New endpoint: Get prompt analysis metrics
  app.get('/api/prompts/analysis', async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      
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
        const startMoment = moment(startDate).startOf('day');
        const endMoment = moment(endDate).endOf('day');
        
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
          
          return itemTimestamp.isBetween(startMoment, endMoment, null, '[]');
        });
      }
      
      // Calculate prompt analysis metrics
      const analysis = {
        totalPrompts: results.length,
        promptTypes: {},
        promptCategories: {},
        promptQuality: {
          average: 0,
          distribution: {
            excellent: 0,
            good: 0,
            average: 0,
            poor: 0,
            veryPoor: 0
          }
        },
        promptLengthDistribution: {
          veryShort: 0, // < 10 chars
          short: 0,     // 10-50 chars
          medium: 0,    // 50-200 chars
          long: 0,      // 200-500 chars
          veryLong: 0   // > 500 chars
        },
        promptsByHour: Array(24).fill(0),
        promptsByDay: Array(7).fill(0),
        commonTopics: [],
        temporalAnalysis: []
      };
      
      // Process each prompt
      const prompts = results.map(item => item.Prompt).filter(Boolean);
      let totalQualityScore = 0;
      
      results.forEach(item => {
        if (!item.Prompt) return;
        
        // Count prompt types
        const promptType = item.ChatTriggerType || 'UNKNOWN';
        analysis.promptTypes[promptType] = (analysis.promptTypes[promptType] || 0) + 1;
        
        // Categorize prompts
        const category = promptAnalysis.categorizePrompt(item.Prompt);
        analysis.promptCategories[category] = (analysis.promptCategories[category] || 0) + 1;
        
        // Analyze prompt quality
        const qualityAnalysis = promptAnalysis.analyzePromptQuality(item.Prompt);
        totalQualityScore += qualityAnalysis.score;
        
        // Categorize quality
        if (qualityAnalysis.score >= 90) {
          analysis.promptQuality.distribution.excellent++;
        } else if (qualityAnalysis.score >= 70) {
          analysis.promptQuality.distribution.good++;
        } else if (qualityAnalysis.score >= 50) {
          analysis.promptQuality.distribution.average++;
        } else if (qualityAnalysis.score >= 30) {
          analysis.promptQuality.distribution.poor++;
        } else {
          analysis.promptQuality.distribution.veryPoor++;
        }
        
        // Analyze prompt length
        const length = item.Prompt.length;
        if (length < 10) {
          analysis.promptLengthDistribution.veryShort++;
        } else if (length < 50) {
          analysis.promptLengthDistribution.short++;
        } else if (length < 200) {
          analysis.promptLengthDistribution.medium++;
        } else if (length < 500) {
          analysis.promptLengthDistribution.long++;
        } else {
          analysis.promptLengthDistribution.veryLong++;
        }
        
        // Analyze time patterns
        let timestamp;
        if (typeof item.TimeStamp === 'string') {
          timestamp = moment(item.TimeStamp);
        } else if (item.TimeStamp && item.TimeStamp.S) {
          timestamp = moment(item.TimeStamp.S);
        } else if (item.timeStamp) {
          timestamp = moment(item.timeStamp);
        } else {
          return; // Skip if no timestamp
        }
        
        const hour = timestamp.hour();
        const day = timestamp.day();
        
        analysis.promptsByHour[hour]++;
        analysis.promptsByDay[day]++;
        
        // Add to temporal analysis
        analysis.temporalAnalysis.push({
          date: timestamp.format('YYYY-MM-DD'),
          hour,
          day,
          category,
          type: promptType,
          qualityScore: qualityAnalysis.score
        });
      });
      
      // Calculate average quality score
      if (results.length > 0) {
        analysis.promptQuality.average = totalQualityScore / results.length;
      }
      
      // Extract common topics
      analysis.commonTopics = promptAnalysis.extractTopics(prompts);
      
      // Convert prompt types and categories to arrays for easier frontend processing
      analysis.promptTypes = Object.entries(analysis.promptTypes).map(([type, count]) => ({ type, count }));
      analysis.promptCategories = Object.entries(analysis.promptCategories).map(([category, count]) => ({ category, count }));
      
      // Add day names to promptsByDay
      analysis.promptsByDay = analysis.promptsByDay.map((count, index) => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index],
        count
      }));
      
      // Add hour labels to promptsByHour
      analysis.promptsByHour = analysis.promptsByHour.map((count, index) => ({
        hour: index,
        label: `${index}:00`,
        count
      }));
      
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing prompts:', error);
      res.status(500).json({ error: 'Failed to analyze prompts' });
    }
  });
};

module.exports = setupPromptEndpoints;