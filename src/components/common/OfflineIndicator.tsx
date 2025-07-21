import React, { useEffect, useState } from 'react';
import { NetworkService } from '../../services/NetworkService';
import './ErrorMessage.css'; // Reusing styles from ErrorMessage.css

interface OfflineIndicatorProps {
  showWhenOffline?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  showWhenOffline = true 
}) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const networkService = NetworkService.getInstance();

  useEffect(() => {
    // Initial check
    setIsOffline(!networkService.isOnline());

    // Subscribe to network status changes
    const unsubscribe = networkService.subscribe((status) => {
      setIsOffline(!status.online);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isOffline && showWhenOffline) {
    return null;
  }

  return (
    <div className="offline-indicator">
      <div className="offline-icon"></div>
      <span>You are currently offline. Some features may be limited.</span>
    </div>
  );
};