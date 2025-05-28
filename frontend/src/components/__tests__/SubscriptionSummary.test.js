import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionSummary from '../SubscriptionSummary';
import { getSubscriptionMetrics } from '../../services/api';

// Mock the api module
jest.mock('../../services/api');

// Mock Chart.js since we don't need to test its functionality
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  ArcElement: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

jest.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="mock-pie-chart">Mock Pie Chart</div>
}));

describe('SubscriptionSummary', () => {
  const mockMetrics = {
    totalSubscriptions: 100,
    activeSubscriptions: 75,
    pendingSubscriptions: 25,
    individualSubscriptions: 60,
    groupSubscriptions: 40
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    // Create a promise that never resolves to keep the loading state
    let promiseResolve;
    getSubscriptionMetrics.mockImplementation(() => new Promise((resolve) => {
      promiseResolve = resolve;
    }));
    
    await act(async () => {
      render(<SubscriptionSummary />);
    });
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('renders subscription metrics when data is loaded successfully', async () => {
    getSubscriptionMetrics.mockResolvedValue(mockMetrics);
    
    await act(async () => {
      render(<SubscriptionSummary />);
      // Wait for the promise to resolve
      await Promise.resolve();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Subscription Summary')).toBeInTheDocument();
      expect(screen.getByText('Total Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Active Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('Pending Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('renders error message when API call fails', async () => {
    const errorMessage = 'Failed to load subscription metrics';
    getSubscriptionMetrics.mockRejectedValue(new Error(errorMessage));
    
    await act(async () => {
      render(<SubscriptionSummary />);
      // Wait for the promise to reject
      await Promise.resolve();
    });
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  it('calls getSubscriptionMetrics on component mount', async () => {
    getSubscriptionMetrics.mockResolvedValue(mockMetrics);
    
    await act(async () => {
      render(<SubscriptionSummary />);
      await Promise.resolve();
    });
    
    await waitFor(() => {
      expect(getSubscriptionMetrics).toHaveBeenCalledTimes(1);
    });
  });

  it('renders all summary cards with correct data', async () => {
    getSubscriptionMetrics.mockResolvedValue(mockMetrics);
    
    await act(async () => {
      render(<SubscriptionSummary />);
      await Promise.resolve();
    });
    
    await waitFor(() => {
      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(3); // 3 summary cards (total, active, pending)
    });
  });
});