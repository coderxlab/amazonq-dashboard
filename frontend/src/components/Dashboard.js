import React, { useState, useEffect } from 'react';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
} from 'chart.js';
import FilterControls from './FilterControls';
import SummaryCard from './SummaryCard';
import { getActivitySummary } from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale
);

const Dashboard = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeVisualization, setActiveVisualization] = useState('comparison'); // 'comparison', 'heatmap', 'trend'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getActivitySummary(filters);
        setSummaryData(data);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  // Prepare chart data for Suggestions vs. Acceptances over time
  const prepareSuggestionAcceptanceChartData = () => {
    if (!summaryData || !summaryData.byDate || summaryData.byDate.length === 0) return null;
    
    return {
      labels: summaryData.byDate.map(item => item.date),
      datasets: [
        {
          label: 'Suggestions',
          data: summaryData.byDate.map(item => item.inlineSuggestions),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Acceptances',
          data: summaryData.byDate.map(item => item.inlineAcceptances),
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  // Prepare heatmap data for acceptance rates by time of day
  const prepareHeatmapData = () => {
    if (!summaryData || !summaryData.byHourOfDay) return null;
    
    // Create dataset for hour of day heatmap
    const hourLabels = Array.from({ length: 24 }, (_, i) => 
      i === 0 ? '12 AM' : 
      i < 12 ? `${i} AM` : 
      i === 12 ? '12 PM' : 
      `${i - 12} PM`
    );
    
    return {
      labels: hourLabels,
      datasets: [
        {
          label: 'Acceptance Rate (%)',
          data: summaryData.byHourOfDay.map(hour => ({
            x: hour.hour,
            y: hour.rate,
            suggestions: hour.suggestions,
            acceptances: hour.acceptances
          })),
          backgroundColor: context => {
            const value = context.raw.y;
            if (value === 0) return 'rgba(220, 220, 220, 0.8)'; // Gray for no data
            if (value < 30) return 'rgba(255, 99, 132, 0.8)';   // Red for low acceptance
            if (value < 60) return 'rgba(255, 205, 86, 0.8)';   // Yellow for medium acceptance
            return 'rgba(75, 192, 192, 0.8)';                   // Green for high acceptance
          },
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          radius: 15,
          hoverRadius: 18,
        }
      ]
    };
  };

  // Prepare data for day of week heatmap
  const prepareDayOfWeekData = () => {
    if (!summaryData || !summaryData.byDayOfWeek) return null;
    
    return {
      labels: summaryData.byDayOfWeek.map(day => day.day),
      datasets: [
        {
          label: 'Acceptance Rate (%)',
          data: summaryData.byDayOfWeek.map(day => day.rate),
          backgroundColor: summaryData.byDayOfWeek.map(day => {
            const value = day.rate;
            if (value === 0) return 'rgba(220, 220, 220, 0.8)'; // Gray for no data
            if (value < 30) return 'rgba(255, 99, 132, 0.8)';   // Red for low acceptance
            if (value < 60) return 'rgba(255, 205, 86, 0.8)';   // Yellow for medium acceptance
            return 'rgba(75, 192, 192, 0.8)';                   // Green for high acceptance
          }),
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
        }
      ]
    };
  };

  // Prepare trend analysis data
  const prepareTrendChartData = () => {
    if (!summaryData || !summaryData.acceptanceTrend || summaryData.acceptanceTrend.length === 0) return null;
    
    return {
      labels: summaryData.acceptanceTrend.map(item => item.date),
      datasets: [
        {
          label: 'Daily Acceptance Rate (%)',
          data: summaryData.acceptanceTrend.map(item => item.rate),
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderWidth: 1,
          pointRadius: 3,
          tension: 0.1,
          fill: false,
        },
        {
          label: '7-Day Moving Average (%)',
          data: summaryData.acceptanceTrend.map(item => item.movingAvgRate),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: false,
        },
      ],
    };
  };

  // Prepare chart data for AI Code Lines per Developer
  const prepareBarChartData = () => {
    if (!summaryData || !summaryData.byUser || summaryData.byUser.length === 0) return null;
    
    return {
      labels: summaryData.byUser.map(user => {
        // Shorten user ID for display
        const shortId = user.userId.substring(user.userId.length - 8);
        return shortId;
      }),
      datasets: [
        {
          label: 'AI Code Lines',
          data: summaryData.byUser.map(user => user.aiCodeLines),
          backgroundColor: 'rgba(0, 161, 201, 0.7)',
          borderColor: 'rgba(0, 161, 201, 1)',
          borderWidth: 1,
        },
        {
          label: 'Chat Interactions',
          data: summaryData.byUser.map(user => user.chatInteractions),
          backgroundColor: 'rgba(255, 153, 0, 0.7)',
          borderColor: 'rgba(255, 153, 0, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Prepare chart data for AI Code Lines over Time
  const prepareLineChartData = () => {
    if (!summaryData || !summaryData.byDate || summaryData.byDate.length === 0) return null;
    
    return {
      labels: summaryData.byDate.map(item => item.date),
      datasets: [
        {
          label: 'AI Code Lines',
          data: summaryData.byDate.map(item => item.aiCodeLines),
          borderColor: 'rgba(0, 161, 201, 1)',
          backgroundColor: 'rgba(0, 161, 201, 0.2)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Chat Interactions',
          data: summaryData.byDate.map(item => item.chatInteractions),
          borderColor: 'rgba(255, 153, 0, 1)',
          backgroundColor: 'rgba(255, 153, 0, 0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const barChartData = prepareBarChartData();
  const lineChartData = prepareLineChartData();
  const suggestionAcceptanceData = prepareSuggestionAcceptanceChartData();
  const heatmapData = prepareHeatmapData();
  const dayOfWeekData = prepareDayOfWeekData();
  const trendChartData = prepareTrendChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw;
            
            // For heatmap data points with additional info
            if (typeof value === 'object' && value.suggestions !== undefined) {
              return [
                `${label}: ${value.y.toFixed(1)}%`,
                `Suggestions: ${value.suggestions}`,
                `Acceptances: ${value.acceptances}`
              ];
            }
            
            return `${label}: ${value}`;
          }
        }
      }
    },
  };
  
  const heatmapOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Acceptance Rate (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Hour of Day'
        }
      }
    }
  };
  
  const dayOfWeekOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Acceptance Rate (%)'
        }
      }
    }
  };
  
  const trendOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Acceptance Rate (%)'
        }
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Developer Productivity Dashboard</h1>
      
      <FilterControls onFilterChange={setFilters} />
      
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
      
      {!loading && !error && summaryData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard 
              title="Total AI Code Lines" 
              value={summaryData.totalAICodeLines} 
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>}
              color="bg-amazon-teal text-white"
            />
            <SummaryCard 
              title="Acceptance Rate" 
              value={`${summaryData.acceptanceRate.toFixed(1)}%`} 
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>}
              color="bg-green-500 text-white"
            />
            <SummaryCard 
              title="Chat Interactions" 
              value={summaryData.totalChatInteractions} 
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>}
              color="bg-amazon-orange text-white"
            />
            <SummaryCard 
              title="Inline Suggestions" 
              value={summaryData.totalInlineSuggestions} 
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>}
              color="bg-purple-500 text-white"
            />
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">AI Code Lines per Developer</h2>
              <div className="h-80">
                {barChartData ? (
                  <Bar data={barChartData} options={chartOptions} />
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">AI Code Lines over Time</h2>
              <div className="h-80">
                {lineChartData ? (
                  <Line data={lineChartData} options={chartOptions} />
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced Acceptance Visualizations */}
          <div className="bg-white p-4 rounded-lg shadow mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Amazon Q Acceptance Visualizations</h2>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    activeVisualization === 'comparison'
                      ? 'bg-amazon-teal text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  onClick={() => setActiveVisualization('comparison')}
                >
                  Suggestions vs. Acceptances
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    activeVisualization === 'heatmap'
                      ? 'bg-amazon-teal text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  onClick={() => setActiveVisualization('heatmap')}
                >
                  Acceptance Heatmap
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm ${
                    activeVisualization === 'trend'
                      ? 'bg-amazon-teal text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  onClick={() => setActiveVisualization('trend')}
                >
                  Trend Analysis
                </button>
              </div>
            </div>
            
            <div className="h-96">
              {activeVisualization === 'comparison' && (
                <>
                  {suggestionAcceptanceData ? (
                    <Line data={suggestionAcceptanceData} options={chartOptions} />
                  ) : (
                    <div className="flex justify-center items-center h-full text-gray-500">
                      No suggestion/acceptance data available
                    </div>
                  )}
                </>
              )}
              
              {activeVisualization === 'heatmap' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  <div>
                    <h3 className="text-md font-medium mb-2 text-center">Acceptance Rate by Hour of Day</h3>
                    {heatmapData ? (
                      <Scatter data={heatmapData} options={heatmapOptions} />
                    ) : (
                      <div className="flex justify-center items-center h-full text-gray-500">
                        No heatmap data available
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-md font-medium mb-2 text-center">Acceptance Rate by Day of Week</h3>
                    {dayOfWeekData ? (
                      <Bar data={dayOfWeekData} options={dayOfWeekOptions} />
                    ) : (
                      <div className="flex justify-center items-center h-full text-gray-500">
                        No day of week data available
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {activeVisualization === 'trend' && (
                <>
                  <h3 className="text-md font-medium mb-2 text-center">Acceptance Rate Trend Analysis</h3>
                  {trendChartData ? (
                    <Line data={trendChartData} options={trendOptions} />
                  ) : (
                    <div className="flex justify-center items-center h-full text-gray-500">
                      No trend data available
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* User Activity Table */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Developer Activity Summary</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AI Code Lines
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suggestions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acceptance %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chat Interactions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaryData.byUser.map((user) => (
                    <tr key={user.userId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.userId.substring(user.userId.length - 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.aiCodeLines}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.inlineSuggestions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.inlineSuggestions > 0
                          ? ((user.inlineAcceptances / user.inlineSuggestions) * 100).toFixed(1) + '%'
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.chatInteractions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
