// Simple service worker registration for production

export const swUpdateManager = {
  initialize() {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service worker registered successfully');
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New content is available, prompt user to refresh
                    if (window.confirm('New version available! Refresh to update?')) {
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.log('Service worker registration failed:', error);
          });
      });
    }
  }
};