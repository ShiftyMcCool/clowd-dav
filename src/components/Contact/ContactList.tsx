import React, { useState, useEffect } from 'react';
import { Contact, AddressBook } from '../../types/dav';
import { SyncService } from '../../services/SyncService';
import './ContactList.css';

interface ContactListProps {
  addressBook: AddressBook;
  syncService: SyncService;
  onContactSelect: (contact: Contact) => void;
  onAddContact: () => void;
}

const ContactList: React.FC<ContactListProps> = ({ 
  addressBook, 
  syncService, 
  onContactSelect, 
  onAddContact 
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'org'>('name');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedContacts = await syncService.getContacts(addressBook);
        setContacts(fetchedContacts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [addressBook, syncService]);

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.fn.toLowerCase().includes(searchLower) ||
      contact.org?.toLowerCase().includes(searchLower) ||
      contact.email?.some(email => email.toLowerCase().includes(searchLower)) ||
      contact.tel?.some(tel => tel.includes(searchTerm))
    );
  });

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (sortBy === 'name') {
      return a.fn.localeCompare(b.fn);
    } else {
      // Sort by organization, fallback to name if org is not available
      const orgA = a.org || '';
      const orgB = b.org || '';
      return orgA.localeCompare(orgB) || a.fn.localeCompare(b.fn);
    }
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as 'name' | 'org');
  };

  if (loading) {
    return <div className="contact-list-loading">Loading contacts...</div>;
  }

  if (error) {
    return (
      <div className="contact-list-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="contact-list-container">
      <div className="contact-list-header">
        <h2>{addressBook.displayName}</h2>
        <button 
          className="add-contact-button" 
          onClick={onAddContact}
          aria-label="Add new contact"
        >
          + Add Contact
        </button>
      </div>
      
      <div className="contact-list-controls">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="contact-search-input"
          aria-label="Search contacts"
        />
        
        <div className="contact-sort-control">
          <label htmlFor="contact-sort">Sort by:</label>
          <select 
            id="contact-sort" 
            value={sortBy} 
            onChange={handleSortChange}
            aria-label="Sort contacts by"
          >
            <option value="name">Name</option>
            <option value="org">Organization</option>
          </select>
        </div>
      </div>

      {sortedContacts.length === 0 ? (
        <div className="contact-list-empty">
          {searchTerm ? 'No contacts match your search' : 'No contacts found'}
        </div>
      ) : (
        <ul className="contact-list">
          {sortedContacts.map((contact) => (
            <li 
              key={contact.uid} 
              className="contact-list-item"
              onClick={() => onContactSelect(contact)}
            >
              <div className="contact-list-item-name">{contact.fn}</div>
              {contact.org && (
                <div className="contact-list-item-org">{contact.org}</div>
              )}
              {contact.email && contact.email.length > 0 && (
                <div className="contact-list-item-email">{contact.email[0]}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContactList;