# 🚀 PRD: Developer Productivity Dashboard — POC

## 🧩 Goal

Build a simple, insightful dashboard that showcases **developer productivity** when using **Amazon Q Developer**, leveraging logs stored in S3. The POC should visually communicate how developers interact with the coding assistant, and include **activity logs** and **prompt logs**, broken down by **user**.

---

## 🎯 Scope

- ✅ Dashboard to track **individual developer productivity**
- ✅ Show both **activity metrics** and **prompt logs**
- ✅ Focus on **charts, summary cards, and tables**
- ✅ Filter by user and time range (day/week)
- ✅ Use small set of **preloaded sample data**
- ❌ No database or authentication
- ❌ No real-time updates

---

## 📥 Data Sources

### 1. **Daily User Activity Logs**
S3 Path:
```
s3://<bucketName>/<prefix>/AWSLogs/<accountId>/QDeveloperLogs/by_user_analytic/<region>/<year>/<month>/<day>/<utc-hour>/
```

Key Fields:

| Field | Description |
|-------|-------------|
| UserId | Developer ID |
| Date | Date of log |
| Chat_AICodeLines | AI-generated lines via chat |
| Chat_MessagesInteracted | Total interactions |
| Inline_AICodeLines | Inline AI-generated code |
| Inline_AcceptanceCount | Count of accepted inline suggestions |
| Inline_SuggestionsCount | Total inline suggestions |

---

### 2. **Prompt Logs**
S3 Path:
```
s3://<bucketName>/<prefix>/AWSLogs/<accountId>/QDeveloperLogs/<log-type>/<region>/<year>/<month>/<day>/<utc-hour>/zipFile.gz/logFile.json
```

Key Fields (example):

| Field | Description |
|-------|-------------|
| UserId | Developer ID |
| Timestamp | Time of prompt |
| PromptText | What the developer asked |
| CompletionType | Suggestion, fix, etc. |
| ResponseTokens | Response size |
| Latency | Time taken to respond |

---

## 📊 Dashboard Features

### 🔍 Filters
- Date range: Day / Week
- Filter by individual `UserId`

---

### 1. **Developer Productivity Overview**
**Components:**
- **Summary Cards**
  - Total AI Code Lines (Chat + Inline)
  - Acceptance Rate (%)
  - Chat Messages Interacted
- **Bar Chart**: AI Code Lines per Developer
- **Line Chart**: AI Code Lines over Time
- **Table**: Per-user Activity Summary

| UserId | AI Code Lines | Suggestions | Acceptance % | Chat Interactions |
|--------|---------------|-------------|---------------|-------------------|
| user-a | 102           | 20          | 75%           | 12                |

---

### 2. **Prompt Log Viewer**

**Features:**
- Table View of Prompt Logs
- Filter by:
  - UserId
  - Date/Time Range
- Columns:

| Timestamp | Prompt Text | Completion Type | Response Tokens | Latency |
|-----------|-------------|------------------|------------------|---------|
| 10:32:01 | "Fix this function..." | Fix | 50 | 300ms |
| 11:15:42 | "Suggest test cases" | Suggestion | 28 | 190ms |

- Search Prompt Text (optional)
- Export option (CSV)

---

## 🛠️ Tech Stack (POC)

| Layer | Tool |
|-------|------|
| Data | Pre-parsed JSON/CSV files from S3 buckets |
| Backend | Optional: Express or FastAPI mock API |
| Frontend | React + Chart.js / Recharts + TailwindCSS |

---

## ✅ Deliverables

- [ ] `activity_data.json` from S3 sample logs
- [ ] `prompt_log.json` sample prompt logs
- [ ] React dashboard with:
  - Developer activity metrics
  - Prompt log viewer with filter
- [ ] Simple UI with time & user filters
- [ ] README with instructions

## Data Format:
- User activity logging file
```
UserId,Date,Chat_AICodeLines,Chat_MessagesInteracted,Chat_MessagesSent,Inline_AICodeLines,Inline_AcceptanceCount,Inline_SuggestionsCount
"xxx",04-17-2025,0,4,69,49,49,70
"yyy",04-17-2025,,,3,,,
```

- Prompt logging 
```
{"records":[{"generateAssistantResponseEventRequest":{"prompt":"the current file path to logging is nested like s3://<bucketName>/<prefix>/AWSLogs/<accountId>/QDeveloperLogs/by_user_analytic/<region>/<year>/<month>/<day>/<utc-hour>/<accountId>_by_user_analytic_<timestamp>_<randomString>.csv\n and s3://<bucketName>/<prefix>/AWSLogs/<accountId>/QDeveloperLogs/<log-type>/<region>/<year>/<month>/<day>/<utc-hour>/zipFile.gz/logFile.json. But I want to create a graph to track individual developer productivity by day and week. What should be done?","chatTriggerType":"MANUAL","customizationArn":null,"userId":"xxx","timeStamp":"2025-04-18T08:05:03.230565389Z"},"generateAssistantResponseEventResponse":{"assistantResponse":"To create a graph tracking individual developer productivity by day and week based on the Amazon Q logs stored in S3, you'll need to:\n\n1. Extract and process the log data\n2. Aggregate metrics by developer, day, and week\n3. Create visualizations\n\nHere's how you could approach this:\n\n## 1. Data Extraction and Processing\n\nFirst, you'll need to extend your existing Amazon Q Log Retriever application to:\n\n```python\n# Pseudocode for log processing\ndef process_logs(bucket_name, prefix):\n    # Use boto3 to list and retrieve logs\n    # Parse both CSV and JSON log formats\n    # Extract developer identifiers, timestamps, and productivity metrics\n    # Return structured data for analysis\n```\n\n## 2. Define Productivity Metrics\n\nYou'll need to define what constitutes \"productivity\" based on the log data:\n\n- Number of Amazon Q interactions\n- Types of queries (code generation, debugging, etc.)\n- Time saved compared to manual solutions\n- Successful code implementations\n- Query complexity\n\n## 3. Data Aggregation\n\n```python\n# Pseudocode for data aggregation\ndef aggregate_by_developer(log_data):\n    # Group by developer ID\n    # Calculate daily metrics\n    # Calculate weekly metrics (rolling 7-day window)\n    # Return aggregated data\n```\n\n## 4. Visualization Implementation\n\nAdd visualization capabilities to your Flask app:\n\n1. Use a library like Matplotlib, Plotly, or Chart.js\n2. Create endpoints that return JSON data for charts\n3. Implement interactive dashboards\n\n```python\n# Flask route example\n@app.route('/productivity/graph')\ndef productivity_graph():\n    start_date = request.args.get('start_date')\n    end_date = request.args.get('end_date')\n    developers = request.args.getlist('developers')\n    \n    # Get data from logs\n    data = get_productivity_data(start_date, end_date, developers)\n    \n    # Return template with graph data\n    return render_template('productivity_graph.html', data=data)\n```\n\n## 5. Implementation Steps\n\n1. Modify your existing app.py to include new routes for productivity tracking\n2. Create data processing modules to handle the S3 log formats\n3. Implement database storage for processed metrics (optional, for performance)\n4. Create new templates with visualization components\n5. Add filtering capabilities by date range, developer, team, etc.\n\nWould you like me to help you implement any specific part of this solution? For example, I could help with:\n\n1. The S3 log retrieval code\n2. Data processing functions\n3. Visualization implementation\n4. Flask route definitions","followupPrompts":"","messageMetadata":{"conversationId":null,"utteranceId":null},"codeReferenceEvents":[],"supplementaryWebLinksEvent":[],"requestId":"xxx"}}]}
```

