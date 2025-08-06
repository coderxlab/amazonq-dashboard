import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PromptLogCard from './PromptLogCard';

// Mock PromptLogDetail component
jest.mock('./PromptLogDetail', () => {
  return function MockPromptLogDetail({ log, onClose }) {
    return (
      <div data-testid="prompt-log-detail">
        Mock Detail View
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('PromptLogCard', () => {
  const mockLog = {
    TimeStamp: '2024-01-01T12:00:00Z',
    UserId: 'user123456789',
    Prompt: 'Test prompt content',
    Response: 'Test response content'
  };

  it('renders basic log information', () => {
    render(<PromptLogCard log={mockLog} />);
    
    // Check timestamp is formatted
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    
    // Check user ID is truncated
    expect(screen.getByText('23456789')).toBeInTheDocument();
    
    // Check prompt and response content
    expect(screen.getByText('Test prompt content')).toBeInTheDocument();
    expect(screen.getByText('Test response content')).toBeInTheDocument();
  });

  it('handles empty prompt and response', () => {
    const emptyLog = {
      ...mockLog,
      Prompt: '',
      Response: ''
    };
    
    render(<PromptLogCard log={emptyLog} />);
    
    // Check empty state messages
    const emptyLabels = screen.getAllByText('(empty)');
    expect(emptyLabels).toHaveLength(2); // One for prompt, one for response
    expect(screen.getByText('No prompt content')).toBeInTheDocument();
    expect(screen.getByText('No response content')).toBeInTheDocument();
    
    // Check warning styling
    const card = screen.getByRole('article');
    expect(card).toHaveClass('border-l-4', 'border-amber-500');
  });

  it('handles empty prompt with response', () => {
    const partialLog = {
      ...mockLog,
      Prompt: '',
      Response: 'Test response content'
    };
    
    render(<PromptLogCard log={partialLog} />);
    
    expect(screen.getAllByText('(empty)')).toHaveLength(1);
    expect(screen.getByText('No prompt content')).toBeInTheDocument();
    expect(screen.getByText('Test response content')).toBeInTheDocument();
  });

  it('handles empty response with prompt', () => {
    const partialLog = {
      ...mockLog,
      Prompt: 'Test prompt content',
      Response: ''
    };
    
    render(<PromptLogCard log={partialLog} />);
    
    expect(screen.getAllByText('(empty)')).toHaveLength(1);
    expect(screen.getByText('Test prompt content')).toBeInTheDocument();
    expect(screen.getByText('No response content')).toBeInTheDocument();
  });

  it('toggles content expansion', () => {
    const longLog = {
      ...mockLog,
      Prompt: 'A'.repeat(200),
      Response: 'B'.repeat(200)
    };
    
    render(<PromptLogCard log={longLog} />);
    
    // Initially content should be truncated
    const promptDiv = screen.getByText(/^A+$/);
    expect(promptDiv).toHaveClass('line-clamp-2');
    
    // Click "Show more"
    fireEvent.click(screen.getByText('Show more'));
    
    // Content should be fully visible
    expect(promptDiv).not.toHaveClass('line-clamp-2');
    
    // Click "Show less"
    fireEvent.click(screen.getByText('Show less'));
    
    // Content should be truncated again
    expect(promptDiv).toHaveClass('line-clamp-2');
  });

  it('opens and closes detail view', () => {
    render(<PromptLogCard log={mockLog} />);
    
    // Initially detail view should not be visible
    expect(screen.queryByTestId('prompt-log-detail')).not.toBeInTheDocument();
    
    // Open detail view
    fireEvent.click(screen.getByText('View details'));
    expect(screen.getByTestId('prompt-log-detail')).toBeInTheDocument();
    
    // Close detail view
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('prompt-log-detail')).not.toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    const logWithTimestamp = {
      ...mockLog,
      TimeStamp: '2024-01-01T12:00:00Z'
    };
    
    render(<PromptLogCard log={logWithTimestamp} />);
    
    // The exact format will depend on the user's locale, but should contain the date and time
    const timestamp = screen.getByText(/2024.*12:00/);
    expect(timestamp).toBeInTheDocument();
  });
});