const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const docClient = new AWS.DynamoDB.DocumentClient();

// Get subscription metrics
router.get('/metrics', async (req, res) => {
  try {
    const params = {
      TableName: 'AmazonQDevSubscription'
    };

    const scanResults = await docClient.scan(params).promise();
    
    // Calculate metrics
    const metrics = {
      totalSubscriptions: scanResults.Items.length,
      activeSubscriptions: scanResults.Items.filter(item => item.SubscriptionStatus === 'Active').length,
      pendingSubscriptions: scanResults.Items.filter(item => item.SubscriptionStatus === 'Pending').length,
      individualSubscriptions: scanResults.Items.filter(item => item.SubscriptionType === 'Individual').length,
      groupSubscriptions: scanResults.Items.filter(item => item.SubscriptionType === 'Group').length,
      subscriptionsByDate: {}
    };

    // Group subscriptions by last activity date
    scanResults.Items.forEach(item => {
      const date = item.LastActivityDate || 'No Activity';
      if (!metrics.subscriptionsByDate[date]) {
        metrics.subscriptionsByDate[date] = 0;
      }
      metrics.subscriptionsByDate[date]++;
    });

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    res.status(500).json({ error: 'Failed to fetch subscription metrics' });
  }
});

// Get all subscriptions
router.get('/', async (req, res) => {
  try {
    const params = {
      TableName: 'AmazonQDevSubscription'
    };

    const scanResults = await docClient.scan(params).promise();
    
    res.json(scanResults.Items);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

module.exports = router;
