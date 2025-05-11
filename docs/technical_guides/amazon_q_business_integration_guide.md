# Amazon Q Business Integration Guide

This guide provides step-by-step instructions for using Amazon Q Developer logs as a data source for Amazon Q Business, incorporating Amazon Athena for data processing.

## Overview

Current logging flow:
- S3 → Lambda → DynamoDB

New integration:
- Use existing S3 logs directly with Amazon Q Business
- Leverage Amazon Athena for SQL-based data processing

## Step 1: Set Up Athena to Query Your S3 Logs

1. Navigate to the Amazon Athena console
2. Create a database for your Amazon Q logs:
   ```sql
   CREATE DATABASE amazon_q_logs;
   ```
3. Create tables for your activity logs:
   ```sql
   CREATE EXTERNAL TABLE amazon_q_logs.activity_logs (
     UserId STRING,
     Date STRING,
     Chat_AICodeLines INT,
     Chat_MessagesInteracted INT,
     Chat_MessagesSent INT,
     Inline_AICodeLines INT,
     Inline_AcceptanceCount INT,
     Inline_SuggestionsCount INT
   )
   ROW FORMAT DELIMITED
   FIELDS TERMINATED BY ','
   LOCATION 's3://aws-q-dev-user-usage-logging/activity_logs/'
   TBLPROPERTIES ('skip.header.line.count'='1');
   ```
4. Create tables for your prompt logs:
   ```sql
   CREATE EXTERNAL TABLE amazon_q_logs.prompt_logs (
     Prompt STRING,
     ChatTriggerType STRING,
     RequestId STRING,
     UserId STRING,
     TimeStamp STRING,
     Response STRING
   )
   ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
   LOCATION 's3://aws-q-dev-user-usage-logging/prompt_logs/';
   ```

## Step 2: Create Optimized Views in Athena

1. Create a view that combines relevant data:
   ```sql
   CREATE OR REPLACE VIEW amazon_q_logs.developer_productivity AS
   SELECT 
     a.UserId,
     a.Date,
     a.Chat_AICodeLines,
     a.Inline_AICodeLines,
     a.Inline_AcceptanceCount,
     a.Inline_SuggestionsCount,
     COUNT(p.RequestId) AS PromptCount
   FROM 
     amazon_q_logs.activity_logs a
   LEFT JOIN 
     amazon_q_logs.prompt_logs p ON a.UserId = p.UserId AND a.Date = SUBSTRING(p.TimeStamp, 1, 10)
   GROUP BY 
     a.UserId, a.Date, a.Chat_AICodeLines, a.Inline_AICodeLines, a.Inline_AcceptanceCount, a.Inline_SuggestionsCount;
   ```

## Step 3: Set Up Amazon Q Business Application

1. Go to the Amazon Q Business console
2. Click "Create application"
3. Enter application details:
   - Name: "Developer Productivity Assistant"
   - Description: "Chatbot for analyzing Amazon Q Developer usage metrics"
4. Click "Create"

## Step 4: Configure Data Sources for Amazon Q Business

1. In your Q Business application, navigate to "Data sources"
2. Click "Add data source"
3. Select "Amazon S3" as the source type
4. Configure the S3 data source:
   - Data source name: "Amazon Q Developer Logs"
   - S3 bucket: "aws-q-dev-user-usage-logging"
   - IAM role: Create or select a role with appropriate permissions
5. Click "Add data source"

## Step 5: Create Athena Views as Additional Data Sources

1. In your Q Business application, add another data source
2. Select "Amazon Athena" as the source type
3. Configure the Athena data source:
   - Data source name: "Developer Productivity Metrics"
   - Database: "amazon_q_logs"
   - Table/View: "developer_productivity"
   - IAM role: Create or select a role with appropriate permissions
4. Click "Add data source"

## Step 6: Configure Retrieval Settings

1. Navigate to "Retrieval" in your Q Business application
2. Configure relevance settings:
   - Adjust relevance threshold as needed
   - Set up field mappings to help Q Business understand your data structure
3. Save your retrieval settings

## Step 7: Create Web Experience

1. Navigate to "Web experiences" in your Q Business application
2. Click "Create web experience"
3. Configure the web experience:
   - Name: "Developer Productivity Assistant"
   - Description: "Chat interface for querying developer productivity metrics"
   - Customize appearance as needed
4. Set up user access permissions
5. Click "Create"

## Step 8: Test Your Chatbot

1. Access your web experience URL
2. Test queries like:
   - "Show me developer productivity trends over the last month"
   - "Which developer has the highest AI code acceptance rate?"
   - "What are the most common types of prompts used by developers?"
3. Verify that the chatbot correctly retrieves and presents information from your logs

## Step 9: Iterate and Improve

1. Review chatbot responses and identify areas for improvement
2. Refine your Athena views to better structure data
3. Update retrieval settings to improve relevance
4. Add additional data sources if needed

## Key Differences Between Amazon Athena and Amazon RDS

Amazon Athena:
- Serverless query service
- Pay-per-query pricing model
- Works directly with data stored in S3
- No data loading or ETL required
- Ideal for ad-hoc querying of large datasets

Amazon RDS:
- Managed relational database service
- Traditional database instances that you provision
- Multiple database engine options
- Persistent storage with ACID compliance
- Optimized for transactional workloads
- Requires data to be loaded into the database

For this use case, Athena is more appropriate because your data already exists in S3, and you want to query it without moving it to another storage system.
