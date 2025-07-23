import { AuthConfig, AuthManager as IAuthManager } from '../types/auth';
import { SecureStorage } from '../utilities/secureStorage';
import { DAVClient } from './DAVClient';
import { ProviderFactory } from '../providers/ProviderFactory';

/**
 * Authentication manager for handling credential storage and server authentication
 */
export class AuthManager implements IAuthManager {
  private static instance: AuthManager;
  private currentCredentials: AuthConfig | null = null;
  private masterPassword: string | null = null;
  private static readonly SESSION_TOKEN_KEY = 'caldav_session_token';
  private static readonly PERSISTENT_SESSION_KEY = 'caldav_persistent_session';

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Authenticate with DAV servers using provided credentials
   */
  async authenticate(config: AuthConfig, provider?: any): Promise<boolean> {
    try {
      // Use provided provider or detect one
      let detectedProvider = provider;
      if (!detectedProvider) {
        console.log('AuthManager: Detecting provider for:', config.caldavUrl);
        detectedProvider = await ProviderFactory.createProviderForServer(config.caldavUrl);
        if (!detectedProvider) {
          console.error('AuthManager: No provider found');
          throw new Error('Unable to detect server type. Please check the server URL.');
        }
        console.log('AuthManager: Provider detected:', detectedProvider.name);
      } else {
        console.log('AuthManager: Using provided provider:', detectedProvider.name);
      }

      // Test CalDAV connection
      const caldavClient = new DAVClient();
      caldavClient.setAuthConfig(config);
      caldavClient.setProvider(detectedProvider);
      console.log('AuthManager: CalDAV client provider set:', caldavClient.getProvider() !== null);

      // Try to discover calendars to test connection
      await caldavClient.discoverCalendars();

      // Test CardDAV connection
      const carddavClient = new DAVClient();
      carddavClient.setAuthConfig(config);
      carddavClient.setProvider(detectedProvider);
      console.log('AuthManager: CardDAV client provider set:', carddavClient.getProvider() !== null);

      // Try to discover address books to test connection
      await carddavClient.discoverAddressBooks();

      // If we get here, authentication was successful
      this.currentCredentials = config;
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  /**
   * Store credentials securely in local storage
   */
  async storeCredentials(config: AuthConfig, masterPassword: string, persistSession: boolean = false): Promise<void> {
    await SecureStorage.storeCredentials(config, masterPassword);
    this.currentCredentials = config;
    this.masterPassword = masterPassword;
    
    // Store session token for persistence
    this.setSessionToken(masterPassword, persistSession);
  }

  /**
   * Set session token with appropriate storage method
   */
  private setSessionToken(masterPassword: string, persistSession: boolean): void {
    console.log('AuthManager.setSessionToken - persistSession:', persistSession);
    if (persistSession) {
      console.log('Storing session token in localStorage');
      localStorage.setItem(AuthManager.PERSISTENT_SESSION_KEY, masterPassword);
      // Remove from session storage if it exists
      sessionStorage.removeItem(AuthManager.SESSION_TOKEN_KEY);
    } else {
      console.log('Storing session token in sessionStorage');
      sessionStorage.setItem(AuthManager.SESSION_TOKEN_KEY, masterPassword);
      // Remove from persistent storage if it exists
      localStorage.removeItem(AuthManager.PERSISTENT_SESSION_KEY);
    }
  }



  /**
   * Retrieve stored credentials from local storage
   */
  async getStoredCredentials(masterPassword?: string): Promise<AuthConfig | null> {
    if (this.currentCredentials && this.masterPassword === masterPassword) {
      return this.currentCredentials;
    }

    if (!masterPassword) {
      return null;
    }

    // Check if this is a temporary session token
    if (masterPassword.startsWith('session_')) {
      return this.currentCredentials;
    }

    try {
      const credentials = await SecureStorage.retrieveCredentials(masterPassword);
      if (credentials) {
        this.currentCredentials = credentials;
        this.masterPassword = masterPassword;
      }
      return credentials;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  /**
   * Get current credentials without decryption (if already loaded)
   */
  getCurrentCredentials(): AuthConfig | null {
    return this.currentCredentials;
  }

  /**
   * Check if credentials are stored
   */
  hasStoredCredentials(): boolean {
    return SecureStorage.hasStoredCredentials();
  }

  /**
   * Clear stored credentials and session tokens
   */
  clearCredentials(): void {
    SecureStorage.clearCredentials();
    this.currentCredentials = null;
    this.masterPassword = null;
    sessionStorage.removeItem(AuthManager.SESSION_TOKEN_KEY);
    localStorage.removeItem(AuthManager.PERSISTENT_SESSION_KEY);
  }

  /**
   * Clear only session tokens (for logout without removing stored credentials)
   */
  clearSession(): void {
    this.currentCredentials = null;
    this.masterPassword = null;
    sessionStorage.removeItem(AuthManager.SESSION_TOKEN_KEY);
    localStorage.removeItem(AuthManager.PERSISTENT_SESSION_KEY);
  }

  /**
   * Get stored session token (checks both persistent and session storage)
   */
  getStoredSessionToken(): string | null {
    // First check persistent storage (survives browser restart)
    const persistentToken = localStorage.getItem(AuthManager.PERSISTENT_SESSION_KEY);
    if (persistentToken) {
      console.log('Found persistent session token');
      return persistentToken;
    }
    
    // Then check session storage (survives page reload only)
    const sessionToken = sessionStorage.getItem(AuthManager.SESSION_TOKEN_KEY);
    if (sessionToken) {
      console.log('Found session storage token');
      return sessionToken;
    }
    
    console.log('No session token found');
    return null;
  }

  /**
   * Check if the session token is a temporary session (not tied to stored credentials)
   */
  isTemporarySession(sessionToken: string): boolean {
    return sessionToken.startsWith('temp_session_');
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.getStoredSessionToken() !== null;
  }

  /**
   * Create a session without storing credentials permanently
   */
  createSession(config: AuthConfig, persistSession: boolean = false): void {
    this.currentCredentials = config;
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.masterPassword = sessionToken;
    
    if (persistSession) {
      localStorage.setItem(AuthManager.PERSISTENT_SESSION_KEY, sessionToken);
    } else {
      sessionStorage.setItem(AuthManager.SESSION_TOKEN_KEY, sessionToken);
    }
  }

  /**
   * Test server connection and auto-detect provider
   */
  async testConnection(config: AuthConfig): Promise<{
    success: boolean;
    provider?: string;
    error?: string;
  }> {
    try {
      // First try to detect provider for CalDAV URL
      const provider = await ProviderFactory.createProviderForServer(config.caldavUrl);
      
      if (!provider) {
        return {
          success: false,
          error: 'Unable to detect server type. Please check the server URL.'
        };
      }

      // Test authentication using the detected provider
      const authSuccess = await this.authenticate(config, provider);
      
      if (!authSuccess) {
        return {
          success: false,
          error: 'Authentication failed. Please check your credentials.'
        };
      }

      return {
        success: true,
        provider: provider.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate credential format
   */
  validateCredentials(config: Partial<AuthConfig>): string[] {
    const errors: string[] = [];

    if (!config.caldavUrl) {
      errors.push('CalDAV URL is required');
    } else if (!this.isValidUrl(config.caldavUrl)) {
      errors.push('CalDAV URL is not valid');
    }

    if (!config.carddavUrl) {
      errors.push('CardDAV URL is required');
    } else if (!this.isValidUrl(config.carddavUrl)) {
      errors.push('CardDAV URL is not valid');
    }

    if (!config.username) {
      errors.push('Username is required');
    }

    if (!config.password) {
      errors.push('Password is required');
    }

    return errors;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}