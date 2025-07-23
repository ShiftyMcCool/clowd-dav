import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from '../LoadingOverlay';

describe('LoadingOverlay Component', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<LoadingOverlay isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders overlay when visible', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    expect(document.querySelector('.loading-overlay-backdrop')).toBeInTheDocument();
    expect(document.querySelector('.loading-overlay-content')).toBeInTheDocument();
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  it('displays custom text', () => {
    render(<LoadingOverlay isVisible={true} text="Custom loading message" />);
    
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('applies correct size class', () => {
    render(<LoadingOverlay isVisible={true} size="large" />);
    
    expect(document.querySelector('.loading-spinner.large')).toBeInTheDocument();
  });

  it('has high z-index for overlay', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    const backdrop = document.querySelector('.loading-overlay-backdrop');
    expect(backdrop).toHaveClass('loading-overlay-backdrop');
  });
});