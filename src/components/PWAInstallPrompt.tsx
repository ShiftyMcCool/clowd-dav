import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      console.log('PWA installed successfully');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#007bff',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px',
      maxWidth: '90vw'
    }}>
      <span>Install Clowd-DAV for quick access</span>
      <button
        onClick={handleInstall}
        style={{
          backgroundColor: 'white',
          color: '#007bff',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Install
      </button>
      <button
        onClick={() => window.dispatchEvent(new Event('dismissInstallPrompt'))}
        style={{
          backgroundColor: 'transparent',
          color: 'white',
          border: '1px solid white',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        Later
      </button>
    </div>
  );
};

export default PWAInstallPrompt;