import React, { useState, useEffect } from 'react';
import { AuthConfig } from '../types/auth';
import { AuthManager } from '../services/AuthManager';
import './SetupForm.css';

interface SetupFormProps {
  onSetupComplete: (config: AuthConfig) => void;
  onCancel?: () => void;
}

interface FormData {
  caldavUrl: string;
  carddavUrl: string;
  username: string;
  password: string;
  masterPassword: string;
  rememberCredentials: boolean;
}

interface ConnectionStatus {
  testing: boolean;
  success: boolean | null;
  provider?: string;
  error?: string;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onSetupComplete, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    caldavUrl: '',
    carddavUrl: '',
    username: '',
    password: '',
    masterPassword: '',
    rememberCredentials: true
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    testing: false,
    success: null
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  const authManager = AuthManager.getInstance();

  useEffect(() => {
    // Check if there are stored credentials
    setHasStoredCredentials(authManager.hasStoredCredentials());
  }, []);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-fill CardDAV URL if CalDAV URL is provided and CardDAV is empty
    if (field === 'caldavUrl' && typeof value === 'string' && !formData.carddavUrl) {
      const caldavUrl = value;
      if (caldavUrl.includes('/caldav/')) {
        const carddavUrl = caldavUrl.replace('/caldav/', '/carddav/');
        setFormData(prev => ({
          ...prev,
          carddavUrl
        }));
      }
    }

    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const validateForm = (): boolean => {
    const config: Partial<AuthConfig> = {
      caldavUrl: formData.caldavUrl,
      carddavUrl: formData.carddavUrl,
      username: formData.username,
      password: formData.password
    };

    const errors = authManager.validateCredentials(config);
    
    if (formData.rememberCredentials && !formData.masterPassword) {
      errors.push('Master password is required to save credentials');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const testConnection = async () => {
    if (!validateForm()) {
      return;
    }

    setConnectionStatus({ testing: true, success: null });

    const config: AuthConfig = {
      caldavUrl: formData.caldavUrl,
      carddavUrl: formData.carddavUrl,
      username: formData.username,
      password: formData.password
    };

    try {
      const result = await authManager.testConnection(config);
      
      setConnectionStatus({
        testing: false,
        success: result.success,
        provider: result.provider,
        error: result.error
      });
    } catch (error) {
      setConnectionStatus({
        testing: false,
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const config: AuthConfig = {
      caldavUrl: formData.caldavUrl,
      carddavUrl: formData.carddavUrl,
      username: formData.username,
      password: formData.password
    };

    try {
      // Store credentials if requested
      if (formData.rememberCredentials) {
        await authManager.storeCredentials(config, formData.masterPassword);
      }

      onSetupComplete(config);
    } catch (error) {
      setValidationErrors([
        error instanceof Error ? error.message : 'Failed to save credentials'
      ]);
    }
  };

  const loadStoredCredentials = async () => {
    if (!formData.masterPassword) {
      setValidationErrors(['Master password is required to load stored credentials']);
      return;
    }

    try {
      const credentials = await authManager.getStoredCredentials(formData.masterPassword);
      if (credentials) {
        setFormData(prev => ({
          ...prev,
          caldavUrl: credentials.caldavUrl,
          carddavUrl: credentials.carddavUrl,
          username: credentials.username,
          password: credentials.password
        }));
        setValidationErrors([]);
      } else {
        setValidationErrors(['Invalid master password or no stored credentials found']);
      }
    } catch (error) {
      setValidationErrors([
        error instanceof Error ? error.message : 'Failed to load stored credentials'
      ]);
    }
  };

  return (
    <div className="setup-form-container">
      <div className="setup-form">
        <h2>CalDAV/CardDAV Server Setup</h2>
        
        {hasStoredCredentials && (
          <div className="stored-credentials-section">
            <h3>Load Stored Credentials</h3>
            <div className="form-group">
              <label htmlFor="masterPassword">Master Password:</label>
              <input
                type="password"
                id="masterPassword"
                value={formData.masterPassword}
                onChange={(e) => handleInputChange('masterPassword', e.target.value)}
                placeholder="Enter master password"
              />
              <button 
                type="button" 
                onClick={loadStoredCredentials}
                className="btn-secondary"
              >
                Load Credentials
              </button>
            </div>
            <div className="divider">OR</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="caldavUrl">CalDAV Server URL:</label>
            <input
              type="url"
              id="caldavUrl"
              value={formData.caldavUrl}
              onChange={(e) => handleInputChange('caldavUrl', e.target.value)}
              placeholder="https://your-server.com/caldav/"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="carddavUrl">CardDAV Server URL:</label>
            <input
              type="url"
              id="carddavUrl"
              value={formData.carddavUrl}
              onChange={(e) => handleInputChange('carddavUrl', e.target.value)}
              placeholder="https://your-server.com/carddav/"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Your password"
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.rememberCredentials}
                onChange={(e) => handleInputChange('rememberCredentials', e.target.checked)}
              />
              Remember credentials securely in browser
            </label>
          </div>

          {formData.rememberCredentials && (
            <div className="form-group">
              <label htmlFor="newMasterPassword">Master Password:</label>
              <input
                type="password"
                id="newMasterPassword"
                value={formData.masterPassword}
                onChange={(e) => handleInputChange('masterPassword', e.target.value)}
                placeholder="Create a master password"
                required={formData.rememberCredentials}
              />
              <small className="help-text">
                This password will be used to encrypt your credentials locally
              </small>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="error-messages">
              {validationErrors.map((error, index) => (
                <div key={index} className="error-message">{error}</div>
              ))}
            </div>
          )}

          <div className="connection-test-section">
            <button 
              type="button" 
              onClick={testConnection}
              disabled={connectionStatus.testing}
              className="btn-secondary"
            >
              {connectionStatus.testing ? 'Testing Connection...' : 'Test Connection'}
            </button>

            {connectionStatus.success === true && (
              <div className="success-message">
                ✓ Connection successful! 
                {connectionStatus.provider && (
                  <span> Detected server: {connectionStatus.provider}</span>
                )}
              </div>
            )}

            {connectionStatus.success === false && (
              <div className="error-message">
                ✗ Connection failed: {connectionStatus.error}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={connectionStatus.testing}
            >
              Connect
            </button>
            {onCancel && (
              <button 
                type="button" 
                onClick={onCancel}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="advanced-section">
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn-link"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {showAdvanced && (
            <div className="advanced-options">
              <h3>Server Examples</h3>
              <div className="server-examples">
                <div className="example">
                  <strong>Baikal:</strong>
                  <div>CalDAV: https://your-server.com/baikal/cal.php/calendars/username/</div>
                  <div>CardDAV: https://your-server.com/baikal/card.php/addressbooks/username/</div>
                </div>
                <div className="example">
                  <strong>Radicale:</strong>
                  <div>CalDAV: https://your-server.com/username/</div>
                  <div>CardDAV: https://your-server.com/username/</div>
                </div>
              </div>
              
              <div className="help-text">
                <p>
                  <strong>Note:</strong> This application connects directly to your DAV server.
                  Make sure your server supports CORS or use a proxy if needed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};