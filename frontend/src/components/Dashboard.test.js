import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';
import { getActivitySummary, getComparativeMetrics } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  getActivitySummary: jest.fn(),
  getComparativeMetrics: jest.fn(),
}));

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

const mockComparisonData = {
  current: {
    aiCodeLines: 1500,
    chatInteractions: 250,
    inlineSuggestions: 800,
    inlineAcceptances: 600
  },
  previous: {
    aiCodeLines: 1200,
    chatInteractions: 200,
    inlineSuggestions: 700,
    inlineAcceptances: 500
  }
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    getActivitySummary.mockResolvedValue(mockSummaryData);
    getComparativeMetrics.mockResolvedValue(mockComparisonData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<Dashboard users={['user123456789', 'user987654321']} loadingUsers={false} />);
    expect(screen.getByRole('heading', { name: /developer productivity dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('renders summary cards with correct data', async () => {
    render(<Dashboard users={['user123456789', 'user987654321']} loadingUsers={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('1500')).toBeInTheDocument(); // Total AI Code Lines
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // Acceptance Rate
      expect(screen.getByText('250')).toBeInTheDocument(); // Chat Interactions
      expect(screen.getByText('800')).toBeInTheDocument(); // Inline Suggestions
    });
  });

  test('renders enhanced acceptance visualizations section', async () => {
    render(<Dashboard users={['user123456789', 'user987654321']} loadingUsers={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Acceptance Metrics')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /suggestions vs\. acceptances/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /time of day heatmap/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /day of week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /trend analysis/i })).toBeInTheDocument();
    });
  });

  test('toggles between different visualization types', async () => {
    render(<Dashboard users={['user123456789', 'user987654321']} loadingUsers={false} />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Acceptance Metrics')).toBeInTheDocument();
    });
    
    // Default visualization should be comparison (Line chart)
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
    
    // Click on heatmap button
    fireEvent.click(screen.getByRole('button', { name: /time of day heatmap/i }));
    expect(screen.getAllByTestId('bar-chart')[0]).toBeInTheDocument();
    
    // Click on day of week button
    fireEvent.click(screen.getByRole('button', { name: /day of week/i }));
    expect(screen.getAllByTestId('bar-chart')[0]).toBeInTheDocument();
    
    // Click on trend analysis button
    fireEvent.click(screen.getByRole('button', { name: /trend analysis/i }));
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
    
    // Back to comparison
    fireEvent.click(screen.getByRole('button', { name: /suggestions vs\. acceptances/i }));
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
  });

  test('renders developer activity table with correct data', async () => {
    render(<Dashboard users={['user123456789', 'user987654321']} loadingUsers={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Developer Activity Summary')).toBeInTheDocument();
      
      // Check for user IDs (shortened) in the table cells
      const tableCells = screen.getAllByRole('cell');
      expect(tableCells.find(cell => cell.textContent === '23456789')).toBeInTheDocument();
      expect(tableCells.find(cell => cell.textContent === '87654321')).toBeInTheDocument();
      
      // Check for acceptance rates
      expect(tableCells.find(cell => cell.textContent === '80.0%')).toBeInTheDocument();
      expect(tableCells.find(cell => cell.textContent === '72.0%')).toBeInTheDocument();
    });
  });
});