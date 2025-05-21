import React, { useState } from 'react';
import PromptLogDetail from './PromptLogDetail';

const PromptLogCard = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Format timestamp
  const formattedTime = new Date(log.TimeStamp).toLocaleString();
  
  // Check if prompt or response is empty
  const hasEmptyPrompt = !log.Prompt || log.Prompt.trim() === '';
  const hasEmptyResponse = !log.Response || log.Response.trim() === '';
  
  // Determine if card should have warning styling
  const hasWarning = hasEmptyPrompt || hasEmptyResponse;

  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${
          hasWarning ? 'border-l-4 border-amber-500' : ''
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="text-sm text-gray-500">{formattedTime}</div>
            <div className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
              {log.UserId.substring(log.UserId.length - 8)}
            </div>
          </div>
          
          <div className="mb-3">
            <h3 className="text-sm font-semibold mb-1 flex items-center">
              <span>Prompt</span>
              {hasEmptyPrompt && (
                <span className="ml-2 text-xs text-amber-500 font-normal">(empty)</span>
              )}
            </h3>
            <div className={`text-sm ${expanded ? '' : 'line-clamp-2'}`}>
              {hasEmptyPrompt ? (
                <span className="italic text-gray-400">No prompt content</span>
              ) : (
                log.Prompt
              )}
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-sm font-semibold mb-1 flex items-center">
              <span>Response</span>
              {hasEmptyResponse && (
                <span className="ml-2 text-xs text-amber-500 font-normal">(empty)</span>
              )}
            </h3>
            <div className={`text-sm ${expanded ? '' : 'line-clamp-2'}`}>
              {hasEmptyResponse ? (
                <span className="italic text-gray-400">No response content</span>
              ) : (
                log.Response
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-amazon-teal hover:text-amazon-teal-dark text-sm focus:outline-none"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
            
            <button
              onClick={() => setShowDetail(true)}
              className="text-amazon-teal hover:text-amazon-teal-dark text-sm focus:outline-none flex items-center"
            >
              <span>View details</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {showDetail && (
        <PromptLogDetail 
          log={log} 
          onClose={() => setShowDetail(false)} 
        />
      )}
    </>
  );
};

export default PromptLogCard;