import { AuthManager } from '../AuthManager';
import { SecureStorage } from '../../utilities/secureStorage';
import { ProviderFactory } from '../../providers/ProviderFactory';
import { AuthConfig } from '../../types/auth';

// Mock dependencies
jest.mock('../../utilities/secureStorage');
jest.mock('../../providers/ProviderFactory');
jest.mock('../DAVClient');

const mockSecureStorage = SecureStorage as jest.Mocked<typeof SecureStorage>;
const mockProviderFactory = ProviderFactory as jest.Mocked<typeof ProviderFactory>;

describe('AuthManager', () => {
  let authManager: AuthManager;
  const mockConfig: AuthConfig = {
    caldavUrl: 'https://example.com/caldav/',
    carddavUrl: 'https://example.com/carddav/',
    username: 'testuser',
    password: 'testpass'
  };

  beforeEach(() => {
    // Reset the singleton instance
    (AuthManager as any).instance = undefined;
    authManager = AuthManager.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = AuthManager.getInstance();
      const instance2 = AuthManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateCredentials', () => {
    it('should return no errors for valid credentials', () => {
      const errors = authManager.validateCredentials(mockConfig);
      expect(errors).toEqual([]);
    });

    it('should return errors for missing required fields', () => {
      const invalidConfig = {
        caldavUrl: '',
        carddavUrl: '',
        username: '',
        password: ''
      };

      const errors = authManager.validateCredentials(invalidConfig);
      expect(errors).toContain('CalDAV URL is required');
      expect(errors).toContain('CardDAV URL is required');
      expect(errors).toContain('Username is required');
      expect(errors).toContain('Password is required');
    });

    it('should return errors for invalid URLs', () => {
      const invalidConfig = {
        caldavUrl: 'not-a-url',
        carddavUrl: 'also-not-a-url',
        username: 'user',
        password: 'pass'
      };

      const errors = authManager.validateCredentials(invalidConfig);
      expect(errors).toContain('CalDAV URL is not valid');
      expect(errors).toContain('CardDAV URL is not valid');
    });
  });

  describe('storeCredentials', () => {
    it('should store credentials using SecureStorage', async () => {
      const masterPassword = 'master123';
      mockSecureStorage.storeCredentials.mockResolvedValue();

      await authManager.storeCredentials(mockConfig, masterPassword);

      expect(mockSecureStorage.storeCredentials).toHaveBeenCalledWith(
        mockConfig,
        masterPassword
      );
    });

    it('should handle storage errors', async () => {
      const masterPassword = 'master123';
      const error = new Error('Storage failed');
      mockSecureStorage.storeCredentials.mockRejectedValue(error);

      await expect(authManager.storeCredentials(mockConfig, masterPassword))
        .rejects.toThrow('Storage failed');
    });
  });

  describe('getStoredCredentials', () => {
    it('should retrieve credentials using SecureStorage', async () => {
      const masterPassword = 'master123';
      mockSecureStorage.retrieveCredentials.mockResolvedValue(mockConfig);

      const result = await authManager.getStoredCredentials(masterPassword);

      expect(result).toEqual(mockConfig);
      expect(mockSecureStorage.retrieveCredentials).toHaveBeenCalledWith(masterPassword);
    });

    it('should return null when no master password provided', async () => {
      const result = await authManager.getStoredCredentials();
      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      const masterPassword = 'master123';
      const error = new Error('Decryption failed');
      mockSecureStorage.retrieveCredentials.mockRejectedValue(error);

      const result = await authManager.getStoredCredentials(masterPassword);
      expect(result).toBeNull();
    });
  });

  describe('hasStoredCredentials', () => {
    it('should check if credentials exist using SecureStorage', () => {
      mockSecureStorage.hasStoredCredentials.mockReturnValue(true);

      const result = authManager.hasStoredCredentials();

      expect(result).toBe(true);
      expect(mockSecureStorage.hasStoredCredentials).toHaveBeenCalled();
    });
  });

  describe('clearCredentials', () => {
    it('should clear credentials using SecureStorage', () => {
      authManager.clearCredentials();

      expect(mockSecureStorage.clearCredentials).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should return success when provider is detected and authentication succeeds', async () => {
      const mockProvider = { name: 'baikal' };
      mockProviderFactory.createProviderForServer.mockResolvedValue(mockProvider as any);
      
      // Mock the authenticate method to return true
      jest.spyOn(authManager, 'authenticate').mockResolvedValue(true);

      const result = await authManager.testConnection(mockConfig);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('baikal');
      expect(result.error).toBeUndefined();
    });

    it('should return error when provider cannot be detected', async () => {
      mockProviderFactory.createProviderForServer.mockResolvedValue(null);

      const result = await authManager.testConnection(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unable to detect server type. Please check the server URL.');
    });

    it('should handle authentication errors', async () => {
      const mockProvider = { name: 'baikal' };
      mockProviderFactory.createProviderForServer.mockResolvedValue(mockProvider as any);
      
      // Mock the authenticate method to return false
      jest.spyOn(authManager, 'authenticate').mockResolvedValue(false);

      const result = await authManager.testConnection(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed. Please check your credentials.');
    });
  });
});