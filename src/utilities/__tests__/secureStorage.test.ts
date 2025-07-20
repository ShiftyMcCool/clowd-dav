import { SecureStorage } from '../secureStorage';
import { EncryptionService } from '../encryption';
import { AuthConfig } from '../../types/auth';

// Mock the EncryptionService
jest.mock('../encryption');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  hasOwnProperty: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const MockedEncryptionService = EncryptionService as jest.Mocked<typeof EncryptionService>;

describe('SecureStorage', () => {
  const testCredentials: AuthConfig = {
    caldavUrl: 'https://example.com/caldav',
    carddavUrl: 'https://example.com/carddav',
    username: 'testuser',
    password: 'testpassword',
  };

  const testMasterPassword = 'masterpassword123';
  const mockEncryptedCredentials = {
    data: 'encrypted_data_string',
    iv: 'initialization_vector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    MockedEncryptionService.isSupported.mockReturnValue(true);
    MockedEncryptionService.encryptCredentials.mockResolvedValue(mockEncryptedCredentials);
    MockedEncryptionService.decryptCredentials.mockResolvedValue(testCredentials);
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(SecureStorage.isLocalStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws an error', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });

      expect(SecureStorage.isLocalStorageAvailable()).toBe(false);
    });
  });

  describe('storeCredentials', () => {
    it('should store encrypted credentials successfully', async () => {
      await SecureStorage.storeCredentials(testCredentials, testMasterPassword);

      expect(MockedEncryptionService.encryptCredentials).toHaveBeenCalledWith(
        testCredentials,
        testMasterPassword
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'caldav_credentials',
        JSON.stringify(mockEncryptedCredentials)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'caldav_storage_version',
        '1.0'
      );
    });

    it('should throw error when localStorage is not available', async () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });

      await expect(
        SecureStorage.storeCredentials(testCredentials, testMasterPassword)
      ).rejects.toThrow('Local storage is not available');
    });

    it('should throw error when Web Crypto API is not supported', async () => {
      MockedEncryptionService.isSupported.mockReturnValue(false);

      await expect(
        SecureStorage.storeCredentials(testCredentials, testMasterPassword)
      ).rejects.toThrow('Web Crypto API is not supported in this browser');
    });

    it('should throw error when encryption fails', async () => {
      MockedEncryptionService.encryptCredentials.mockRejectedValue(
        new Error('Encryption failed')
      );

      await expect(
        SecureStorage.storeCredentials(testCredentials, testMasterPassword)
      ).rejects.toThrow('Failed to store credentials: Encryption failed');
    });
  });

  describe('retrieveCredentials', () => {
    it('should retrieve and decrypt credentials successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockEncryptedCredentials));

      const result = await SecureStorage.retrieveCredentials(testMasterPassword);

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('caldav_credentials');
      expect(MockedEncryptionService.decryptCredentials).toHaveBeenCalledWith(
        mockEncryptedCredentials,
        testMasterPassword
      );
      expect(result).toEqual(testCredentials);
    });

    it('should return null when no credentials are stored', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await SecureStorage.retrieveCredentials(testMasterPassword);

      expect(result).toBeNull();
      expect(MockedEncryptionService.decryptCredentials).not.toHaveBeenCalled();
    });

    it('should throw error when localStorage is not available', async () => {
      // Mock isLocalStorageAvailable to return false
      jest.spyOn(SecureStorage, 'isLocalStorageAvailable').mockReturnValue(false);

      await expect(
        SecureStorage.retrieveCredentials(testMasterPassword)
      ).rejects.toThrow('Local storage is not available');
      
      // Restore the original implementation
      jest.restoreAllMocks();
    });

    it('should throw error when Web Crypto API is not supported', async () => {
      MockedEncryptionService.isSupported.mockReturnValue(false);

      await expect(
        SecureStorage.retrieveCredentials(testMasterPassword)
      ).rejects.toThrow('Web Crypto API is not supported in this browser');
    });

    it('should throw error when decryption fails', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockEncryptedCredentials));
      MockedEncryptionService.decryptCredentials.mockRejectedValue(
        new Error('Decryption failed')
      );

      await expect(
        SecureStorage.retrieveCredentials(testMasterPassword)
      ).rejects.toThrow('Failed to retrieve credentials: Decryption failed');
    });

    it('should throw error when stored data is invalid JSON', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      await expect(
        SecureStorage.retrieveCredentials(testMasterPassword)
      ).rejects.toThrow('Failed to retrieve credentials:');
    });
  });

  describe('hasStoredCredentials', () => {
    it('should return true when credentials exist', () => {
      mockLocalStorage.getItem.mockReturnValue('some_data');

      expect(SecureStorage.hasStoredCredentials()).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('caldav_credentials');
    });

    it('should return false when no credentials exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(SecureStorage.hasStoredCredentials()).toBe(false);
    });

    it('should return false when localStorage is not available', () => {
      // Mock isLocalStorageAvailable to return false
      jest.spyOn(SecureStorage, 'isLocalStorageAvailable').mockReturnValue(false);

      expect(SecureStorage.hasStoredCredentials()).toBe(false);
      
      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  describe('clearCredentials', () => {
    it('should remove credentials and version from localStorage', () => {
      SecureStorage.clearCredentials();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('caldav_credentials');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('caldav_storage_version');
    });

    it('should handle localStorage not being available gracefully', () => {
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });

      expect(() => SecureStorage.clearCredentials()).not.toThrow();
    });
  });

  describe('getStorageVersion', () => {
    it('should return storage version when available', () => {
      mockLocalStorage.getItem.mockReturnValue('1.0');

      const version = SecureStorage.getStorageVersion();

      expect(version).toBe('1.0');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('caldav_storage_version');
    });

    it('should return null when no version is stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const version = SecureStorage.getStorageVersion();

      expect(version).toBeNull();
    });

    it('should return null when localStorage is not available', () => {
      // Mock isLocalStorageAvailable to return false
      jest.spyOn(SecureStorage, 'isLocalStorageAvailable').mockReturnValue(false);

      const version = SecureStorage.getStorageVersion();

      expect(version).toBeNull();
      
      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage usage information', () => {
      // Mock localStorage with some data
      const mockStorage = {
        'key1': 'value1',
        'key2': 'value2',
      };
      
      mockLocalStorage.hasOwnProperty.mockImplementation((key) => key in mockStorage);
      
      // Mock the for...in loop behavior
      Object.defineProperty(mockLocalStorage, Symbol.iterator, {
        value: function* () {
          for (const key in mockStorage) {
            yield key;
          }
        }
      });

      // Mock accessing localStorage properties
      Object.keys(mockStorage).forEach(key => {
        Object.defineProperty(mockLocalStorage, key, {
          value: mockStorage[key],
          configurable: true
        });
      });

      const info = SecureStorage.getStorageInfo();

      expect(info.available).toBe(true);
      expect(typeof info.used).toBe('number');
    });

    it('should return unavailable when localStorage is not accessible', () => {
      // Mock isLocalStorageAvailable to return false
      jest.spyOn(SecureStorage, 'isLocalStorageAvailable').mockReturnValue(false);

      const info = SecureStorage.getStorageInfo();

      expect(info.available).toBe(false);
      expect(info.used).toBe(0);
      
      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });

  describe('validateStoredData', () => {
    it('should return true for valid stored data', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockEncryptedCredentials));

      expect(SecureStorage.validateStoredData()).toBe(true);
    });

    it('should return false when no credentials are stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(SecureStorage.validateStoredData()).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      expect(SecureStorage.validateStoredData()).toBe(false);
    });

    it('should return false for invalid data structure', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ invalid: 'structure' }));

      expect(SecureStorage.validateStoredData()).toBe(false);
    });
  });
});