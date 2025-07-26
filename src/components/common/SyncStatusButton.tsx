import React, { useState, useEffect } from 'react';
import { SyncService, SyncStatus } from '../../services/SyncService';
import { Modal } from './Modal';
import './SyncStatusButton.css';

interface SyncStatusButtonProps {
  syncService: SyncService;
  onManualSync?: () => void;
}

export const SyncStatusButton: React.FC<SyncStatusButtonProps> = ({
  syncService,
  onManualSync
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [showModal, setShowModal] = useState(false);

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

  // Debug function to clear corrupted cache data
  const handleClearCache = () => {
    if (window.confirm('Clear all cached data? This will remove pending operations and force a fresh sync.')) {
      // Import CacheService dynamically to clear cache
      import('../../services/CacheService').then(({ CacheService }) => {
        CacheService.clearCache();
        // Force a refresh of the sync status
        setSyncStatus(syncService.getSyncStatus());
      });
    }
  };

  const formatLastSync = (lastSync: Date | null | string): string => {
    if (!lastSync) return 'Never';
    
    // Ensure we have a proper Date object
    const date = lastSync instanceof Date ? lastSync : new Date(lastSync);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
    <>
      <button 
        className={`sync-status-button ${getStatusClass()}`}
        onClick={() => setShowModal(true)}
        title="Click for sync details"
      >
        <span className="sync-status-icon">{getStatusIcon()}</span>
        <span className="sync-status-text">{getStatusText()}</span>
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Sync Status"
        size="small"
      >
        <div className="sync-modal-content">
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
            {syncStatus.pendingOperations.length > 0 && (
              <button
                className="sync-action-button sync-clear-button"
                onClick={handleClearCache}
              >
                Clear Cache
              </button>
            )}
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
      </Modal>
    </>
  );
};