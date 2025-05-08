import React from 'react';

const PromptLogDetail = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Prompt Log Details</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-semibold mb-2">Timestamp</h4>
            <p className="bg-gray-50 p-2 rounded">{new Date(log.TimeStamp).toLocaleString()}</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">User ID</h4>
            <p className="bg-gray-50 p-2 rounded font-mono">{log.UserId}</p>
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Prompt</h4>
          {!log.Prompt || log.Prompt.trim() === '' ? (
            <div className="bg-amber-50 p-3 rounded border border-amber-200 text-amber-700 italic">
              Empty prompt
            </div>
          ) : (
            <pre className="bg-gray-50 p-3 rounded whitespace-pre-wrap border border-gray-200 text-sm overflow-auto max-h-60">
              {log.Prompt}
            </pre>
          )}
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Response</h4>
          {!log.Response || log.Response.trim() === '' ? (
            <div className="bg-amber-50 p-3 rounded border border-amber-200 text-amber-700 italic">
              Empty response
            </div>
          ) : (
            <pre className="bg-gray-50 p-3 rounded whitespace-pre-wrap border border-gray-200 text-sm overflow-auto max-h-96">
              {log.Response}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptLogDetail;