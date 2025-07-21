import { Subject } from 'rxjs';

export interface ErrorMessage {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
  retryAction?: () => Promise<void>;
  dismissed?: boolean;
}

/**
 * Service for centralized error handling and management
 * Provides methods to report errors, display user-friendly messages,
 * and handle retry operations
 */
export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errors: ErrorMessage[] = [];
  private errorSubject = new Subject<ErrorMessage[]>();

  private constructor() {}

  /**
   * Get the singleton instance of ErrorHandlingService
   */
  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Report a new error
   * @param message User-friendly error message
   * @param type Error type (error, warning, info)
   * @param retryAction Optional function to retry the failed operation
   * @returns The created error message object
   */
  public reportError(
    message: string, 
    type: 'error' | 'warning' | 'info' = 'error',
    retryAction?: () => Promise<void>
  ): ErrorMessage {
    const errorMessage: ErrorMessage = {
      id: this.generateId(),
      message,
      type,
      timestamp: new Date(),
      retryAction,
      dismissed: false
    };

    this.errors.push(errorMessage);
    this.notifySubscribers();
    
    return errorMessage;
  }

  /**
   * Dismiss an error by ID
   * @param id Error ID to dismiss
   */
  public dismissError(id: string): void {
    const errorIndex = this.errors.findIndex(error => error.id === id);
    if (errorIndex !== -1) {
      this.errors[errorIndex].dismissed = true;
      this.notifySubscribers();
    }
  }

  /**
   * Clear all dismissed errors
   */
  public clearDismissedErrors(): void {
    this.errors = this.errors.filter(error => !error.dismissed);
    this.notifySubscribers();
  }

  /**
   * Get all active (non-dismissed) errors
   */
  public getActiveErrors(): ErrorMessage[] {
    return this.errors.filter(error => !error.dismissed);
  }

  /**
   * Subscribe to error updates
   * @param callback Function to call when errors change
   * @returns Unsubscribe function
   */
  public subscribe(callback: (errors: ErrorMessage[]) => void): () => void {
    const subscription = this.errorSubject.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  /**
   * Retry a failed operation
   * @param id Error ID associated with the retry action
   * @returns Promise that resolves when retry completes
   */
  public async retryOperation(id: string): Promise<void> {
    const error = this.errors.find(error => error.id === id);
    if (error && error.retryAction) {
      try {
        await error.retryAction();
        this.dismissError(id);
      } catch (retryError) {
        // If retry fails, keep the error active
        console.error('Retry failed:', retryError);
      }
    }
  }

  /**
   * Format error message from various error types
   * @param error Error object or string
   * @returns User-friendly error message
   */
  public formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else {
      return 'An unknown error occurred';
    }
  }

  /**
   * Notify all subscribers of error changes
   */
  private notifySubscribers(): void {
    this.errorSubject.next([...this.errors]);
  }

  /**
   * Generate a unique ID for an error
   */
  private generateId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}