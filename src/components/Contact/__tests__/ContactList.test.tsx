import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ContactList from '../ContactList';
import { LoadingProvider } from '../../../contexts/LoadingContext';
import { SyncService } from '../../../services/SyncService';
import { AddressBook, Contact } from '../../../types/dav';

// Mock the SyncService
jest.mock('../../../services/SyncService');

const mockSyncService = {
  getContacts: jest.fn()
} as unknown as SyncService;

const mockAddressBook: AddressBook = {
  url: 'test-url',
  displayName: 'Test Address Book',
  ctag: 'test-ctag'
};

const mockContacts: Contact[] = [
  {
    uid: '1',
    fn: 'John Doe',
    org: 'Test Company',
    email: ['john@example.com'],
    tel: ['+1234567890'],
    url: 'contact-1-url',
    etag: 'etag-1'
  }
];

const renderWithLoadingProvider = (component: React.ReactElement) => {
  return render(
    <LoadingProvider>
      {component}
    </LoadingProvider>
  );
};

describe('ContactList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing and uses loading context', async () => {
    (mockSyncService.getContacts as jest.Mock).mockResolvedValue(mockContacts);

    renderWithLoadingProvider(
      <ContactList
        addressBook={mockAddressBook}
        syncService={mockSyncService}
        onContactSelect={jest.fn()}
        onAddContact={jest.fn()}
      />
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Test Address Book')).toBeInTheDocument();
    });

    // Check if contacts are loaded or if empty state is shown
    await waitFor(() => {
      // The component should either show contacts or empty state, not loading
      expect(screen.queryByText('Loading contacts...')).not.toBeInTheDocument();
    });
  });

  it('handles loading errors gracefully', async () => {
    (mockSyncService.getContacts as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    renderWithLoadingProvider(
      <ContactList
        addressBook={mockAddressBook}
        syncService={mockSyncService}
        onContactSelect={jest.fn()}
        onAddContact={jest.fn()}
      />
    );

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to load/)).toBeInTheDocument();
    });
  });
});