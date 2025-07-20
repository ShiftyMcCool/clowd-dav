export interface AuthConfig {
  caldavUrl: string;
  carddavUrl: string;
  username: string;
  password: string;
}

export interface EncryptedCredentials {
  data: string; // Encrypted JSON of AuthConfig
  iv: string;   // Initialization vector
}

export interface AuthManager {
  authenticate(config: AuthConfig): Promise<boolean>;
  getStoredCredentials(): AuthConfig | null;
  clearCredentials(): void;
}