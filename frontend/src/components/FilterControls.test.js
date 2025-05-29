import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterControls from './FilterControls';

// Mock react-datepicker to avoid implementation details
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ onChange, selected, placeholderText }) {
    return (
      <input
        type="text"
        onChange={(e) => onChange(new Date(e.target.value))}
        value={selected ? selected.toISOString().split('T')[0] : ''}
        placeholder={placeholderText}
        data-testid="date-picker"
      />
    );
  };
});

describe('FilterControls', () => {
  const mockOnFilterChange = jest.fn();
  const mockUsers = ['user123456789', 'user987654321'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all filter controls', () => {
    render(<FilterControls onFilterChange={mockOnFilterChange} users={mockUsers} loading={false} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('displays shortened user IDs in select options', () => {
    render(<FilterControls onFilterChange={mockOnFilterChange} users={mockUsers} loading={false} />);
    
    expect(screen.getByText('23456789')).toBeInTheDocument();
    expect(screen.getByText('87654321')).toBeInTheDocument();
  });

  it('handles user selection', () => {
    render(<FilterControls onFilterChange={mockOnFilterChange} users={mockUsers} loading={false} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'user123456789' } });
    
    fireEvent.click(screen.getByText('Apply Filters'));
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      userId: 'user123456789',
      startDate: null,
      endDate: null
    });
  });

  it('handles date selection', () => {
    render(<FilterControls onFilterChange={mockOnFilterChange} users={mockUsers} loading={false} />);
    
    const datePickers = screen.getAllByTestId('date-picker');
    
    // Set start date
    fireEvent.change(datePickers[0], { target: { value: '2024-01-01' } });
    
    // Set end date
    fireEvent.change(datePickers[1], { target: { value: '2024-01-31' } });
    
    fireEvent.click(screen.getByText('Apply Filters'));
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      userId: '',
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    });
  });

  it('handles filter reset', () => {
    render(<FilterControls onFilterChange={mockOnFilterChange} users={mockUsers} loading={false} />);
    
    // Set some filters first
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'user123456789' } });
    
    const datePickers = screen.getAllByTestId('date-picker');
    fireEvent.change(datePickers[0], { target: { value: '2024-01-01' } });
    fireEvent.change(datePickers[1], { target: { value: '2024-01-31' } });
    
    // Reset filters
    fireEvent.click(screen.getByText('Reset'));
    
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      userId: '',
      startDate: null,
      endDate: null
    });
  });

  it('disables user select when loading', () => {
    render(<FilterControls onFilterChange={mockOnFilterChange} users={mockUsers} loading={true} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });
});