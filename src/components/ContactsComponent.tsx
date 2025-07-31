import React from 'react';
import { AddressBook } from '../types/dav';
import { SyncService } from '../services/SyncService';
import { DAVClient } from '../services/DAVClient';
import { ContactCardGrid } from './Contact';

interface ContactsComponentProps {
  addressBooks: AddressBook[];
  visibleAddressBooks: Set<string>;
  syncService: SyncService;
  davClient: DAVClient;
  contactRefreshTrigger: number;
  onLoadAddressBooks: () => Promise<void>;
}

export const ContactsComponent: React.FC<ContactsComponentProps> = ({
  addressBooks,
  visibleAddressBooks,
  syncService,
  davClient,
  contactRefreshTrigger,
  onLoadAddressBooks,
}) => {
  const visibleAddressBooksArray = addressBooks.filter((ab) =>
    visibleAddressBooks.has(ab.url)
  );

  return (
    <div className="view-container">
      <div className="contacts-view">
        {addressBooks.length === 0 ? (
          <div className="no-address-books">
            <h2>No Address Books Found</h2>
            <p>No address books were found on your CardDAV server.</p>
            <button onClick={onLoadAddressBooks}>Refresh</button>
          </div>
        ) : (
          <div className="contacts-container">
            <div className="contacts-layout">
              <ContactCardGrid
                addressBooks={visibleAddressBooksArray}
                syncService={syncService}
                davClient={davClient}
                refreshTrigger={contactRefreshTrigger}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};