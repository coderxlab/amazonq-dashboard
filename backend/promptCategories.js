// Prompt Categories Endpoint
const moment = require('moment');
const promptAnalysis = require('./promptAnalysis');

// Function to set up prompt categories endpoint
const setupPromptCategoriesEndpoint = (app, docClient) => {
  // Get prompt categories with optional filtering
  app.get('/api/prompts/categories', async (req, res) => {
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
      
      // Calculate prompt categories
      const categories = {};
      const categoryTrends = {};
      const userCategories = {};
      
      // Process each prompt
      results.forEach(item => {
        if (!item.Prompt || !item.UserId) return;
        
        // Categorize prompt
        const category = promptAnalysis.categorizePrompt(item.Prompt);
        
        // Count by category
        categories[category] = (categories[category] || 0) + 1;
        
        // Track by user
        if (!userCategories[item.UserId]) {
          userCategories[item.UserId] = {};
        }
        userCategories[item.UserId][category] = (userCategories[item.UserId][category] || 0) + 1;
        
        // Track trends over time
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
        
        const dateKey = timestamp.format('YYYY-MM-DD');
        
        if (!categoryTrends[dateKey]) {
          categoryTrends[dateKey] = {};
        }
        
        categoryTrends[dateKey][category] = (categoryTrends[dateKey][category] || 0) + 1;
      });
      
      // Convert to arrays for easier frontend processing
      const categoriesArray = Object.entries(categories).map(([name, count]) => ({ name, count }));
      
      // Sort categories by count (descending)
      categoriesArray.sort((a, b) => b.count - a.count);
      
      // Convert trends to array
      const trendsArray = Object.entries(categoryTrends).map(([date, cats]) => {
        return {
          date,
          categories: Object.entries(cats).map(([name, count]) => ({ name, count }))
        };
      });
      
      // Sort trends by date
      trendsArray.sort((a, b) => moment(a.date).diff(moment(b.date)));
      
      // Convert user categories to array
      const userCategoriesArray = Object.entries(userCategories).map(([userId, cats]) => {
        return {
          userId,
          categories: Object.entries(cats).map(([name, count]) => ({ name, count }))
        };
      });
      
      res.json({
        categories: categoriesArray,
        trends: trendsArray,
        userCategories: userCategoriesArray
      });
    } catch (error) {
      console.error('Error analyzing prompt categories:', error);
      res.status(500).json({ error: 'Failed to analyze prompt categories' });
    }
  });
};

module.exports = setupPromptCategoriesEndpoint;