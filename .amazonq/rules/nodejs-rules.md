# Node.js Project Rules and Standards

## 1. Project Structure Rules
```javascript
src: {
  controllers: '// Business logic rules and validations',
  models: '// Data model schemas and constraints', 
  routes: '// API route rules and restrictions',
  middleware: '// Middleware validation rules',
  utils: '// Utility function rules',
  config: '// Configuration validation rules'
},
tests: '// Test coverage rules',
docs: '// Documentation requirements'
```

## 2. Error Handling Rules
All error handling should follow this pattern:
```javascript
const handleErrors = async (fn) => {
  try {
    await fn();
  } catch (error) {
    // Required error logging format
    console.error({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};
```

## 3. Environment Variable Rules
Environment variables must be configured as follows:
```javascript
require('dotenv').config();
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development', 
  dbUrl: process.env.DATABASE_URL
};
```

## 4. Async Operation Rules
Async operations should follow this pattern:
```javascript
const asyncExample = async () => {
  const result = await someAsyncOperation();
  return result;
};
```

## 5. Input Validation Rules
Input validation should be implemented as middleware:
```javascript
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};
```

## 6. Security Rules
Required security middleware:
```javascript
const securityMiddleware = {
  helmet: require('helmet')(),
  cors: require('cors')(),
  rateLimit: require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // Rate limit window
    max: 100 // Request limit
  })
};
```

## 7. Logging Rules
Standard logging format:
```javascript
const logger = {
  info: (message) => console.log(`[INFO] ${new Date().toISOString()}: ${message}`),
  error: (message) => console.error(`[ERROR] ${new Date().toISOString()}: ${message}`),
  debug: (message) => console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`)
};
```

## 8. Database Rules
Database connection pattern:
```javascript
const connectDB = async (url) => {
  try {
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed');
    process.exit(1);
  }
};
```

## 9. API Response Rules
Standardized API response format:
```javascript
const apiResponse = {
  success: (res, data, message = 'Success') => {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  },
  error: (res, message = 'Error', statusCode = 500) => {
    return res.status(statusCode).json({
      success: false,
      message
    });
  }
};
```

## 10. Testing Rules
Test setup and teardown pattern:
```javascript
const testConfig = {
  setupTestDB: () => {
    beforeAll(async () => {
      await connectDB(process.env.TEST_DB_URL);
    });
    
    afterEach(async () => {
      await mongoose.connection.dropDatabase();
    });
    
    afterAll(async () => {
      await mongoose.connection.close();
    });
  }
};
```

## 11. Code Quality Standards
- Use ESLint with the Airbnb style guide
- Maintain 80% or higher test coverage
- Document all public APIs using JSDoc
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility

## 12. Performance Guidelines
- Implement proper caching strategies
- Use pagination for large data sets
- Optimize database queries
- Implement request compression
- Monitor memory usage and address leaks