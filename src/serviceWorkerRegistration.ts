// Simple service worker registration for production

export const swUpdateManager = {
  initialize() {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service worker registered');
          })
          .catch((error) => {
            console.log('Service worker registration failed:', error);
          });
      });
    }
  }
};