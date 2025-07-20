import { EncryptedCredentials, AuthConfig } from '../types/auth';

/**
 * Encryption service for secure credential storage using Web Crypto API
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for AES-GCM

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import the password as a key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // OWASP recommended minimum
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates a random salt for key derivation
   */
  private static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Generates a random initialization vector
   */
  private static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
  }

  /**
   * Encrypts credential data using AES-GCM
   */
  static async encryptCredentials(
    credentials: AuthConfig,
    masterPassword: string
  ): Promise<EncryptedCredentials> {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const key = await this.deriveKey(masterPassword, salt);

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(credentials));

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      );

      // Combine salt + iv + encrypted data for storage
      const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

      return {
        data: this.arrayBufferToBase64(combined),
        iv: this.arrayBufferToBase64(iv)
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypts credential data using AES-GCM
   */
  static async decryptCredentials(
    encryptedCredentials: EncryptedCredentials,
    masterPassword: string
  ): Promise<AuthConfig> {
    try {
      const combined = this.base64ToArrayBuffer(encryptedCredentials.data);
      
      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 16 + this.IV_LENGTH);
      const encryptedData = combined.slice(16 + this.IV_LENGTH);

      const key = await this.deriveKey(masterPassword, salt);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);
      
      return JSON.parse(jsonString) as AuthConfig;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Converts ArrayBuffer to Base64 string for storage
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts Base64 string back to Uint8Array
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Checks if Web Crypto API is available
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined';
  }
}