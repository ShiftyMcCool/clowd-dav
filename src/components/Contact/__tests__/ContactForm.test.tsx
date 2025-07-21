import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactForm from '../ContactForm';
import { Contact, AddressBook } from '../../../types/dav';
import { DAVClient } from '../../../services/DAVClient';

// Mock the DAVClient
jest.mock('../../../services/DAVClient');

describe('ContactForm Component', () => {
  const mockAddressBook: AddressBook = {
    url: 'https://example.com/addressbooks/user/default/',
    displayName: 'Default Address Book'
  };
  
  const mockContact: Contact = {
    uid: 'test-contact-123',
    fn: 'John Doe',
    org: 'Test Company',
    email: ['john@example.com'],
    tel: ['123-456-7890'],
    etag: 'test-etag'
  };
  
  const mockDavClient = {
    createContact: jest.fn().mockResolvedValue(undefined),
    updateContact: jest.fn().mockResolvedValue(undefined)
  } as unknown as DAVClient;
  
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders form for creating a new contact', () => {
    render(
      <ContactForm
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText('Add New Contact')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization/i)).toBeInTheDocument();
    expect(screen.getByText('+ Add Email')).toBeInTheDocument();
    expect(screen.getByText('+ Add Phone')).toBeInTheDocument();
  });
  
  test('renders form for editing an existing contact', () => {
    render(
      <ContactForm
        contact={mockContact}
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/Organization/i)).toHaveValue('Test Company');
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123-456-7890')).toBeInTheDocument();
  });
  
  test('validates required fields', async () => {
    render(
      <ContactForm
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    // Clear the name field and submit
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: '' } });
    
    const submitButton = screen.getByText('Save Contact');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
    });
    
    expect(mockDavClient.createContact).not.toHaveBeenCalled();
  });
  
  test('validates email format', async () => {
    render(
      <ContactForm
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    // Enter name and invalid email
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    
    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByText('Save Contact');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
    
    expect(mockDavClient.createContact).not.toHaveBeenCalled();
  });
  
  test('creates a new contact successfully', async () => {
    render(
      <ContactForm
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    // Fill out the form
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    
    const orgInput = screen.getByLabelText(/Organization/i);
    fireEvent.change(orgInput, { target: { value: 'New Company' } });
    
    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    
    const phoneInput = screen.getByPlaceholderText('Phone number');
    fireEvent.change(phoneInput, { target: { value: '987-654-3210' } });
    
    const submitButton = screen.getByText('Save Contact');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockDavClient.createContact).toHaveBeenCalled();
      expect(mockOnSave).toHaveBeenCalled();
    });
    
    const createContactCall = mockDavClient.createContact.mock.calls[0];
    expect(createContactCall[0]).toBe(mockAddressBook);
    expect(createContactCall[1].fn).toBe('Jane Smith');
    expect(createContactCall[1].org).toBe('New Company');
    expect(createContactCall[1].email).toEqual(['jane@example.com']);
    expect(createContactCall[1].tel).toEqual(['987-654-3210']);
  });
  
  test('updates an existing contact successfully', async () => {
    render(
      <ContactForm
        contact={mockContact}
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    // Modify the form
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe Updated' } });
    
    const submitButton = screen.getByText('Save Contact');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockDavClient.updateContact).toHaveBeenCalled();
      expect(mockOnSave).toHaveBeenCalled();
    });
    
    const updateContactCall = mockDavClient.updateContact.mock.calls[0];
    expect(updateContactCall[0]).toBe(mockAddressBook);
    expect(updateContactCall[1].fn).toBe('John Doe Updated');
    expect(updateContactCall[1].uid).toBe('test-contact-123');
    expect(updateContactCall[1].etag).toBe('test-etag');
  });
  
  test('calls onCancel when cancel button is clicked', () => {
    render(
      <ContactForm
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });
  
  test('adds and removes email fields', () => {
    render(
      <ContactForm
        addressBook={mockAddressBook}
        davClient={mockDavClient}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    
    // Add a new email field
    const addEmailButton = screen.getByText('+ Add Email');
    fireEvent.click(addEmailButton);
    
    // Should now have two email inputs
    const emailInputs = screen.getAllByPlaceholderText('Email address');
    expect(emailInputs.length).toBe(2);
    
    // Fill out both email fields
    fireEvent.change(emailInputs[0], { target: { value: 'first@example.com' } });
    fireEvent.change(emailInputs[1], { target: { value: 'second@example.com' } });
    
    // Remove the first email field
    const removeButtons = screen.getAllByText('-');
    fireEvent.click(removeButtons[0]);
    
    // Should now have one email input with the second email
    const remainingEmailInputs = screen.getAllByPlaceholderText('Email address');
    expect(remainingEmailInputs.length).toBe(1);
    expect(remainingEmailInputs[0]).toHaveValue('second@example.com');
  });
});