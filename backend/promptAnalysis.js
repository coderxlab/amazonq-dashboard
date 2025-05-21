// Prompt Analysis Module
const moment = require('moment');

// Helper function to categorize prompts based on content
const categorizePrompt = (promptText) => {
  promptText = promptText.toLowerCase();
  
  // Define categories and their keywords
  const categories = {
    'Code Generation': ['create', 'generate', 'write', 'code', 'function', 'class', 'implement'],
    'Code Explanation': ['explain', 'what does', 'how does', 'understand', 'clarify'],
    'Debugging': ['debug', 'fix', 'error', 'issue', 'problem', 'not working', 'bug'],
    'Documentation': ['document', 'comment', 'explain code', 'documentation'],
    'Best Practices': ['best practice', 'pattern', 'optimize', 'improve', 'better way'],
    'Architecture': ['design', 'architecture', 'structure', 'pattern', 'organize'],
    'Testing': ['test', 'unit test', 'integration test', 'mock', 'stub', 'testing'],
    'DevOps': ['deploy', 'ci/cd', 'pipeline', 'docker', 'kubernetes', 'aws', 'cloud'],
    'Database': ['database', 'sql', 'query', 'schema', 'table', 'nosql', 'mongodb'],
    'Security': ['security', 'authentication', 'authorization', 'encrypt', 'vulnerability'],
    'UI/UX': ['ui', 'ux', 'interface', 'design', 'css', 'html', 'frontend'],
    'API': ['api', 'rest', 'graphql', 'endpoint', 'request', 'response'],
    'Performance': ['performance', 'optimize', 'slow', 'fast', 'speed', 'efficient'],
    'Learning': ['learn', 'tutorial', 'guide', 'how to', 'example'],
    'Other': []
  };
  
  // Check each category
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (promptText.includes(keyword)) {
        return category;
      }
    }
  }
  
  // Default category if no match
  return 'Other';
};

// Helper function to analyze prompt quality based on length and complexity
const analyzePromptQuality = (prompt) => {
  if (!prompt || typeof prompt !== 'string') {
    return { score: 0, reason: 'Empty prompt' };
  }
  
  const length = prompt.length;
  const wordCount = prompt.split(/\s+/).length;
  const hasCodeBlock = prompt.includes('```') || prompt.includes('    ');
  const hasQuestion = prompt.includes('?');
  const specificity = prompt.includes('specific') || prompt.includes('exactly') || prompt.includes('precisely');
  
  let score = 0;
  let reasons = [];
  
  // Length-based scoring
  if (length < 10) {
    score += 20;
    reasons.push('Very short prompt');
  } else if (length < 50) {
    score += 40;
    reasons.push('Short prompt');
  } else if (length < 200) {
    score += 70;
    reasons.push('Moderate length prompt');
  } else if (length < 500) {
    score += 90;
    reasons.push('Detailed prompt');
  } else {
    score += 100;
    reasons.push('Very detailed prompt');
  }
  
  // Word count bonus
  if (wordCount > 15) {
    score += 10;
    reasons.push('Good word count');
  }
  
  // Code block bonus
  if (hasCodeBlock) {
    score += 15;
    reasons.push('Includes code examples');
  }
  
  // Question bonus
  if (hasQuestion) {
    score += 5;
    reasons.push('Includes a question');
  }
  
  // Specificity bonus
  if (specificity) {
    score += 10;
    reasons.push('Uses specific language');
  }
  
  // Normalize score to 0-100
  score = Math.min(100, score);
  
  return {
    score,
    reasons
  };
};

// Helper function to extract common topics from prompts
const extractTopics = (prompts) => {
  // Simple frequency-based topic extraction
  const words = {};
  const stopWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could']);
  
  prompts.forEach(prompt => {
    if (!prompt || typeof prompt !== 'string') return;
    
    const text = prompt.toLowerCase();
    const tokens = text.split(/\W+/).filter(word => word.length > 3 && !stopWords.has(word));
    
    tokens.forEach(word => {
      words[word] = (words[word] || 0) + 1;
    });
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
  
  return sortedWords;
};

module.exports = {
  categorizePrompt,
  analyzePromptQuality,
  extractTopics
};