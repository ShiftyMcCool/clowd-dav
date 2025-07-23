import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LoadingProvider, useLoading } from '../LoadingContext';

// Test component that uses the loading context
const TestComponent: React.FC = () => {
  const { loadingState, showLoading, hideLoading } = useLoading();
  
  return (
    <div>
      <div data-testid="loading-state">
        {loadingState.isLoading ? 'Loading' : 'Not Loading'}
      </div>
      <div data-testid="loading-text">{loadingState.text}</div>
      <div data-testid="loading-size">{loadingState.size}</div>
      <button onClick={() => showLoading('Test loading', 'large')}>
        Show Loading
      </button>
      <button onClick={hideLoading}>Hide Loading</button>
    </div>
  );
};

describe('LoadingContext', () => {
  it('provides initial loading state', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('loading-text')).toHaveTextContent('Loading...');
    expect(screen.getByTestId('loading-size')).toHaveTextContent('medium');
  });

  it('updates loading state when showLoading is called', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    act(() => {
      screen.getByText('Show Loading').click();
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');
    expect(screen.getByTestId('loading-text')).toHaveTextContent('Test loading');
    expect(screen.getByTestId('loading-size')).toHaveTextContent('large');
  });

  it('hides loading when hideLoading is called', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );

    // First show loading
    act(() => {
      screen.getByText('Show Loading').click();
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');

    // Then hide loading
    act(() => {
      screen.getByText('Hide Loading').click();
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLoading must be used within a LoadingProvider');
    
    consoleSpy.mockRestore();
  });
});