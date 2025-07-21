import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingIndicator } from '../LoadingIndicator';

describe('LoadingIndicator Component', () => {
  it('renders with default props', () => {
    render(<LoadingIndicator />);
    
    const spinner = document.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('medium');
  });
  
  it('renders with custom size', () => {
    render(<LoadingIndicator size="large" />);
    
    const spinner = document.querySelector('.loading-spinner');
    expect(spinner).toHaveClass('large');
  });
  
  it('renders with text', () => {
    const loadingText = 'Loading data...';
    render(<LoadingIndicator text={loadingText} />);
    
    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });
  
  it('renders as overlay when specified', () => {
    render(<LoadingIndicator overlay />);
    
    expect(document.querySelector('.loading-overlay')).toBeInTheDocument();
  });
});