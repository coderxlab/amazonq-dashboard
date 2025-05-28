import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import SummaryCard from './SummaryCard';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const SubscriptionMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pendingSubscriptions: 0,
    individualSubscriptions: 0,
    groupSubscriptions: 0,
    subscriptionsByDate: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/subscriptions/metrics`);
        setMetrics(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching subscription metrics:', err);
        setError('Failed to load subscription metrics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Prepare chart data for subscription status
  const statusChartData = {
    labels: ['Active', 'Pending'],
    datasets: [
      {
        data: [metrics.activeSubscriptions, metrics.pendingSubscriptions],
        backgroundColor: ['#4CAF50', '#FFC107'],
        borderColor: ['#388E3C', '#FFB300'],
        borderWidth: 1,
      },
    ],
  };

  // Prepare chart data for subscription type
  const typeChartData = {
    labels: ['Individual', 'Group'],
    datasets: [
      {
        data: [metrics.individualSubscriptions, metrics.groupSubscriptions],
        backgroundColor: ['#2196F3', '#9C27B0'],
        borderColor: ['#1976D2', '#7B1FA2'],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amazon-teal"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Subscription Metrics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard 
          title="Total Subscriptions" 
          value={metrics.totalSubscriptions} 
          icon="users" 
          color="bg-blue-500"
        />
        <SummaryCard 
          title="Active Subscriptions" 
          value={metrics.activeSubscriptions} 
          icon="check-circle" 
          color="bg-green-500"
        />
        <SummaryCard 
          title="Pending Subscriptions" 
          value={metrics.pendingSubscriptions} 
          icon="clock" 
          color="bg-yellow-500"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Subscription Status</h3>
          <div className="h-64">
            <Pie data={statusChartData} options={chartOptions} />
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Subscription Type</h3>
          <div className="h-64">
            <Pie data={typeChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionMetrics;
