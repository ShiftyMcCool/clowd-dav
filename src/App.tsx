import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { LoadingProvider } from "./contexts/LoadingContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppContent } from "./AppContent";
import "./styles/themes.css";
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <Router>
          <AppContent />
        </Router>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
