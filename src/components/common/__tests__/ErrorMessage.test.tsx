import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';
import { ErrorMessage as ErrorMessageType } from '../../../services/ErrorHandlingService';

describe('ErrorMessage Component', () => {
  const mockError: ErrorMessageType = {
    id: 'test-error-1',
    message: 'Test error message',
    type: 'error',
    timestamp: new Date(),
    dismissed: false
  };

  const mockErrorWithRetry: ErrorMessageType = {
    id: 'test-error-2',
    message: 'Test error with retry',
    type: 'warning',
    timestamp: new Date(),
    retryAction: jest.fn(),
    dismissed: false
  };

  const mockDismiss = jest.fn();
  const mockRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders error message correctly', () => {
    render(<ErrorMessage error={mockError} onDismiss={mockDismiss} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  test('renders error message with retry button when retryAction is provided', () => {
    render(
      <ErrorMessage 
        error={mockErrorWithRetry} 
        onDismiss={mockDismiss} 
        onRetry={mockRetry} 
      />
    );
    
    expect(screen.getByText('Test error with retry')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('calls onDismiss when dismiss button is clicked', () => {
    render(<ErrorMessage error={mockError} onDismiss={mockDismiss} />);
    
    fireEvent.click(screen.getByText('Dismiss'));
    expect(mockDismiss).toHaveBeenCalledWith('test-error-1');
  });

  test('calls onRetry when retry button is clicked', () => {
    render(
      <ErrorMessage 
        error={mockErrorWithRetry} 
        onDismiss={mockDismiss} 
        onRetry={mockRetry} 
      />
    );
    
    fireEvent.click(screen.getByText('Retry'));
    expect(mockRetry).toHaveBeenCalledWith('test-error-2');
  });

  test('applies correct CSS class based on error type', () => {
    const { rerender } = render(<ErrorMessage error={mockError} onDismiss={mockDismiss} />);
    
    expect(screen.getByText('Test error message').closest('.error-message')).toHaveClass('error');
    
    rerender(
      <ErrorMessage 
        error={{ ...mockError, type: 'warning' }} 
        onDismiss={mockDismiss} 
      />
    );
    
    expect(screen.getByText('Test error message').closest('.error-message')).toHaveClass('warning');
    
    rerender(
      <ErrorMessage 
        error={{ ...mockError, type: 'info' }} 
        onDismiss={mockDismiss} 
      />
    );
    
    expect(screen.getByText('Test error message').closest('.error-message')).toHaveClass('info');
  });
});