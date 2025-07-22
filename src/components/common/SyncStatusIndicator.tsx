import React, { useState, useEffect } from 'react';
import { SyncService, SyncStatus } from '../../services/SyncService';
import './SyncStatusIndicator.css';

interface SyncStatusIndicatorProps {
  syncService: SyncService;
  onManualSync?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  syncService,
  onManualSync
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleSyncStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    syncService.addSyncListener(handleSyncStatusChange);

    // Update status periodically
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 30000); // Update every 30 seconds

    return () => {
      syncService.removeSyncListener(handleSyncStatusChange);
      clearInterval(interval);
    };
  }, [syncService]);

  const handleManualSync = async () => {
    if (onManualSync) {
      onManualSync();
    } else {
      try {
        await syncService.fullSync({ forceRefresh: true });
      } catch (error) {
        console.error('Manual sync failed:', error);
      }
    }
  };

  const formatLastSync = (lastSync: Date | null): string => {
    if (!lastSync) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusIcon = (): string => {
    if (syncStatus.syncInProgress) return '🔄';
    if (!syncStatus.isOnline) return '📴';
    if (syncStatus.pendingOperations.length > 0) return '⏳';
    return '✅';
  };

  const getStatusText = (): string => {
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.pendingOperations.length > 0) {
      return `${syncStatus.pendingOperations.length} pending`;
    }
    return 'Synced';
  };

  const getStatusClass = (): string => {
    if (syncStatus.syncInProgress) return 'sync-status-syncing';
    if (!syncStatus.isOnline) return 'sync-status-offline';
    if (syncStatus.pendingOperations.length > 0) return 'sync-status-pending';
    return 'sync-status-synced';
  };

  return (
    <div className="sync-status-indicator">
      <div 
        className={`sync-status-main ${getStatusClass()}`}
        onClick={() => setShowDetails(!showDetails)}
        title="Click for sync details"
      >
        <span className="sync-status-icon">{getStatusIcon()}</span>
        <span className="sync-status-text">{getStatusText()}</span>
      </div>

      {showDetails && (
        <div className="sync-status-details">
          <div className="sync-status-info">
            <div className="sync-info-row">
              <span className="sync-info-label">Status:</span>
              <span className={`sync-info-value ${getStatusClass()}`}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="sync-info-row">
              <span className="sync-info-label">Last sync:</span>
              <span className="sync-info-value">
                {formatLastSync(syncStatus.lastSync)}
              </span>
            </div>
            
            {syncStatus.pendingOperations.length > 0 && (
              <div className="sync-info-row">
                <span className="sync-info-label">Pending:</span>
                <span className="sync-info-value sync-pending">
                  {syncStatus.pendingOperations.length} operations
                </span>
              </div>
            )}
          </div>

          <div className="sync-status-actions">
            <button
              className="sync-action-button"
              onClick={handleManualSync}
              disabled={syncStatus.syncInProgress || !syncStatus.isOnline}
            >
              {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {syncStatus.pendingOperations.length > 0 && (
            <div className="sync-pending-operations">
              <h4>Pending Operations:</h4>
              <ul className="pending-operations-list">
                {syncStatus.pendingOperations.slice(0, 5).map(operation => (
                  <li key={operation.id} className="pending-operation-item">
                    <span className="operation-type">{operation.type}</span>
                    <span className="operation-resource">{operation.resourceType}</span>
                    <span className="operation-time">
                      {formatLastSync(operation.timestamp)}
                    </span>
                  </li>
                ))}
                {syncStatus.pendingOperations.length > 5 && (
                  <li className="pending-operation-item">
                    <span className="operation-more">
                      +{syncStatus.pendingOperations.length - 5} more...
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};