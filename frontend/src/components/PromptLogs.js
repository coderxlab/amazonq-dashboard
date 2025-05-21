import React, { useState, useEffect } from 'react';
import FilterControls from './FilterControls';
import PromptLogCard from './PromptLogCard';
import { getPromptLogs } from '../services/api';

const PromptLogs = ({users, loadingUsers}) => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [dataQualityMetrics, setDataQualityMetrics] = useState({
    total: 0,
    emptyPrompts: 0,
    emptyResponses: 0,
    bothEmpty: 0
  });

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getPromptLogs({
          ...filters,
          searchTerm,
          page: pagination.page,
          limit: pagination.limit,
          includeEmpty: includeEmpty ? 'true' : 'false'
        });
        
        setLogs(response.data);
        setPagination({
          ...pagination,
          total: response.total,
          totalPages: response.totalPages
        });
        
        // Calculate data quality metrics
        calculateDataQualityMetrics(response.data);
      } catch (err) {
        setError('Failed to fetch prompt logs');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters, searchTerm, pagination.page, pagination.limit, includeEmpty]);

  const calculateDataQualityMetrics = (data) => {
    const metrics = {
      total: data.length,
      emptyPrompts: data.filter(log => !log.Prompt || log.Prompt.trim() === '').length,
      emptyResponses: data.filter(log => !log.Response || log.Response.trim() === '').length,
      bothEmpty: data.filter(log => 
        (!log.Prompt || log.Prompt.trim() === '') && 
        (!log.Response || log.Response.trim() === '')
      ).length
    };
    setDataQualityMetrics(metrics);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 }); // Reset to first page when filters change
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 }); // Reset to first page when search changes
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Timestamp', 'User ID', 'Prompt', 'Response'];
    const csvRows = [headers];
    
    logs.forEach(log => {
      csvRows.push([
        log.TimeStamp,
        log.UserId,
        log.Prompt,
        log.Response
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.map(cell => 
      typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prompt-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Prompt Log Viewer</h1>
      
      <FilterControls onFilterChange={handleFilterChange}  users={users} loadingUsers={loadingUsers}/>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Prompt Logs</h2>
          
          <div className="flex flex-col md:flex-row mt-4 md:mt-0 space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeEmpty"
                checked={includeEmpty}
                onChange={(e) => setIncludeEmpty(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="includeEmpty" className="text-sm">Include empty records</label>
            </div>
            
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                placeholder="Search prompts & responses..."
                className="border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="submit"
                className="bg-amazon-teal text-white px-4 py-2 rounded-r-md"
              >
                Search
              </button>
            </form>
            
            <button
              onClick={handleExportCSV}
              className="bg-amazon-orange hover:bg-opacity-90 text-white px-4 py-2 rounded-md"
            >
              Export CSV
            </button>
          </div>
        </div>
        
        {/* Data Quality Metrics */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-2">Data Quality Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Records</p>
              <p className="text-lg font-semibold">{dataQualityMetrics.total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Empty Prompts</p>
              <p className="text-lg font-semibold">{dataQualityMetrics.emptyPrompts}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Empty Responses</p>
              <p className="text-lg font-semibold">{dataQualityMetrics.emptyResponses}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Both Empty</p>
              <p className="text-lg font-semibold">{dataQualityMetrics.bothEmpty}</p>
            </div>
          </div>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-teal"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {!loading && !error && (
          <>
            {/* Card-based layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <PromptLogCard key={`${log.UserId}-${log.TimeStamp}`} log={log} />
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-gray-500">
                  No prompt logs found
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`px-3 py-1 rounded-md ${
                      pagination.page === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`px-3 py-1 rounded-md ${
                      pagination.page === pagination.totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PromptLogs;