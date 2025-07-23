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

  return (
    <div className="loading-overlay-backdrop">
      <div className="loading-overlay-content">
        <div className={`loading-spinner ${size}`}></div>
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
};