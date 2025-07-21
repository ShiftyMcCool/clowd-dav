import React, { useState, useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { AuthConfig } from './types/auth';
import { AuthManager } from './services/AuthManager';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const authManager = AuthManager.getInstance();

  useEffect(() => {
    // Check if user has stored credentials and try to load them
    const checkStoredCredentials = async () => {
      try {
        if (authManager.hasStoredCredentials()) {
          // We have stored credentials, but we need the master password
          // For now, just show the setup form
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking stored credentials:', error);
        setLoading(false);
      }
    };

    checkStoredCredentials();
  }, []);

  const handleSetupComplete = (config: AuthConfig) => {
    setCurrentConfig(config);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentConfig(null);
    // Optionally clear stored credentials
    // authManager.clearCredentials();
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="App">
        <SetupForm onSetupComplete={handleSetupComplete} />
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>CalDAV/CardDAV Client</h1>
        <div className="user-info">
          Connected as: {currentConfig?.username}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      <main className="App-main">
        <div className="placeholder-content">
          <h2>Welcome to your CalDAV/CardDAV Client!</h2>
          <p>You are successfully connected to:</p>
          <ul>
            <li>CalDAV: {currentConfig?.caldavUrl}</li>
            <li>CardDAV: {currentConfig?.carddavUrl}</li>
          </ul>
          <p>Calendar and contact management features will be implemented in the next tasks.</p>
        </div>
      </main>
    </div>
  );
}

export default App;
