import React from 'react';
import { ErrorMessage as ErrorMessageType } from '../../services/ErrorHandlingService';
import './ErrorMessage.css';

interface ErrorMessageProps {
  error: ErrorMessageType;
  onDismiss: (id: string) => void;
  onRetry?: (id: string) => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  error, 
  onDismiss, 
  onRetry 
}) => {
  const handleDismiss = () => {
    onDismiss(error.id);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry(error.id);
    }
  };

  const getIconClass = () => {
    switch (error.type) {
      case 'error':
        return 'error-icon';
      case 'warning':
        return 'warning-icon';
      case 'info':
        return 'info-icon';
      default:
        return 'error-icon';
    }
  };

  return (
    <div className={`error-message ${error.type}`}>
      <div className="error-content">
        <div className={getIconClass()}></div>
        <div className="error-text">{error.message}</div>
      </div>
      <div className="error-actions">
        {error.retryAction && onRetry && (
          <button className="retry-button" onClick={handleRetry}>
            Retry
          </button>
        )}
        <button className="dismiss-button" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};