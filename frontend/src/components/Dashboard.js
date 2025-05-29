import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
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
  Colors,
} from 'chart.js';
import FilterControls from './FilterControls';
import SummaryCard from './SummaryCard';
import ProductivityTrends from './ProductivityTrends';
import ComparisonChart from './ComparisonChart';
import SubscriptionSummary from './SubscriptionSummary';
import { getActivitySummary, getComparativeMetrics } from '../services/api';
import moment from 'moment';

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
  Colors
);

const Dashboard = ({users, loadingUsers}) => {
  const [summaryData, setSummaryData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeVisualization, setActiveVisualization] = useState('comparison'); // Default visualization
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  
  // Define tabs for navigation
  const tabs = [
    { id: 'summary', label: 'Summary Dashboard' },
    { id: 'productivity', label: 'Productivity Trends' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getActivitySummary(filters);
        setSummaryData(data);

        // Fetch comparative data for the previous period
        const { startDate, endDate, userId } = filters;
        let tempUserIds = userId
        if (!userId) tempUserIds = users.join(", ")

        let tempStartDate = startDate
        let tempEndDate = endDate
        if (!startDate || !endDate) {
          tempEndDate = moment().format('YYYY-MM-DD');
          tempStartDate = moment().subtract(1, 'week').format('YYYY-MM-DD');
        }

        setStartDate(tempStartDate)
        setEndDate(tempEndDate)

        const start = moment(tempStartDate);
        const end = moment(tempEndDate);
        const duration = moment.duration(end.diff(start));
        const compareStartDate = start.clone().subtract(duration).format('YYYY-MM-DD');
        const compareEndDate = start.clone().subtract(1, 'day').format('YYYY-MM-DD');

        const compareData = await getComparativeMetrics({
          userIds: tempUserIds,
          startDate: tempStartDate,
          endDate: tempEndDate,
          compareStartDate,
          compareEndDate
        });
        setComparisonData(compareData);
        
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, users]);

  // Prepare chart data for Suggestions vs Acceptances over time
  const prepareSuggestionsVsAcceptancesData = useMemo(() => {
    if (!summaryData || !summaryData.suggestionsVsAcceptances || summaryData.suggestionsVsAcceptances.length === 0) return null;
    
    return {
      labels: summaryData.suggestionsVsAcceptances.map(item => item.date),
      datasets: [
        {
          label: 'Suggestions',
          data: summaryData.suggestionsVsAcceptances.map(item => item.suggestions),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Acceptances',
          data: summaryData.suggestionsVsAcceptances.map(item => item.acceptances),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [summaryData]);



  // Prepare data for day of week heatmap
  const prepareDayOfWeekData = useMemo(() => {
    if (!summaryData || !summaryData.byDayOfWeek || summaryData.byDayOfWeek.length === 0) return null;
    
    return {
      labels: summaryData.byDayOfWeek.map(item => item.dayName),
      datasets: [
        {
          label: 'Acceptance Rate (%)',
          data: summaryData.byDayOfWeek.map(item => item.rate),
          backgroundColor: summaryData.byDayOfWeek.map(item => {
            // Color gradient based on acceptance rate
            const rate = item.rate;
            if (rate >= 80) return 'rgba(0, 200, 0, 0.8)';
            if (rate >= 60) return 'rgba(100, 200, 0, 0.7)';
            if (rate >= 40) return 'rgba(200, 200, 0, 0.6)';
            if (rate >= 20) return 'rgba(200, 100, 0, 0.5)';
            return 'rgba(200, 0, 0, 0.4)';
          }),
          borderWidth: 1,
          borderColor: '#ccc',
        }
      ]
    };
  }, [summaryData]);

  // Prepare trend analysis data
  const prepareTrendAnalysisData = useMemo(() => {
    if (!summaryData || !summaryData.trendAnalysis || !summaryData.trendAnalysis.daily || summaryData.trendAnalysis.daily.length === 0) return null;
    
    return {
      labels: summaryData.trendAnalysis.daily.map(item => item.date),
      datasets: [
        {
          label: 'Daily Acceptance Rate (%)',
          data: summaryData.trendAnalysis.daily.map(item => item.acceptanceRate),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Weekly Trend',
          data: summaryData.trendAnalysis.daily.map((dailyItem, index) => {
            // Find if there's a weekly data point for this date
            const weeklyData = summaryData.trendAnalysis.weekly.find(w => w.date === dailyItem.date);
            
            // Return weekly data if it exists for this date, otherwise null
            return weeklyData ? weeklyData.acceptanceRate : null;
          }),         
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 1)',
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false,
          type: 'scatter',
        },
        {
          label: 'Monthly Trend',
          data: summaryData.trendAnalysis.daily.map((dailyItem, index) => {
            // Find if there's a monthly data point for this date
            const monthlyData = summaryData.trendAnalysis.monthly.find(m => m.date === dailyItem.date);
            
            // Return monthly data if it exists for this date, otherwise null
            return monthlyData ? monthlyData.acceptanceRate : null;
          }),         
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
          type: 'scatter',
        }
      ]
    };
  }, [summaryData]);

  // Prepare chart data for AI Code Lines per Developer
  const prepareBarChartData = useMemo(() => {
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
  }, [summaryData]);

  // Prepare chart data for AI Code Lines over Time
  const prepareLineChartData = useMemo(() => {
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
  }, [summaryData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };
  

  
  // Options for day of week chart
  const dayOfWeekOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
          text: 'Day of Week'
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
            return `Acceptance Rate: ${context.raw.toFixed(1)}%`;
          }
        }
      }
    }
  };
  
  // Options for trend analysis
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Acceptance Rate (%)'
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
            let value = context.raw;
            if (context.dataset.label === 'Weekly Trend') {
              return value !== null && value !== undefined 
                ? `Weekly Average: ${value.toFixed(2)}%` 
                : 'No weekly data';
            } else if (context.dataset.label === 'Monthly Trend') {
              return value !== null && value !== undefined 
                ? `Monthly Average: ${value.toFixed(2)}%` 
                : 'No monthly data';
            }
            return value !== null && value !== undefined 
              ? `Daily Rate: ${value.toFixed(2)}%` 
              : 'No data';
          }
        }
      }
    },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Developer Productivity Dashboard</h1>
      
      {/* Subscription Summary */}
      <SubscriptionSummary />
      
      <FilterControls onFilterChange={setFilters} users={users} loadingUsers={loadingUsers} />
      
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-amazon-teal text-amazon-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div data-testid="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-teal"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {!loading && !error && activeTab === 'summary' && summaryData && (
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

          {/* Original Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">AI Code Lines per Developer</h2>
              <div className="h-80">
                {prepareBarChartData ? (
                  <Bar data={prepareBarChartData} options={chartOptions} />
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
                {prepareLineChartData ? (
                  <Line data={prepareLineChartData} options={chartOptions} />
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
            <h2 className="text-lg font-semibold mb-4">Acceptance Metrics</h2>
            
            {/* Visualization Type Selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className={`px-3 py-1 rounded-md ${activeVisualization === 'comparison' ? 'bg-amazon-teal text-white' : 'bg-gray-200'}`}
                onClick={() => setActiveVisualization('comparison')}
              >
                Suggestions vs. Acceptances
              </button>

              <button
                className={`px-3 py-1 rounded-md ${activeVisualization === 'dayOfWeek' ? 'bg-amazon-teal text-white' : 'bg-gray-200'}`}
                onClick={() => setActiveVisualization('dayOfWeek')}
              >
                Day of Week
              </button>
              <button
                className={`px-3 py-1 rounded-md ${activeVisualization === 'trend' ? 'bg-amazon-teal text-white' : 'bg-gray-200'}`}
                onClick={() => setActiveVisualization('trend')}
              >
                Trend Analysis
              </button>
            </div>
            
            {/* Visualization Display */}
            <div className="h-80">
              {activeVisualization === 'comparison' && (
                prepareSuggestionsVsAcceptancesData ? (
                  <Line data={prepareSuggestionsVsAcceptancesData} options={chartOptions} />
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No data available for suggestions vs. acceptances
                  </div>
                )
              )}
              

              
              {activeVisualization === 'dayOfWeek' && (
                prepareDayOfWeekData ? (
                  <Bar data={prepareDayOfWeekData} options={dayOfWeekOptions} />
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No data available for day of week analysis
                  </div>
                )
              )}
              
              {activeVisualization === 'trend' && (
                prepareTrendAnalysisData ? (
                  <Line data={prepareTrendAnalysisData} options={trendOptions} />
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    No data available for trend analysis
                  </div>
                )
              )}
            </div>
          </div>
          


          {/* Comparative Metrics */}
          {comparisonData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ComparisonChart
                currentData={comparisonData.current}
                previousData={comparisonData.previous}
                title="AI Code Lines Comparison"
                metric="aiCodeLines"
                currentDateRange={{ start: startDate, end: endDate }}
                previousDateRange={{ 
                  start: moment(startDate).subtract(moment(endDate).diff(moment(startDate))).format('YYYY-MM-DD'),
                  end: moment(startDate).subtract(1, 'day').format('YYYY-MM-DD')
                }}
              />
              <ComparisonChart
                currentData={comparisonData.current}
                previousData={comparisonData.previous}
                title="Chat Interactions Comparison"
                metric="chatInteractions"
                currentDateRange={{ start: startDate, end: endDate }}
                previousDateRange={{ 
                  start: moment(startDate).subtract(moment(endDate).diff(moment(startDate))).format('YYYY-MM-DD'),
                  end: moment(startDate).subtract(1, 'day').format('YYYY-MM-DD')
                }}
              />
            </div>
          )}
          
          
          {/* User Activity Table */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Developer Activity Summary</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Name
                    </th>
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
                        {user.userName || 'Unknown'}
                      </td>
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

      {/* Productivity Trends Tab */}
      {!loading && !error && activeTab === 'productivity' && (
        <ProductivityTrends filters={filters} />
      )}
    </div>
  );
};

export default Dashboard;
