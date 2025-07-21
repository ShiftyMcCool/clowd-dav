import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  overlay = false,
  text
}) => {
  if (overlay) {
    return (
      <div className="loading-overlay">
        <div className="loading-container">
          <div className={`loading-spinner ${size}`}></div>
          {text && <div className="loading-text">{text}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      <div className={`loading-spinner ${size}`}></div>
      {text && <div className="loading-text">{text}</div>}
    </div>
  );
};