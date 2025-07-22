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
  async authenticate(config: AuthConfig): Promise<boolean> {
    try {
      // Detect provider for the server
      const provider = await ProviderFactory.createProviderForServer(config.caldavUrl);
      if (!provider) {
        throw new Error('Unable to detect server type. Please check the server URL.');
      }

      // Test CalDAV connection
      const caldavClient = new DAVClient();
      caldavClient.setAuthConfig(config);
      caldavClient.setProvider(provider);

      // Try to discover calendars to test connection
      await caldavClient.discoverCalendars();

      // Test CardDAV connection
      const carddavClient = new DAVClient();
      carddavClient.setAuthConfig(config);
      carddavClient.setProvider(provider);

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
  async storeCredentials(config: AuthConfig, masterPassword: string): Promise<void> {
    await SecureStorage.storeCredentials(config, masterPassword);
    this.currentCredentials = config;
    this.masterPassword = masterPassword;
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
   * Clear stored credentials
   */
  clearCredentials(): void {
    SecureStorage.clearCredentials();
    this.currentCredentials = null;
    this.masterPassword = null;
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

      // Test authentication
      const authSuccess = await this.authenticate(config);
      
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