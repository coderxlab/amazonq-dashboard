import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { getAdoptionComparison, exportTrendData } from '../services/api';

const AdoptionComparison = ({ filters }) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [daysBeforeAfter, setDaysBeforeAfter] = useState(30);

  useEffect(() => {
    const fetchComparison = async () => {
      if (!filters.userId) {
        setError('Please select a user to view adoption comparison');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await getAdoptionComparison({
          ...filters,
          daysBeforeAfter
        });
        setComparisonData(data);
      } catch (err) {
        setError('Failed to fetch adoption comparison data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [filters, daysBeforeAfter]);

  const handleExport = async () => {
    try {
      await exportTrendData({
        type: 'adoption',
        ...filters,
        daysBeforeAfter
      });
    } catch (err) {
      setError('Failed to export adoption comparison data');
      console.error(err);
    }
  };

  const prepareChartData = () => {
    if (!comparisonData) return null;
    
    const { beforePeriod, afterPeriod } = comparisonData;
    
    const metrics = [
      'aiCodeLines',
      'chatInteractions',
      'inlineSuggestions',
      'inlineAcceptances',
      'acceptanceRate'
    ];
    
    const labels = metrics.map(getMetricLabel);
    
    return {
      labels,
      datasets: [
        {
          label: 'Before Adoption',
          data: metrics.map(metric => beforePeriod.metrics[metric]),
          backgroundColor: 'rgba(107, 114, 128, 0.7)',
          borderColor: 'rgba(107, 114, 128, 1)',
          borderWidth: 1,
        },
        {
          label: 'After Adoption',
          data: metrics.map(metric => afterPeriod.metrics[metric]),
          backgroundColor: 'rgba(0, 161, 201, 0.7)',
          borderColor: 'rgba(0, 161, 201, 1)',
          borderWidth: 1,
        }
      ]
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
          text: 'Value'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Metric'
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
        <h2 className="text-lg font-semibold">Before/After Amazon Q Adoption Comparison</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            disabled={loading || !comparisonData}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Days Before/After Adoption</label>
        <select
          className="w-full md:w-1/4 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
          value={daysBeforeAfter}
          onChange={(e) => setDaysBeforeAfter(Number(e.target.value))}
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
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
      
      {!loading && !error && comparisonData && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Adoption Date:</span> {comparisonData.adoptionDate}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Before Period:</span> {comparisonData.beforePeriod.startDate} to {comparisonData.beforePeriod.endDate}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">After Period:</span> {comparisonData.afterPeriod.startDate} to {comparisonData.afterPeriod.endDate}
            </p>
          </div>
          
          <div className="h-80 mb-6">
            {chartData ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                No comparison data available
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Before Adoption
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    After Adoption
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change (%)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.keys(comparisonData.beforePeriod.metrics).map((metric) => (
                  <tr key={metric}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getMetricLabel(metric)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {metric === 'acceptanceRate' 
                        ? `${comparisonData.beforePeriod.metrics[metric].toFixed(2)}%` 
                        : comparisonData.beforePeriod.metrics[metric]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {metric === 'acceptanceRate' 
                        ? `${comparisonData.afterPeriod.metrics[metric].toFixed(2)}%` 
                        : comparisonData.afterPeriod.metrics[metric]}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      comparisonData.percentageChanges[metric] > 0 ? 'text-green-600' : 
                      comparisonData.percentageChanges[metric] < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {comparisonData.percentageChanges[metric] > 0 ? '+' : ''}
                      {comparisonData.percentageChanges[metric].toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      
      {!loading && !error && !comparisonData && (
        <div className="flex justify-center items-center h-64 text-gray-500">
          Please select a user to view adoption comparison
        </div>
      )}
    </div>
  );
};

export default AdoptionComparison;