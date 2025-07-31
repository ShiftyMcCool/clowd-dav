import React from 'react';
import { ErrorMessage } from './common';
import { ErrorMessage as ErrorMessageType } from '../services/ErrorHandlingService';

interface ErrorContainerProps {
  errors: ErrorMessageType[];
  onDismissError: (id: string) => void;
  onRetryError: (id: string) => Promise<void>;
}

export const ErrorContainer: React.FC<ErrorContainerProps> = ({
  errors,
  onDismissError,
  onRetryError,
}) => {
  return (
    <div className="error-container">
      {errors.map((error) => (
        <ErrorMessage
          key={error.id}
          error={error}
          onDismiss={onDismissError}
          onRetry={onRetryError}
        />
      ))}
    </div>
  );
};