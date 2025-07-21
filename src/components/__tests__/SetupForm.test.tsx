import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetupForm } from '../SetupForm';

// Mock AuthManager
const mockAuthManager = {
  hasStoredCredentials: jest.fn(),
  validateCredentials: jest.fn(),
  testConnection: jest.fn(),
  storeCredentials: jest.fn(),
  getStoredCredentials: jest.fn()
};

jest.mock('../../services/AuthManager', () => ({
  AuthManager: {
    getInstance: () => mockAuthManager
  }
}));

describe('SetupForm', () => {
  const mockOnSetupComplete = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthManager.hasStoredCredentials.mockReturnValue(false);
    mockAuthManager.validateCredentials.mockReturnValue([]);
  });

  it('should render the setup form', () => {
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    expect(screen.getByText('CalDAV/CardDAV Server Setup')).toBeInTheDocument();
    expect(screen.getByLabelText('CalDAV Server URL:')).toBeInTheDocument();
    expect(screen.getByLabelText('CardDAV Server URL:')).toBeInTheDocument();
    expect(screen.getByLabelText('Username:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
  });

  it('should show stored credentials section when credentials exist', () => {
    mockAuthManager.hasStoredCredentials.mockReturnValue(true);
    
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    expect(screen.getByText('Load Stored Credentials')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter master password')).toBeInTheDocument();
    expect(screen.getByText('Load Credentials')).toBeInTheDocument();
  });

  it('should auto-fill CardDAV URL when CalDAV URL is entered', async () => {
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    const caldavInput = screen.getByLabelText('CalDAV Server URL:');
    const carddavInput = screen.getByLabelText('CardDAV Server URL:');
    
    fireEvent.change(caldavInput, { target: { value: 'https://example.com/caldav/' } });
    
    expect(carddavInput).toHaveValue('https://example.com/carddav/');
  });

  it('should show master password field when remember credentials is checked', async () => {
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    const checkbox = screen.getByLabelText('Remember credentials securely in browser');
    expect(checkbox).toBeChecked(); // Should be checked by default
    
    expect(screen.getByLabelText('Master Password:')).toBeInTheDocument();
  });

  it('should hide master password field when remember credentials is unchecked', async () => {
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    const checkbox = screen.getByLabelText('Remember credentials securely in browser');
    fireEvent.click(checkbox);
    
    expect(screen.queryByLabelText('Master Password:')).not.toBeInTheDocument();
  });

  it('should display validation errors', async () => {
    mockAuthManager.validateCredentials.mockReturnValue([
      'CalDAV URL is required',
      'Username is required'
    ]);
    
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    const submitButton = screen.getByText('Connect');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('CalDAV URL is required')).toBeInTheDocument();
    expect(screen.getByText('Username is required')).toBeInTheDocument();
  });

  it('should test connection when Test Connection button is clicked', async () => {
    mockAuthManager.testConnection.mockResolvedValue({
      success: true,
      provider: 'baikal'
    });
    
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText('CalDAV Server URL:'), { target: { value: 'https://example.com/caldav/' } });
    fireEvent.change(screen.getByLabelText('CardDAV Server URL:'), { target: { value: 'https://example.com/carddav/' } });
    fireEvent.change(screen.getByLabelText('Username:'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password:'), { target: { value: 'testpass' } });
    fireEvent.change(screen.getByPlaceholderText('Create a master password'), { target: { value: 'master123' } });
    
    const testButton = screen.getByText('Test Connection');
    fireEvent.click(testButton);
    
    // Wait for the connection test to complete
    await waitFor(() => {
      expect(mockAuthManager.testConnection).toHaveBeenCalledWith({
        caldavUrl: 'https://example.com/caldav/',
        carddavUrl: 'https://example.com/carddav/',
        username: 'testuser',
        password: 'testpass'
      });
    });
    
    // Wait for the success message to appear
    await waitFor(() => {
      expect(screen.getByText(/Connection successful!/)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Detected server: baikal/)).toBeInTheDocument();
  });

  it('should show connection error when test fails', async () => {
    mockAuthManager.testConnection.mockResolvedValue({
      success: false,
      error: 'Authentication failed'
    });
    
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText('CalDAV Server URL:'), { target: { value: 'https://example.com/caldav/' } });
    fireEvent.change(screen.getByLabelText('CardDAV Server URL:'), { target: { value: 'https://example.com/carddav/' } });
    fireEvent.change(screen.getByLabelText('Username:'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password:'), { target: { value: 'testpass' } });
    fireEvent.change(screen.getByPlaceholderText('Create a master password'), { target: { value: 'master123' } });
    
    const testButton = screen.getByText('Test Connection');
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Connection failed: Authentication failed/)).toBeInTheDocument();
    });
  });

  it('should call onSetupComplete when form is submitted successfully', async () => {
    mockAuthManager.storeCredentials.mockResolvedValue(undefined);
    
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText('CalDAV Server URL:'), { target: { value: 'https://example.com/caldav/' } });
    fireEvent.change(screen.getByLabelText('CardDAV Server URL:'), { target: { value: 'https://example.com/carddav/' } });
    fireEvent.change(screen.getByLabelText('Username:'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password:'), { target: { value: 'testpass' } });
    fireEvent.change(screen.getByLabelText('Master Password:'), { target: { value: 'master123' } });
    
    const submitButton = screen.getByText('Connect');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockAuthManager.storeCredentials).toHaveBeenCalledWith(
        {
          caldavUrl: 'https://example.com/caldav/',
          carddavUrl: 'https://example.com/carddav/',
          username: 'testuser',
          password: 'testpass'
        },
        'master123'
      );
    });
    
    expect(mockOnSetupComplete).toHaveBeenCalledWith({
      caldavUrl: 'https://example.com/caldav/',
      carddavUrl: 'https://example.com/carddav/',
      username: 'testuser',
      password: 'testpass'
    });
  });

  it('should load stored credentials when Load Credentials is clicked', async () => {
    mockAuthManager.hasStoredCredentials.mockReturnValue(true);
    mockAuthManager.getStoredCredentials.mockResolvedValue({
      caldavUrl: 'https://stored.com/caldav/',
      carddavUrl: 'https://stored.com/carddav/',
      username: 'storeduser',
      password: 'storedpass'
    });
    
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    const masterPasswordInput = screen.getByPlaceholderText('Enter master password');
    fireEvent.change(masterPasswordInput, { target: { value: 'master123' } });
    
    const loadButton = screen.getByText('Load Credentials');
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(mockAuthManager.getStoredCredentials).toHaveBeenCalledWith('master123');
    });
    
    // Wait for the form fields to be populated
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://stored.com/caldav/')).toBeInTheDocument();
    });
    
    expect(screen.getByDisplayValue('https://stored.com/carddav/')).toBeInTheDocument();
    expect(screen.getByDisplayValue('storeduser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('storedpass')).toBeInTheDocument();
  });

  it('should show advanced options when toggle is clicked', async () => {
    render(<SetupForm onSetupComplete={mockOnSetupComplete} />);
    
    const advancedToggle = screen.getByText('Show Advanced Options');
    fireEvent.click(advancedToggle);
    
    expect(screen.getByText('Server Examples')).toBeInTheDocument();
    expect(screen.getByText('Baikal:')).toBeInTheDocument();
    expect(screen.getByText('Radicale:')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(<SetupForm onSetupComplete={mockOnSetupComplete} onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });
});