import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AcceptanceRateChart from './AcceptanceRateChart';
import { getAcceptanceRateTrends } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  getAcceptanceRateTrends: jest.fn()
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>
}));

describe('AcceptanceRateChart Component', () => {
  const mockFilters = {
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    userId: ''
  };

  const mockChartData = {
    granularity: 'daily',
    currentPeriod: [
      { period: '2025-01-01', acceptanceRate: 75.5, inlineSuggestions: 100, inlineAcceptances: 75 },
      { period: '2025-01-02', acceptanceRate: 80.0, inlineSuggestions: 90, inlineAcceptances: 72 }
    ],
    hasPreviousPeriod: false,
    previousPeriod: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    getAcceptanceRateTrends.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<AcceptanceRateChart filters={mockFilters} />);
    
    expect(screen.getByText('Acceptance Rate Trends')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('daily');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  test('renders chart when data is loaded', async () => {
    getAcceptanceRateTrends.mockResolvedValue(mockChartData);
    
    render(<AcceptanceRateChart filters={mockFilters} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
    
    expect(getAcceptanceRateTrends).toHaveBeenCalledWith({
      ...mockFilters,
      granularity: 'daily',
      compareWithPrevious: false
    });
  });

  test('changes granularity when dropdown is changed', async () => {
    getAcceptanceRateTrends.mockResolvedValue(mockChartData);
    
    render(<AcceptanceRateChart filters={mockFilters} />);
    
    // Change granularity to weekly
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'weekly' } });
    
    await waitFor(() => {
      expect(getAcceptanceRateTrends).toHaveBeenCalledWith({
        ...mockFilters,
        granularity: 'weekly',
        compareWithPrevious: false
      });
    });
  });

  test('toggles comparison when checkbox is clicked', async () => {
    getAcceptanceRateTrends.mockResolvedValue(mockChartData);
    
    render(<AcceptanceRateChart filters={mockFilters} />);
    
    // Toggle comparison
    fireEvent.click(screen.getByRole('checkbox'));
    
    await waitFor(() => {
      expect(getAcceptanceRateTrends).toHaveBeenCalledWith({
        ...mockFilters,
        granularity: 'daily',
        compareWithPrevious: true
      });
    });
  });

  test('displays error message when API call fails', async () => {
    getAcceptanceRateTrends.mockRejectedValue(new Error('API Error'));
    
    render(<AcceptanceRateChart filters={mockFilters} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch acceptance rate trends')).toBeInTheDocument();
    });
  });

  test('does not fetch data when date filters are missing', () => {
    render(<AcceptanceRateChart filters={{}} />);
    
    expect(getAcceptanceRateTrends).not.toHaveBeenCalled();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});