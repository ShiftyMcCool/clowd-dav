import React, { useState, useEffect } from "react";
import { AuthConfig } from "../types/auth";
import { AuthManager } from "../services/AuthManager";
import "./SetupForm.css";

interface SetupFormProps {
  onSetupComplete: (config: AuthConfig, masterPassword?: string) => void;
  onCancel?: () => void;
}

interface FormData {
  caldavUrl: string;
  carddavUrl: string;
  username: string;
  password: string;
  masterPassword: string;
  rememberCredentials: boolean;
  persistSession: boolean;
}

interface ConnectionStatus {
  testing: boolean;
  success: boolean | null;
  provider?: string;
  error?: string;
}

type SetupStep = "login" | "server" | "credentials" | "options";

export const SetupForm: React.FC<SetupFormProps> = ({
  onSetupComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>("login");
  const [formData, setFormData] = useState<FormData>({
    caldavUrl: "",
    carddavUrl: "",
    username: "",
    password: "",
    masterPassword: "",
    rememberCredentials: true,
    persistSession: false,
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    testing: false,
    success: null,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  const authManager = AuthManager.getInstance();

  useEffect(() => {
    // Check if there are stored credentials
    const hasStored = authManager.hasStoredCredentials();
    setHasStoredCredentials(hasStored);
    // If no stored credentials, skip to server setup
    if (!hasStored) {
      setCurrentStep("server");
    }
  }, [authManager]);

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-fill CardDAV URL if CalDAV URL is provided and CardDAV is empty
    if (
      field === "caldavUrl" &&
      typeof value === "string" &&
      !formData.carddavUrl
    ) {
      const caldavUrl = value;
      if (caldavUrl.includes("/caldav/")) {
        const carddavUrl = caldavUrl.replace("/caldav/", "/carddav/");
        setFormData((prev) => ({
          ...prev,
          carddavUrl,
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
      password: formData.password,
    };

    const errors = authManager.validateCredentials(config);

    if (formData.rememberCredentials && !formData.masterPassword) {
      errors.push("Master password is required to save credentials");
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
      password: formData.password,
    };

    try {
      const result = await authManager.testConnection(config);

      setConnectionStatus({
        testing: false,
        success: result.success,
        provider: result.provider,
        error: result.error,
      });
    } catch (error) {
      setConnectionStatus({
        testing: false,
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
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
      password: formData.password,
    };

    try {
      console.log(
        "Form submission - rememberCredentials:",
        formData.rememberCredentials,
        "persistSession:",
        formData.persistSession
      );

      // Store credentials if requested
      if (formData.rememberCredentials) {
        console.log(
          "Storing credentials with persistence:",
          formData.persistSession
        );
        await authManager.storeCredentials(
          config,
          formData.masterPassword,
          formData.persistSession
        );
        onSetupComplete(config, formData.masterPassword);
      } else {
        console.log(
          "Creating temporary session with persistence:",
          formData.persistSession
        );
        // Create a session without storing credentials permanently
        authManager.createSession(config, formData.persistSession);
        const sessionToken = authManager.getStoredSessionToken();
        onSetupComplete(config, sessionToken || undefined);
      }
    } catch (error) {
      setValidationErrors([
        error instanceof Error ? error.message : "Failed to save credentials",
      ]);
    }
  };

  const loadStoredCredentials = async () => {
    if (!formData.masterPassword) {
      setValidationErrors([
        "Master password is required to load stored credentials",
      ]);
      return;
    }

    try {
      const credentials = await authManager.getStoredCredentials(
        formData.masterPassword
      );
      if (credentials) {
        setFormData((prev) => ({
          ...prev,
          caldavUrl: credentials.caldavUrl,
          carddavUrl: credentials.carddavUrl,
          username: credentials.username,
          password: credentials.password,
        }));
        setValidationErrors([]);
      } else {
        setValidationErrors([
          "Invalid master password or no stored credentials found",
        ]);
      }
    } catch (error) {
      setValidationErrors([
        error instanceof Error
          ? error.message
          : "Failed to load stored credentials",
      ]);
    }
  };

  const loginWithStoredCredentials = async () => {
    if (!formData.masterPassword) {
      setValidationErrors([
        "Master password is required to login with stored credentials",
      ]);
      return;
    }

    try {
      const credentials = await authManager.getStoredCredentials(
        formData.masterPassword
      );
      if (credentials) {
        console.log(
          "Login with stored credentials - persistSession:",
          formData.persistSession
        );

        // Clear both storage locations first
        localStorage.removeItem("caldav_persistent_session");
        sessionStorage.removeItem("caldav_session_token");

        // Create session based on user's current persistence preference
        if (formData.persistSession) {
          console.log("Storing session token in localStorage (persistent)");
          localStorage.setItem(
            "caldav_persistent_session",
            formData.masterPassword
          );
        } else {
          console.log(
            "Storing session token in sessionStorage (page reload only)"
          );
          sessionStorage.setItem(
            "caldav_session_token",
            formData.masterPassword
          );
        }

        onSetupComplete(credentials, formData.masterPassword);
      } else {
        setValidationErrors([
          "Invalid master password or no stored credentials found",
        ]);
      }
    } catch (error) {
      setValidationErrors([
        error instanceof Error
          ? error.message
          : "Failed to login with stored credentials",
      ]);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div
        className={`step ${
          currentStep === "login"
            ? "active"
            : hasStoredCredentials
            ? "completed"
            : "disabled"
        }`}
      >
        {hasStoredCredentials ? "1" : ""}
      </div>
      <div className={`step ${currentStep === "server" ? "active" : ""}`}>
        {hasStoredCredentials ? "2" : "1"}
      </div>
      <div className={`step ${currentStep === "credentials" ? "active" : ""}`}>
        {hasStoredCredentials ? "3" : "2"}
      </div>
    </div>
  );

  const renderLoginStep = () => (
    <div className="setup-step">
      <h2>Welcome Back</h2>
      <p>Enter your master password to access stored credentials</p>

      <div className="form-group">
        <input
          type="password"
          value={formData.masterPassword}
          onChange={(e) => handleInputChange("masterPassword", e.target.value)}
          placeholder="Master password"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              loginWithStoredCredentials();
            }
          }}
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={formData.persistSession}
            onChange={(e) =>
              handleInputChange("persistSession", e.target.checked)
            }
          />
          Keep me logged in
        </label>
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={loginWithStoredCredentials}
          className="btn-primary"
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep("server")}
          className="btn-link"
        >
          Use different server
        </button>
      </div>
    </div>
  );

  const renderServerStep = () => (
    <div className="setup-step">
      <h2>Server Configuration</h2>
      <p>Enter your CalDAV/CardDAV server details</p>

      <div className="form-group">
        <label>CalDAV Server URL</label>
        <input
          type="url"
          value={formData.caldavUrl}
          onChange={(e) => handleInputChange("caldavUrl", e.target.value)}
          placeholder="https://your-server.com/caldav/"
        />
      </div>

      <div className="form-group">
        <label>CardDAV Server URL</label>
        <input
          type="url"
          value={formData.carddavUrl}
          onChange={(e) => handleInputChange("carddavUrl", e.target.value)}
          placeholder="https://your-server.com/carddav/"
        />
      </div>

      <details className="server-examples">
        <summary>Common server examples</summary>
        <div className="examples-list">
          <div>
            <strong>Baikal:</strong> https://your-server.com/dav.php/calendars/username/
          </div>
          <div>
            <strong>Radicale:</strong> https://your-server.com/radicale/
          </div>
          <div>
            <strong>Nextcloud:</strong> https://your-server.com/remote.php/dav/principals/users/username/
          </div>
        </div>
      </details>

      <div className="form-actions">
        <button
          type="button"
          onClick={() => setCurrentStep("credentials")}
          className="btn-primary"
          disabled={!formData.caldavUrl || !formData.carddavUrl}
        >
          Next
        </button>
        {hasStoredCredentials && (
          <button
            type="button"
            onClick={() => setCurrentStep("login")}
            className="btn-secondary"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );

  const renderCredentialsStep = () => (
    <div className="setup-step">
      <h2>Account Credentials</h2>
      <p>Enter your username and password</p>

      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => handleInputChange("username", e.target.value)}
          placeholder="Your username"
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => handleInputChange("password", e.target.value)}
          placeholder="Your password"
        />
      </div>

      {connectionStatus.testing && (
        <div className="connection-status testing">Testing connection...</div>
      )}

      {connectionStatus.success === true && (
        <div className="connection-status success">
          ✓ Connection successful!
          {connectionStatus.provider && (
            <span> ({connectionStatus.provider})</span>
          )}
        </div>
      )}

      {connectionStatus.success === false && (
        <div className="connection-status error">
          ✗ {connectionStatus.error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={testConnection}
          className="btn-secondary"
          disabled={
            !formData.username || !formData.password || connectionStatus.testing
          }
        >
          Test Connection
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep("options")}
          className="btn-primary"
          disabled={!formData.username || !formData.password}
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep("server")}
          className="btn-secondary"
        >
          Back
        </button>
      </div>
    </div>
  );

  const renderOptionsStep = () => (
    <div className="setup-step">
      <h2>Security Options</h2>
      <p>Choose how to handle your credentials</p>

      <div className="options-grid">
        <div className="option-card">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.rememberCredentials}
                onChange={(e) =>
                  handleInputChange("rememberCredentials", e.target.checked)
                }
              />
              <strong>Remember credentials</strong>
            </label>
            <small>Securely store credentials in browser</small>
          </div>
        </div>

        <div className="option-card">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.persistSession}
                onChange={(e) =>
                  handleInputChange("persistSession", e.target.checked)
                }
              />
              <strong>Stay logged in</strong>
            </label>
            <small>Survive browser restarts</small>
          </div>
        </div>
      </div>

      {formData.rememberCredentials && (
        <div className="form-group">
          <label>Master Password</label>
          <input
            type="password"
            value={formData.masterPassword}
            onChange={(e) =>
              handleInputChange("masterPassword", e.target.value)
            }
            placeholder="Create a master password"
          />
          <small>Used to encrypt your stored credentials</small>
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-primary"
          disabled={formData.rememberCredentials && !formData.masterPassword}
        >
          Connect
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep("credentials")}
          className="btn-secondary"
        >
          Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="setup-form-container">
      <div className="setup-form">
        {hasStoredCredentials && renderStepIndicator()}

        {validationErrors.length > 0 && (
          <div className="error-messages">
            {validationErrors.map((error, index) => (
              <div key={index} className="error-message">
                {error}
              </div>
            ))}
          </div>
        )}

        {currentStep === "login" && hasStoredCredentials && renderLoginStep()}
        {currentStep === "server" && renderServerStep()}
        {currentStep === "credentials" && renderCredentialsStep()}
        {currentStep === "options" && renderOptionsStep()}

        {onCancel && (
          <div className="cancel-action">
            <button onClick={onCancel} className="btn-link">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
