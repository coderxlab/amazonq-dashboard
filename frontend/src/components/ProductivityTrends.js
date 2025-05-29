import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { getProductivityTrends, exportTrendData } from '../services/api';

const ProductivityTrends = ({ filters }) => {
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interval, setInterval] = useState('day');
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [showGrowthRate, setShowGrowthRate] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('aiCodeLines');

  useEffect(() => {
    const fetchTrends = async () => {
      if (!filters.startDate || !filters.endDate) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getProductivityTrends({
          ...filters,
          interval
        });
        setTrendsData(data);
      } catch (err) {
        setError('Failed to fetch productivity trends');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [filters, interval]);

  const handleExport = async () => {
    try {
      if (!filters.startDate || !filters.endDate) {
        setError('Start date and end date are required for export');
        return;
      }
      
      const response = await exportTrendData({
        type: 'productivity',
        startDate: filters.startDate,
        endDate: filters.endDate,
        userId: filters.userId,
        interval
      });
      
      // Create a download link for the CSV file
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `productivity_trends_${interval}_${filters.startDate}_to_${filters.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export trend data');
      console.error(err);
    }
  };

  const prepareChartData = () => {
    if (!trendsData || !trendsData.timePoints || trendsData.timePoints.length === 0) {
      return null;
    }

    const datasets = [];
    
    // Add raw data
    datasets.push({
      label: `${getMetricLabel(selectedMetric)}`,
      data: trendsData.metrics[selectedMetric],
      borderColor: 'rgba(0, 161, 201, 1)',
      backgroundColor: 'rgba(0, 161, 201, 0.2)',
      tension: 0.4,
      fill: true,
    });
    
    // Add moving average if selected
    if (showMovingAverage) {
      datasets.push({
        label: `${getMetricLabel(selectedMetric)} (3-point Moving Avg)`,
        data: trendsData.movingAverages[selectedMetric],
        borderColor: 'rgba(255, 153, 0, 1)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
      });
    }
    
    // Add growth rate if selected
    if (showGrowthRate && trendsData.growthRates[selectedMetric]) {
      datasets.push({
        label: `${getMetricLabel(selectedMetric)} Growth Rate (%)`,
        data: trendsData.growthRates[selectedMetric],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'transparent',
        borderDash: [3, 3],
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      });
    }
    
    return {
      labels: trendsData.timePoints,
      datasets
    };
  };

  const getMetricLabel = (metric) => {
    const labels = {
      aiCodeLines: 'AI Code Lines',
      chatInteractions: 'Chat Interactions',
      inlineSuggestions: 'Inline Suggestions',
      inlineAcceptances: 'Inline Acceptances',
      acceptanceRate: 'Acceptance Rate (%)'
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
      y1: {
        display: showGrowthRate,
        position: 'right',
        title: {
          display: true,
          text: 'Growth Rate (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(2)}`;
          }
        }
      }
    },
  };

  const chartData = prepareChartData();

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Developer Productivity Trends</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            disabled={loading || !trendsData}
            className="bg-amazon-teal hover:bg-opacity-90 text-white px-3 py-1 rounded-md text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Interval</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="aiCodeLines">AI Code Lines</option>
            <option value="chatInteractions">Chat Interactions</option>
            <option value="inlineSuggestions">Inline Suggestions</option>
            <option value="inlineAcceptances">Inline Acceptances</option>
            <option value="acceptanceRate">Acceptance Rate</option>
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showMovingAverage"
            checked={showMovingAverage}
            onChange={(e) => setShowMovingAverage(e.target.checked)}
            className="h-4 w-4 text-amazon-teal focus:ring-amazon-teal border-gray-300 rounded"
          />
          <label htmlFor="showMovingAverage" className="ml-2 block text-sm text-gray-900">
            Show Moving Average
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showGrowthRate"
            checked={showGrowthRate}
            onChange={(e) => setShowGrowthRate(e.target.checked)}
            className="h-4 w-4 text-amazon-teal focus:ring-amazon-teal border-gray-300 rounded"
          />
          <label htmlFor="showGrowthRate" className="ml-2 block text-sm text-gray-900">
            Show Growth Rate
          </label>
        </div>
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
      
      {!loading && !error && chartData ? (
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : !loading && !error ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          No trend data available. Please select an user and a date range.
        </div>
      ) : null}
    </div>
  );
};

export default ProductivityTrends;