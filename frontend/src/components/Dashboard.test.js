import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock the API service
jest.mock('../services/api', () => ({
  getActivitySummary: jest.fn(() => Promise.resolve({
    totalAICodeLines: 100,
    totalChatInteractions: 50,
    totalInlineSuggestions: 200,
    totalInlineAcceptances: 150,
    acceptanceRate: 75,
    byUser: [],
    byDate: [],
    acceptanceRateTimeSeries: {
      current: {},
      previous: {},
      granularity: 'daily'
    }
  }))
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>
}));

test('renders dashboard title', () => {
  render(<Dashboard />);
  const titleElement = screen.getByText(/Developer Productivity Dashboard/i);
  expect(titleElement).toBeInTheDocument();
});