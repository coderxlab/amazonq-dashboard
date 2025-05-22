/**
 * Simple logger module with configurable log levels
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const currentLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

/**
 * Log an error message
 * @param {String} message - Error message
 * @param {Object} meta - Additional metadata
 */
function error(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.ERROR) {
    // In production, we would use a proper logging library
    // For now, just format the log message with timestamp and level
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, 
      // Only include non-sensitive parts of the error
      {
        code: meta.code || 'UNKNOWN_ERROR',
        // Don't log full stack traces or sensitive data in production
        ...(process.env.NODE_ENV !== 'production' ? meta : {})
      }
    );
  }
}

/**
 * Log a warning message
 * @param {String} message - Warning message
 * @param {Object} meta - Additional metadata
 */
function warn(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.WARN) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, meta);
  }
}

/**
 * Log an info message
 * @param {String} message - Info message
 * @param {Object} meta - Additional metadata
 */
function info(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.INFO) {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] INFO: ${message}`, meta);
  }
}

/**
 * Log a debug message
 * @param {String} message - Debug message
 * @param {Object} meta - Additional metadata
 */
function debug(message, meta = {}) {
  if (currentLevel >= LOG_LEVELS.DEBUG) {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] DEBUG: ${message}`, meta);
  }
}

module.exports = {
  error,
  warn,
  info,
  debug,
  LOG_LEVELS
};