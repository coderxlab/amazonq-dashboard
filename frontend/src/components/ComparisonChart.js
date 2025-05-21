import React from 'react';
import { Bar } from 'react-chartjs-2';

const ComparisonChart = ({ currentData, previousData, title, metric, currentDateRange, previousDateRange }) => {
  const formatDateRange = (range) => {
    if (!range) return '';
    return `${range.start} to ${range.end}`;
  };

  const data = {
    labels: [
      formatDateRange(currentDateRange) || 'Current Period',
      formatDateRange(previousDateRange) || 'Previous Period'
    ],
    datasets: [
      {
        label: metric,
        data: [
          currentData[metric],
          previousData[metric]
        ],
        backgroundColor: [
          'rgba(0, 161, 201, 0.7)',
          'rgba(255, 153, 0, 0.7)'
        ],
        borderColor: [
          'rgba(0, 161, 201, 1)',
          'rgba(255, 153, 0, 1)'
        ],
        borderWidth: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Calculate percentage change
  const calculateChange = () => {
    const current = currentData[metric];
    const previous = previousData[metric];
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const change = calculateChange();

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {change !== null && (
          <div className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default ComparisonChart;