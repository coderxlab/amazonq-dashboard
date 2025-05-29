import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';
import { getActivitySummary, getComparativeMetrics } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  getActivitySummary: jest.fn(),
  getComparativeMetrics: jest.fn(),
  getSubscriptionMetrics: jest.fn().mockResolvedValue({
    totalSubscriptions: 100,
    activeSubscriptions: 80,
    pendingSubscriptions: 20,
    individualSubscriptions: 60,
    groupSubscriptions: 40
  })
}));

// Mock chart.js to avoid canvas rendering issues in tests
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  ArcElement: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Scatter: () => <div data-testid="scatter-chart">Scatter Chart</div>,
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>
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
      userName: 'John Doe',
      aiCodeLines: 500,
      chatInteractions: 100,
      inlineSuggestions: 300,
      inlineAcceptances: 240
    },
    {
      userId: 'user987654321',
      userName: 'Jane Smith',
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

  test('renders loading state initially', async () => {
    // Mock API calls to delay resolution
    getActivitySummary.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    getComparativeMetrics.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const mockUsers = [
      { UserId: 'user123456789', Name: 'John Doe' },
      { UserId: 'user987654321', Name: 'Jane Smith' }
    ];

    render(<Dashboard users={mockUsers} loadingUsers={false} />);
    
    // Check for heading and loading spinner
    expect(screen.getByRole('heading', { name: /developer productivity dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('renders summary cards with correct data', async () => {
    const mockUsers = [
      { UserId: 'user123456789', Name: 'John Doe' },
      { UserId: 'user987654321', Name: 'Jane Smith' }
    ];

    await act(async () => {
      render(<Dashboard users={mockUsers} loadingUsers={false} />);
      await Promise.resolve();
    });
    
    await waitFor(() => {
      expect(screen.getByText('1500')).toBeInTheDocument(); // Total AI Code Lines
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // Acceptance Rate
      expect(screen.getByText('250')).toBeInTheDocument(); // Chat Interactions
      expect(screen.getByText('800')).toBeInTheDocument(); // Inline Suggestions
    });
  });

  test('renders enhanced acceptance visualizations section', async () => {
    const mockUsers = [
      { UserId: 'user123456789', Name: 'John Doe' },
      { UserId: 'user987654321', Name: 'Jane Smith' }
    ];

    await act(async () => {
      render(<Dashboard users={mockUsers} loadingUsers={false} />);
      await Promise.resolve();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Acceptance Metrics')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /suggestions vs\. acceptances/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /day of week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /trend analysis/i })).toBeInTheDocument();
    });
  });

  test('toggles between different visualization types', async () => {
    const mockUsers = [
      { UserId: 'user123456789', Name: 'John Doe' },
      { UserId: 'user987654321', Name: 'Jane Smith' }
    ];

    await act(async () => {
      render(<Dashboard users={mockUsers} loadingUsers={false} />);
      await Promise.resolve();
    });
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Acceptance Metrics')).toBeInTheDocument();
    });
    
    // Default visualization should be comparison (Line chart)
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
    
    // Click on day of week button
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /day of week/i }));
      await Promise.resolve();
    });
    expect(screen.getAllByTestId('bar-chart')[0]).toBeInTheDocument();
    
    // Click on trend analysis button
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /trend analysis/i }));
      await Promise.resolve();
    });
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
    
    // Back to comparison
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /suggestions vs\. acceptances/i }));
      await Promise.resolve();
    });
    expect(screen.getAllByTestId('line-chart')[0]).toBeInTheDocument();
  });

  test('renders developer activity table with correct data', async () => {
    const mockUsers = [
      { UserId: 'user123456789', Name: 'John Doe' },
      { UserId: 'user987654321', Name: 'Jane Smith' }
    ];
    
    render(<Dashboard users={mockUsers} loadingUsers={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Developer Activity Summary')).toBeInTheDocument();
      
      // Check for user names and IDs in the table cells
      const tableCells = screen.getAllByRole('cell');
      expect(tableCells.find(cell => cell.textContent === 'John Doe')).toBeInTheDocument();
      expect(tableCells.find(cell => cell.textContent === 'Jane Smith')).toBeInTheDocument();
      expect(tableCells.find(cell => cell.textContent === '23456789')).toBeInTheDocument();
      expect(tableCells.find(cell => cell.textContent === '87654321')).toBeInTheDocument();
      
      // Check for acceptance rates
      expect(tableCells.find(cell => cell.textContent === '80.0%')).toBeInTheDocument();
      expect(tableCells.find(cell => cell.textContent === '72.0%')).toBeInTheDocument();
    });
  });
});