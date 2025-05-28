import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getSubscriptionMetrics } from '../services/api';
import SummaryCard from './SummaryCard';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const SubscriptionSummary = () => {
  const [metrics, setMetrics] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pendingSubscriptions: 0,
    individualSubscriptions: 0,
    groupSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const data = await getSubscriptionMetrics();
        if (isMounted) {
          setMetrics(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching subscription metrics:', err);
          setError('Failed to load subscription metrics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  // Prepare chart data for subscription status
  const statusChartData = {
    labels: ['Active', 'Pending'],
    datasets: [
      {
        data: metrics ? [metrics.activeSubscriptions || 0, metrics.pendingSubscriptions || 0] : [0, 0],
        backgroundColor: ['#4CAF50', '#FFC107'],
        borderColor: ['#388E3C', '#FFB300'],
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
      <div className="flex justify-center items-center h-24" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amazon-teal"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Subscription Summary</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Subscriptions" 
          value={metrics?.totalSubscriptions || 0} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>}
          color="bg-blue-500 text-white"
        />
        
        <SummaryCard 
          title="Active Subscriptions" 
          value={metrics?.activeSubscriptions || 0} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          color="bg-green-500 text-white"
        />
        
        <SummaryCard 
          title="Pending Subscriptions" 
          value={metrics?.pendingSubscriptions || 0} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>}
          color="bg-yellow-500 text-white"
        />
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Subscription Status</h3>
          <div className="h-24">
            <Pie data={statusChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSummary;