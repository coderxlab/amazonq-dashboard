import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';
import { getActivitySummary } from '../services/api';

// Mock the API service
jest.mock('../services/api');

// Mock chart.js to avoid canvas rendering issues in tests
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Scatter: () => <div data-testid="scatter-chart">Scatter Chart</div>,
}));

// Mock data for testing
const mockSummaryData = {
  totalAICodeLines: 1500,
  totalChatInteractions: 250,
  totalInlineSuggestions: 800,
  totalInlineAcceptances: 600,
  acceptanceRate: 75,
  byUser: [
    {
      userId: 'user123456789',
      aiCodeLines: 500,
      chatInteractions: 100,
      inlineSuggestions: 300,
      inlineAcceptances: 240
    },
    {
      userId: 'user987654321',
      aiCodeLines: 1000,
      chatInteractions: 150,
      inlineSuggestions: 500,
      inlineAcceptances: 360
    }
  ],
  byDate: [
    {
      date: '2023-01-01',
      aiCodeLines: 750,
      chatInteractions: 125,
      inlineSuggestions: 400,
      inlineAcceptances: 300
    },
    {
      date: '2023-01-02',
      aiCodeLines: 750,
      chatInteractions: 125,
      inlineSuggestions: 400,
      inlineAcceptances: 300
    }
  ],
  // New data structures for enhanced visualizations
  byHourOfDay: Array(24).fill().map((_, i) => ({
    hour: i,
    suggestions: 30 + Math.floor(Math.random() * 20),
    acceptances: 20 + Math.floor(Math.random() * 15),
    rate: 60 + Math.floor(Math.random() * 30)
  })),
  byDayOfWeek: Array(7).fill().map((_, i) => ({
    day: i,
    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
    suggestions: 100 + Math.floor(Math.random() * 50),
    acceptances: 70 + Math.floor(Math.random() * 40),
    rate: 65 + Math.floor(Math.random() * 25)
  })),
  trendAnalysis: {
    daily: [
      { date: '2023-01-01', acceptanceRate: 70, movingAverageDays: 1 },
      { date: '2023-01-02', acceptanceRate: 80, movingAverageDays: 2 }
    ],
    weekly: [
      { weekKey: '2023-W1', date: '2023-01-01', acceptanceRate: 75 }
    ],
    monthly: [
      { monthKey: '2023-01', date: '2023-01-01', acceptanceRate: 75 }
    ]
  },
  suggestionsVsAcceptances: [
    { date: '2023-01-01', suggestions: 400, acceptances: 300, timestamp: 1672531200000 },
    { date: '2023-01-02', suggestions: 400, acceptances: 300, timestamp: 1672617600000 }
  ]
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    getActivitySummary.mockResolvedValue(mockSummaryData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: /developer productivity dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('renders summary cards with correct data', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('1500')).toBeInTheDocument(); // Total AI Code Lines
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // Acceptance Rate
      expect(screen.getByText('250')).toBeInTheDocument(); // Chat Interactions
      expect(screen.getByText('800')).toBeInTheDocument(); // Inline Suggestions
    });
  });

  test('renders enhanced acceptance visualizations section', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Acceptance Metrics')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /suggestions vs\. acceptances/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /time of day heatmap/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /day of week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /trend analysis/i })).toBeInTheDocument();
    });
  });

  test('toggles between different visualization types', async () => {
    render(<Dashboard />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Acceptance Metrics')).toBeInTheDocument();
    });
    
    // Default visualization should be comparison (Line chart)
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
    
    // Click on heatmap button
    fireEvent.click(screen.getByRole('button', { name: /time of day heatmap/i }));
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // Click on day of week button
    fireEvent.click(screen.getByRole('button', { name: /day of week/i }));
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    
    // Click on trend analysis button
    fireEvent.click(screen.getByRole('button', { name: /trend analysis/i }));
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
    
    // Back to comparison
    fireEvent.click(screen.getByRole('button', { name: /suggestions vs\. acceptances/i }));
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
  });

  test('renders developer activity table with correct data', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Developer Activity Summary')).toBeInTheDocument();
      
      // Check for user IDs (shortened)
      expect(screen.getByText('23456789')).toBeInTheDocument();
      expect(screen.getByText('87654321')).toBeInTheDocument();
      
      // Check for acceptance rates
      expect(screen.getByText('80.0%')).toBeInTheDocument(); // 240/300 * 100
      expect(screen.getByText('72.0%')).toBeInTheDocument(); // 360/500 * 100
    });
  });
});