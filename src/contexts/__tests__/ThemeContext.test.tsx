import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Test component that uses the theme context
const TestComponent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="toggle-button" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
  });

  it('provides default light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  it('toggles between light and dark themes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const themeDisplay = screen.getByTestId('current-theme');
    const toggleButton = screen.getByTestId('toggle-button');

    // Should start with light theme
    expect(themeDisplay).toHaveTextContent('light');

    // Toggle to dark
    fireEvent.click(toggleButton);
    expect(themeDisplay).toHaveTextContent('dark');

    // Toggle back to light
    fireEvent.click(toggleButton);
    expect(themeDisplay).toHaveTextContent('light');
  });

  it('persists theme to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId('toggle-button');

    // Toggle to dark theme
    fireEvent.click(toggleButton);

    // Check that theme is saved to localStorage
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('loads theme from localStorage', () => {
    // Set dark theme in localStorage
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Should load dark theme from localStorage
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  it('sets data-theme attribute on document element', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId('toggle-button');

    // Should start with light theme
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Toggle to dark
    fireEvent.click(toggleButton);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });
});