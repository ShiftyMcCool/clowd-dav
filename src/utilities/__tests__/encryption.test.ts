import { EncryptionService } from '../encryption';
import { AuthConfig } from '../../types/auth';

// Mock TextEncoder/TextDecoder for Node.js test environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Web Crypto API for testing environment
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    deriveKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

// Setup crypto mock
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe('EncryptionService', () => {
  const testCredentials: AuthConfig = {
    caldavUrl: 'https://example.com/caldav',
    carddavUrl: 'https://example.com/carddav',
    username: 'testuser',
    password: 'testpassword',
  };

  const testMasterPassword = 'masterpassword123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
      // Fill with predictable values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    });

    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.deriveKey.mockResolvedValue({} as CryptoKey);
  });

  describe('isSupported', () => {
    it('should return true when Web Crypto API is available', () => {
      expect(EncryptionService.isSupported()).toBe(true);
    });

    it('should return false when crypto is undefined', () => {
      const originalCrypto = global.crypto;
      // @ts-ignore
      global.crypto = undefined;
      
      expect(EncryptionService.isSupported()).toBe(false);
      
      global.crypto = originalCrypto;
    });

    it('should return false when crypto.subtle is undefined', () => {
      const originalSubtle = global.crypto.subtle;
      // @ts-ignore
      global.crypto.subtle = undefined;
      
      expect(EncryptionService.isSupported()).toBe(false);
      
      global.crypto.subtle = originalSubtle;
    });
  });

  describe('encryptCredentials', () => {
    it('should encrypt credentials successfully', async () => {
      const mockEncryptedData = new ArrayBuffer(32);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData);

      const result = await EncryptionService.encryptCredentials(
        testCredentials,
        testMasterPassword
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('iv');
      expect(typeof result.data).toBe('string');
      expect(typeof result.iv).toBe('string');
      
      // Verify that the encryption process was called
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should use PBKDF2 for key derivation', async () => {
      const mockEncryptedData = new ArrayBuffer(32);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData);

      await EncryptionService.encryptCredentials(testCredentials, testMasterPassword);

      // Verify PBKDF2 is used for key import
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.anything(),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      // Verify key derivation parameters
      const deriveKeyCall = mockCrypto.subtle.deriveKey.mock.calls[0];
      expect(deriveKeyCall[0]).toMatchObject({
        name: 'PBKDF2',
        iterations: 100000,
        hash: 'SHA-256'
      });
      expect(deriveKeyCall[2]).toMatchObject({
        name: 'AES-GCM',
        length: 256
      });
      expect(deriveKeyCall[4]).toEqual(['encrypt', 'decrypt']);
    });

    it('should use AES-GCM for encryption', async () => {
      const mockEncryptedData = new ArrayBuffer(32);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData);

      await EncryptionService.encryptCredentials(testCredentials, testMasterPassword);

      // Verify AES-GCM encryption is used
      const encryptCall = mockCrypto.subtle.encrypt.mock.calls[0];
      expect(encryptCall[0]).toMatchObject({
        name: 'AES-GCM'
      });
      expect(encryptCall[0].iv).toBeDefined();
      expect(encryptCall[1]).toBeDefined(); // key
      expect(encryptCall[2]).toBeDefined(); // data
    });

    it('should throw error when encryption fails', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      await expect(
        EncryptionService.encryptCredentials(testCredentials, testMasterPassword)
      ).rejects.toThrow('Encryption failed: Encryption failed');
    });
  });

  describe('decryptCredentials', () => {
    it('should decrypt credentials successfully', async () => {
      const mockDecryptedData = new TextEncoder().encode(JSON.stringify(testCredentials));
      mockCrypto.subtle.decrypt.mockResolvedValue(mockDecryptedData.buffer);

      // Create a mock encrypted credentials object
      const mockEncrypted = {
        data: 'bW9ja2VkZGF0YQ==', // base64 encoded mock data
        iv: 'bW9ja2VkaXY='
      };

      const result = await EncryptionService.decryptCredentials(
        mockEncrypted,
        testMasterPassword
      );

      expect(result).toEqual(testCredentials);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should throw error when decryption fails', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const mockEncrypted = {
        data: 'bW9ja2VkZGF0YQ==',
        iv: 'bW9ja2VkaXY='
      };

      await expect(
        EncryptionService.decryptCredentials(mockEncrypted, testMasterPassword)
      ).rejects.toThrow('Decryption failed: Decryption failed');
    });

    it('should throw error when JSON parsing fails', async () => {
      const invalidJsonData = new TextEncoder().encode('invalid json');
      mockCrypto.subtle.decrypt.mockResolvedValue(invalidJsonData.buffer);

      const mockEncrypted = {
        data: 'bW9ja2VkZGF0YQ==',
        iv: 'bW9ja2VkaXY='
      };

      await expect(
        EncryptionService.decryptCredentials(mockEncrypted, testMasterPassword)
      ).rejects.toThrow('Decryption failed:');
    });
  });

  describe('round-trip encryption/decryption', () => {
    it('should successfully encrypt and decrypt credentials', async () => {
      // Mock the actual crypto operations for a full round-trip test
      const mockSalt = new Uint8Array(16).fill(1);
      const mockIv = new Uint8Array(12).fill(2);
      const mockKey = {} as CryptoKey;
      const mockEncryptedData = new Uint8Array([1, 2, 3, 4]).buffer;
      
      let encryptCallCount = 0;
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        if (array.length === 16) return mockSalt; // salt
        if (array.length === 12) return mockIv;   // iv
        return array;
      });

      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      
      mockCrypto.subtle.encrypt.mockImplementation(() => {
        encryptCallCount++;
        return Promise.resolve(mockEncryptedData);
      });

      mockCrypto.subtle.decrypt.mockImplementation(() => {
        const jsonString = JSON.stringify(testCredentials);
        return Promise.resolve(new TextEncoder().encode(jsonString).buffer);
      });

      // Encrypt
      const encrypted = await EncryptionService.encryptCredentials(
        testCredentials,
        testMasterPassword
      );

      // Decrypt
      const decrypted = await EncryptionService.decryptCredentials(
        encrypted,
        testMasterPassword
      );

      expect(decrypted).toEqual(testCredentials);
      expect(encryptCallCount).toBe(1);
    });
  });
});