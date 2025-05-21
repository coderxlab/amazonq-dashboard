import React, { useState, useEffect } from 'react';
import { Scatter } from 'react-chartjs-2';
import { getCorrelationAnalysis, exportTrendData } from '../services/api';

const CorrelationAnalysis = ({ filters }) => {
  const [correlationData, setCorrelationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('aiCodeLines');

  useEffect(() => {
    const fetchCorrelation = async () => {
      if (!filters.startDate || !filters.endDate) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getCorrelationAnalysis({
          ...filters,
          metric: selectedMetric
        });
        setCorrelationData(data);
      } catch (err) {
        setError('Failed to fetch correlation analysis data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCorrelation();
  }, [filters, selectedMetric]);

  const handleExport = async () => {
    try {
      await exportTrendData({
        type: 'correlation',
        ...filters
      });
    } catch (err) {
      setError('Failed to export correlation data');
      console.error(err);
    }
  };

  const prepareChartData = () => {
    if (!correlationData || !correlationData.dataPoints || correlationData.dataPoints.length === 0) {
      return null;
    }
    
    return {
      datasets: [
        {
          label: `Amazon Q Usage vs ${getMetricLabel(selectedMetric)}`,
          data: correlationData.dataPoints.map(point => ({
            x: point.usage,
            y: point[selectedMetric]
          })),
          backgroundColor: 'rgba(0, 161, 201, 0.7)',
          pointRadius: 8,
          pointHoverRadius: 10,
        }
      ]
    };
  };

  const getMetricLabel = (metric) => {
    const labels = {
      aiCodeLines: 'AI Code Lines',
      chatInteractions: 'Chat Interactions',
      inlineSuggestions: 'Inline Suggestions',
      inlineAcceptances: 'Inline Acceptances'
    };
    return labels[metric] || metric;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: getMetricLabel(selectedMetric)
        }
      },
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amazon Q Usage (Interactions)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const point = correlationData.dataPoints[context.dataIndex];
            return [
              `User: ${point.userId.substring(point.userId.length - 8)}`,
              `Usage: ${point.usage}`,
              `${getMetricLabel(selectedMetric)}: ${point[selectedMetric]}`
            ];
          }
        }
      }
    },
  };

  const chartData = prepareChartData();

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Correlation Analysis: Amazon Q Usage vs Productivity</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            disabled={loading || !correlationData}
            className="bg-amazon-teal hover:bg-opacity-90 text-white px-3 py-1 rounded-md text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Productivity Metric</label>
        <select
          className="w-full md:w-1/3 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
        >
          <option value="aiCodeLines">AI Code Lines</option>
          <option value="chatInteractions">Chat Interactions</option>
          <option value="inlineSuggestions">Inline Suggestions</option>
          <option value="inlineAcceptances">Inline Acceptances</option>
        </select>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-teal"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {!loading && !error && correlationData && (
        <>
          <div className="mb-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Correlation Coefficient:</span>{' '}
                <span className={`font-bold ${
                  Math.abs(correlationData.correlationCoefficient) > 0.7 ? 'text-green-600' :
                  Math.abs(correlationData.correlationCoefficient) > 0.3 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {correlationData.correlationCoefficient.toFixed(4)}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.abs(correlationData.correlationCoefficient) > 0.7 ? 'Strong correlation' :
                 Math.abs(correlationData.correlationCoefficient) > 0.3 ? 'Moderate correlation' :
                 'Weak correlation'} between Amazon Q usage and {getMetricLabel(selectedMetric).toLowerCase()}
              </p>
            </div>
          </div>
          
          <div className="h-80">
            {chartData ? (
              <Scatter data={chartData} options={chartOptions} />
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                No correlation data available
              </div>
            )}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Each point represents a developer. The x-axis shows their total Amazon Q usage (sum of chat interactions and inline suggestions),
              while the y-axis shows their {getMetricLabel(selectedMetric).toLowerCase()}.
            </p>
          </div>
        </>
      )}
      
      {!loading && !error && !correlationData && (
        <div className="flex justify-center items-center h-64 text-gray-500">
          Please select a date range to view correlation analysis
        </div>
      )}
    </div>
  );
};

export default CorrelationAnalysis;