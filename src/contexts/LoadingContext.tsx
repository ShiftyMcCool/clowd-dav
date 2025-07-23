import React, { createContext, useContext, useState } from 'react';

interface LoadingState {
  isLoading: boolean;
  text: string;
  size: 'small' | 'medium' | 'large';
}

interface LoadingContextType {
  loadingState: LoadingState;
  showLoading: (text?: string, size?: 'small' | 'medium' | 'large') => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Create a global loading manager to avoid re-render issues
class LoadingManager {
  private listeners: Set<(state: LoadingState) => void> = new Set();
  private currentState: LoadingState = {
    isLoading: false,
    text: 'Loading...',
    size: 'medium'
  };

  subscribe(listener: (state: LoadingState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  showLoading(text = 'Loading...', size: 'small' | 'medium' | 'large' = 'medium') {
    this.currentState = {
      isLoading: true,
      text,
      size
    };
    this.notifyListeners();
  }

  hideLoading() {
    this.currentState = {
      ...this.currentState,
      isLoading: false
    };
    this.notifyListeners();
  }

  getCurrentState() {
    return this.currentState;
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }
}

const loadingManager = new LoadingManager();

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>(loadingManager.getCurrentState());

  React.useEffect(() => {
    return loadingManager.subscribe(setLoadingState);
  }, []);

  const contextValue: LoadingContextType = {
    loadingState,
    showLoading: loadingManager.showLoading.bind(loadingManager),
    hideLoading: loadingManager.hideLoading.bind(loadingManager)
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};