import { Subject } from "rxjs";

export interface NetworkStatus {
  online: boolean;
  lastChecked: Date;
}

/**
 * Service for network status detection and management
 * Provides methods to check online status and subscribe to network changes
 */
export class NetworkService {
  private static instance: NetworkService;
  private status: NetworkStatus = {
    online: navigator.onLine,
    lastChecked: new Date(),
  };
  private statusSubject = new Subject<NetworkStatus>();
  private checkInterval: number | null = null;
  private pendingOperations: Map<string, () => Promise<void>> = new Map();

  private constructor() {
    // Initialize network event listeners
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // Start periodic checking
    this.startPeriodicChecking();
  }

  /**
   * Get the singleton instance of NetworkService
   */
  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  /**
   * Check if the device is currently online
   */
  public isOnline(): boolean {
    return this.status.online;
  }

  /**
   * Get the current network status
   */
  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to network status changes
   * @param callback Function to call when network status changes
   * @returns Unsubscribe function
   */
  public subscribe(callback: (status: NetworkStatus) => void): () => void {
    const subscription = this.statusSubject.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  /**
   * Add a pending operation to be executed when online
   * @param id Unique identifier for the operation
   * @param operation Function to execute when online
   */
  public addPendingOperation(id: string, operation: () => Promise<void>): void {
    this.pendingOperations.set(id, operation);
  }

  /**
   * Remove a pending operation
   * @param id Operation ID to remove
   */
  public removePendingOperation(id: string): void {
    this.pendingOperations.delete(id);
  }

  /**
   * Get all pending operations
   */
  public getPendingOperations(): Map<string, () => Promise<void>> {
    return new Map(this.pendingOperations);
  }

  /**
   * Get the count of pending operations
   */
  public getPendingOperationCount(): number {
    return this.pendingOperations.size;
  }

  /**
   * Execute all pending operations
   * @returns Promise that resolves when all operations complete
   */
  public async executePendingOperations(): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    const operations = Array.from(this.pendingOperations.entries());
    const completedIds: string[] = [];

    for (const [id, operation] of operations) {
      try {
        await operation();
        completedIds.push(id);
      } catch (error) {
        console.error(`Failed to execute pending operation ${id}:`, error);
      }
    }

    // Remove completed operations
    completedIds.forEach((id) => this.pendingOperations.delete(id));
  }

  /**
   * Check network connectivity
   * Uses navigator.onLine as the primary indicator since it's reliable for most use cases
   */
  public async checkConnectivity(): Promise<boolean> {
    try {
      // Use navigator.onLine as the primary connectivity indicator
      // This is reliable and doesn't make unnecessary network requests
      const online = navigator.onLine;
      this.updateStatus(online);
      return online;
    } catch (error) {
      // If anything fails, assume offline
      this.updateStatus(false);
      return false;
    }
  }

  /**
   * Start periodic network checking
   * @param intervalMs Check interval in milliseconds (default: 120000 - 2 minutes)
   */
  public startPeriodicChecking(intervalMs: number = 120000): void {
    if (this.checkInterval !== null) {
      this.stopPeriodicChecking();
    }

    this.checkInterval = window.setInterval(() => {
      this.checkConnectivity();
    }, intervalMs);
  }

  /**
   * Stop periodic network checking
   */
  public stopPeriodicChecking(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.stopPeriodicChecking();
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.updateStatus(true);
    // Try to execute pending operations when we come back online
    this.executePendingOperations();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.updateStatus(false);
  };

  /**
   * Update network status and notify subscribers
   */
  private updateStatus(online: boolean): void {
    if (this.status.online !== online) {
      this.status = {
        online,
        lastChecked: new Date(),
      };
      this.statusSubject.next({ ...this.status });
    }
  }
}
