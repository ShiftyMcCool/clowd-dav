import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { SyncService } from '../../../services/SyncService';
import { DAVClient } from '../../../services/DAVClient';

// Mock the SyncService
jest.mock('../../../services/SyncService');
jest.mock('../../../services/DAVClient');

const MockedSyncService = SyncService as jest.MockedClass<typeof SyncService>;

describe('SyncStatusIndicator', () => {
  let mockSyncService: jest.Mocked<SyncService>;
  let mockOnManualSync: jest.Mock;

  beforeEach(() => {
    mockSyncService = {
      getSyncStatus: jest.fn(),
      addSyncListener: jest.fn(),
      removeSyncListener: jest.fn(),
      fullSync: jest.fn()
    } as any;

    mockOnManualSync = jest.fn();

    // Default sync status
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      lastSync: new Date('2025-07-21T10:00:00Z'),
      pendingOperations: [],
      syncInProgress: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render sync status when synced', () => {
    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('should render offline status when offline', () => {
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: false,
      lastSync: new Date('2025-07-21T10:00:00Z'),
      pendingOperations: [],
      syncInProgress: false
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('📴')).toBeInTheDocument();
  });

  it('should render syncing status when sync in progress', () => {
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      lastSync: new Date('2025-07-21T10:00:00Z'),
      pendingOperations: [],
      syncInProgress: true
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('should render pending operations count', () => {
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      lastSync: new Date('2025-07-21T10:00:00Z'),
      pendingOperations: [
        {
          id: '1',
          type: 'create',
          resourceType: 'event',
          resourceUrl: 'http://example.com/cal1',
          data: {} as any,
          timestamp: new Date()
        },
        {
          id: '2',
          type: 'update',
          resourceType: 'contact',
          resourceUrl: 'http://example.com/ab1',
          data: {} as any,
          timestamp: new Date()
        }
      ],
      syncInProgress: false
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    expect(screen.getByText('2 pending')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('should show details when clicked', async () => {
    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    const statusIndicator = screen.getByText('Synced').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('Last sync:')).toBeInTheDocument();
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });
  });

  it('should call onManualSync when sync button is clicked', async () => {
    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    // Open details
    const statusIndicator = screen.getByText('Synced').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      const syncButton = screen.getByText('Sync Now');
      fireEvent.click(syncButton);
    });

    expect(mockOnManualSync).toHaveBeenCalledTimes(1);
  });

  it('should use default sync when no onManualSync provided', async () => {
    mockSyncService.fullSync.mockResolvedValue({
      success: true,
      eventsUpdated: 0,
      contactsUpdated: 0,
      errors: []
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService}
      />
    );

    // Open details
    const statusIndicator = screen.getByText('Synced').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      const syncButton = screen.getByText('Sync Now');
      fireEvent.click(syncButton);
    });

    expect(mockSyncService.fullSync).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('should disable sync button when offline', async () => {
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: false,
      lastSync: new Date('2025-07-21T10:00:00Z'),
      pendingOperations: [],
      syncInProgress: false
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    // Open details
    const statusIndicator = screen.getByText('Offline').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      const syncButton = screen.getByText('Sync Now');
      expect(syncButton).toBeDisabled();
    });
  });

  it('should disable sync button when syncing', async () => {
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      lastSync: new Date('2025-07-21T10:00:00Z'),
      pendingOperations: [],
      syncInProgress: true
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    // Open details
    const statusIndicator = screen.getByText('Syncing...').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      const syncButton = screen.getByRole('button', { name: /syncing/i });
      expect(syncButton).toBeDisabled();
    });
  });

  it('should show pending operations list', async () => {
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      lastSync: new Date('2025-07-21T10:00:00Z'),
      pendingOperations: [
        {
          id: '1',
          type: 'create',
          resourceType: 'event',
          resourceUrl: 'http://example.com/cal1',
          data: {} as any,
          timestamp: new Date('2025-07-21T09:00:00Z')
        },
        {
          id: '2',
          type: 'update',
          resourceType: 'contact',
          resourceUrl: 'http://example.com/ab1',
          data: {} as any,
          timestamp: new Date('2025-07-21T09:30:00Z')
        }
      ],
      syncInProgress: false
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    // Open details
    const statusIndicator = screen.getByText('2 pending').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      expect(screen.getByText('Pending Operations:')).toBeInTheDocument();
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('update')).toBeInTheDocument();
      expect(screen.getByText('event')).toBeInTheDocument();
      expect(screen.getByText('contact')).toBeInTheDocument();
    });
  });

  it('should format last sync time correctly', async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      lastSync: fiveMinutesAgo,
      pendingOperations: [],
      syncInProgress: false
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    // Open details
    const statusIndicator = screen.getByText('Synced').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });
  });

  it('should show "Never" when no last sync', async () => {
    mockSyncService.getSyncStatus.mockReturnValue({
      isOnline: true,
      lastSync: null,
      pendingOperations: [],
      syncInProgress: false
    });

    render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    // Open details
    const statusIndicator = screen.getByText('Synced').closest('.sync-status-main');
    fireEvent.click(statusIndicator!);

    await waitFor(() => {
      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  it('should register and unregister sync listeners', () => {
    const { unmount } = render(
      <SyncStatusIndicator 
        syncService={mockSyncService} 
        onManualSync={mockOnManualSync}
      />
    );

    expect(mockSyncService.addSyncListener).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockSyncService.removeSyncListener).toHaveBeenCalledTimes(1);
  });
});