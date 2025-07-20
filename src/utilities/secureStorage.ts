import { EncryptionService } from './encryption';
import { AuthConfig, EncryptedCredentials } from '../types/auth';

/**
 * Secure storage wrapper for browser local storage operations
 */
export class SecureStorage {
  private static readonly CREDENTIALS_KEY = 'caldav_credentials';
  private static readonly STORAGE_VERSION_KEY = 'caldav_storage_version';
  private static readonly CURRENT_VERSION = '1.0';

  /**
   * Stores encrypted credentials in local storage
   */
  static async storeCredentials(
    credentials: AuthConfig,
    masterPassword: string
  ): Promise<void> {
    if (!this.isLocalStorageAvailable()) {
      throw new Error('Local storage is not available');
    }

    if (!EncryptionService.isSupported()) {
      throw new Error('Web Crypto API is not supported in this browser');
    }

    try {
      const encryptedCredentials = await EncryptionService.encryptCredentials(
        credentials,
        masterPassword
      );

      localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(encryptedCredentials));
      localStorage.setItem(this.STORAGE_VERSION_KEY, this.CURRENT_VERSION);
    } catch (error) {
      throw new Error(`Failed to store credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves and decrypts credentials from local storage
   */
  static async retrieveCredentials(masterPassword: string): Promise<AuthConfig | null> {
    if (!this.isLocalStorageAvailable()) {
      throw new Error('Local storage is not available');
    }

    if (!EncryptionService.isSupported()) {
      throw new Error('Web Crypto API is not supported in this browser');
    }

    try {
      const storedData = localStorage.getItem(this.CREDENTIALS_KEY);
      if (!storedData) {
        return null;
      }

      const encryptedCredentials: EncryptedCredentials = JSON.parse(storedData);
      return await EncryptionService.decryptCredentials(encryptedCredentials, masterPassword);
    } catch (error) {
      // If decryption fails, it might be due to wrong password or corrupted data
      throw new Error(`Failed to retrieve credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if credentials exist in storage
   */
  static hasStoredCredentials(): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    return localStorage.getItem(this.CREDENTIALS_KEY) !== null;
  }

  /**
   * Clears stored credentials from local storage
   */
  static clearCredentials(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    localStorage.removeItem(this.CREDENTIALS_KEY);
    localStorage.removeItem(this.STORAGE_VERSION_KEY);
  }

  /**
   * Gets the storage version for migration purposes
   */
  static getStorageVersion(): string | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    return localStorage.getItem(this.STORAGE_VERSION_KEY);
  }

  /**
   * Checks if local storage is available and functional
   */
  static isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets available storage space (approximate)
   */
  static getStorageInfo(): { used: number; available: boolean } {
    if (!this.isLocalStorageAvailable()) {
      return { used: 0, available: false };
    }

    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    return {
      used,
      available: true
    };
  }

  /**
   * Validates that the stored data structure is correct
   */
  static validateStoredData(): boolean {
    if (!this.hasStoredCredentials()) {
      return false;
    }

    try {
      const storedData = localStorage.getItem(this.CREDENTIALS_KEY);
      if (!storedData) return false;

      const parsed: EncryptedCredentials = JSON.parse(storedData);
      return typeof parsed.data === 'string' && typeof parsed.iv === 'string';
    } catch {
      return false;
    }
  }
}