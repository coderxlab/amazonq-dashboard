const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();

const docClient = new AWS.DynamoDB.DocumentClient();

// Get subscription metrics
router.get('/metrics', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_SUBSCRIPTION_TABLE
    };

    const scanResults = await docClient.scan(params).promise();
    
    // Calculate metrics
    const metrics = {
      totalSubscriptions: scanResults.Items.length,
      activeSubscriptions: 0,
      pendingSubscriptions: 0,
      individualSubscriptions: 0,
      groupSubscriptions: 0,
      subscriptionsByDate: {}
    };
    
    scanResults.Items.forEach(item => {
      if (item.SubscriptionStatus === 'Active') metrics.activeSubscriptions++;
      if (item.SubscriptionStatus === 'Pending') metrics.pendingSubscriptions++;
      if (item.SubscriptionType === 'Individual') metrics.individualSubscriptions++;
      if (item.SubscriptionType === 'Group') metrics.groupSubscriptions++;
      
      const date = item.LastActivityDate || 'No Activity';
      metrics.subscriptionsByDate[date] = (metrics.subscriptionsByDate[date] || 0) + 1;
    });

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
