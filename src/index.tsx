import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { swUpdateManager } from './serviceWorkerRegistration';
import { envConfig, Logger } from './config/environment';
import { BundleAnalyzer } from './utils/bundleAnalyzer';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize application
Logger.info(`Starting ${envConfig.get('name')} v${envConfig.get('version')} in ${envConfig.get('environment')} mode`);

// Initialize bundle analyzer for performance monitoring
BundleAnalyzer.initialize();

// Register service worker for offline functionality (only if enabled)
if (envConfig.isServiceWorkerEnabled()) {
  Logger.info('Service Worker enabled, initializing...');
  swUpdateManager.initialize();
} else {
  Logger.info('Service Worker disabled');
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if (envConfig.isDebugEnabled()) {
  reportWebVitals(Logger.debug);
} else {
  reportWebVitals();
}
