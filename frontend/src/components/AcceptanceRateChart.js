import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import moment from 'moment';
import { getAcceptanceRateTrends } from '../services/api';

const AcceptanceRateChart = ({ filters }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [granularity, setGranularity] = useState('daily');
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAcceptanceRateTrends({
          ...filters,
          granularity,
          compareWithPrevious
        });
        setChartData(data);
      } catch (err) {
        setError('Failed to fetch acceptance rate trends');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (filters.startDate && filters.endDate) {
      fetchData();
    }
  }, [filters, granularity, compareWithPrevious]);

  const prepareChartData = () => {
    if (!chartData || !chartData.currentPeriod || chartData.currentPeriod.length === 0) {
      return null;
    }

    // Format labels based on granularity
    const formatLabel = (period) => {
      switch (chartData.granularity) {
        case 'weekly':
          // Convert YYYY-WW to Week WW, YYYY
          const [year, week] = period.split('-W');
          return `Week ${week}, ${year}`;
        case 'monthly':
          // Convert YYYY-MM to Month YYYY
          return moment(period, 'YYYY-MM').format('MMMM YYYY');
        case 'daily':
        default:
          // Convert YYYY-MM-DD to DD MMM
          return moment(period).format('DD MMM');
      }
    };

    const datasets = [
      {
        label: 'Acceptance Rate',
        data: chartData.currentPeriod.map(item => item.acceptanceRate),
        borderColor: 'rgba(0, 161, 201, 1)',
        backgroundColor: 'rgba(0, 161, 201, 0.2)',
        tension: 0.4,
        fill: true,
      }
    ];

    // Add previous period dataset if available
    if (chartData.hasPreviousPeriod && chartData.previousPeriod.length > 0) {
      datasets.push({
        label: 'Previous Period',
        data: chartData.previousPeriod.map(item => item.acceptanceRate),
        borderColor: 'rgba(128, 128, 128, 1)',
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
      });
    }

    return {
      labels: chartData.currentPeriod.map(item => formatLabel(item.period)),
      datasets
    };
  };

  const data = prepareChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Acceptance Rate (%)'
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time Period'
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
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Acceptance Rate Trends</h2>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <label className="mr-2 text-sm">Granularity:</label>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="mr-2 text-sm">Compare:</label>
            <input
              type="checkbox"
              checked={compareWithPrevious}
              onChange={(e) => setCompareWithPrevious(e.target.checked)}
              className="form-checkbox h-4 w-4 text-amazon-teal"
            />
          </div>
        </div>
      </div>
      
      <div className="h-80">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-teal"></div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center items-center h-full text-red-500">
            {error}
          </div>
        )}
        
        {!loading && !error && data ? (
          <Line data={data} options={chartOptions} />
        ) : (
          !loading && !error && (
            <div className="flex justify-center items-center h-full text-gray-500">
              No data available
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AcceptanceRateChart;