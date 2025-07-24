import React from 'react';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = 'Loading...',
  size = 'medium'
}) => {
  if (!isVisible) return null;

  // Inline styles to prevent CSS conflicts
  const spinnerSize = size === 'small' ? 24 : size === 'large' ? 48 : 32;
  
  const spinnerStyle: React.CSSProperties = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    border: '3px solid rgba(66, 133, 244, 0.2)',
    borderTop: '3px solid #4285f4',
    borderRadius: '50%',
    animation: 'loading-spin 1s linear infinite',
    marginBottom: '1rem',
    boxSizing: 'border-box',
    flexShrink: 0,
    display: 'block'
  };

  return (
    <div className="loading-overlay-backdrop">
      <div className="loading-overlay-content">
        <div style={spinnerStyle}></div>
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
};