import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { LoadingProvider } from "./contexts/LoadingContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppContent } from "./AppContent";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import "./styles/themes.css";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <Router>
          <AppContent />
          <PWAInstallPrompt />
        </Router>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
