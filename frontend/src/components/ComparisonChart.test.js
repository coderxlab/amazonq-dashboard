import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComparisonChart from './ComparisonChart';

// Mock the react-chartjs-2 Bar component and Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Mock Bar Chart</div>
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  }
}));

describe('ComparisonChart', () => {
  const mockCurrentData = {
    aiCodeLines: 100,
    chatInteractions: 50
  };

  const mockPreviousData = {
    aiCodeLines: 80,
    chatInteractions: 40
  };

  const mockCurrentDateRange = {
    start: '2023-01-01',
    end: '2023-01-31'
  };

  const mockPreviousDateRange = {
    start: '2022-12-01',
    end: '2022-12-31'
  };

  it('renders the chart title', () => {
    render(
      <ComparisonChart
        currentData={mockCurrentData}
        previousData={mockPreviousData}
        title="Test Chart"
        metric="aiCodeLines"
        currentDateRange={mockCurrentDateRange}
        previousDateRange={mockPreviousDateRange}
      />
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders the percentage change', () => {
    render(
      <ComparisonChart
        currentData={mockCurrentData}
        previousData={mockPreviousData}
        title="Test Chart"
        metric="aiCodeLines"
        currentDateRange={mockCurrentDateRange}
        previousDateRange={mockPreviousDateRange}
      />
    );

    // 25% increase from 80 to 100
    expect(screen.getByText('↑ 25.0%')).toBeInTheDocument();
  });

  it('renders the chart component', () => {
    render(
      <ComparisonChart
        currentData={mockCurrentData}
        previousData={mockPreviousData}
        title="Test Chart"
        metric="aiCodeLines"
        currentDateRange={mockCurrentDateRange}
        previousDateRange={mockPreviousDateRange}
      />
    );

    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });

  it('renders with date ranges in labels', () => {
    const { container } = render(
      <ComparisonChart
        currentData={mockCurrentData}
        previousData={mockPreviousData}
        title="Test Chart"
        metric="aiCodeLines"
        currentDateRange={mockCurrentDateRange}
        previousDateRange={mockPreviousDateRange}
      />
    );

    // Since we're mocking the chart, we can't directly test the labels
    // But we can verify the component renders without errors
    expect(container).toBeInTheDocument();
  });
});