import React, { useState, useEffect } from "react";
import { Contact, AddressBook } from "../../types/dav";
import { SyncService } from "../../services/SyncService";
import { LoadingOverlay } from "../common/LoadingOverlay";
import "./ContactList.css";

// Global cache to persist across component lifecycles
const contactCache = {
  lastFetchKey: "",
  contacts: [] as Contact[],
  listeners: new Set<(contacts: Contact[]) => void>(),
  
  updateContacts: (contacts: Contact[]) => {
    contactCache.contacts = contacts;
    // Notify all listeners
    contactCache.listeners.forEach(listener => listener(contacts));
  },
  
  addListener: (listener: (contacts: Contact[]) => void) => {
    contactCache.listeners.add(listener);
  },
  
  removeListener: (listener: (contacts: Contact[]) => void) => {
    contactCache.listeners.delete(listener);
  }
};

interface ContactListProps {
  addressBook: AddressBook | null;
  syncService: SyncService;
  onContactSelect: (contact: Contact) => void;
  onAddContact: () => void;
  refreshTrigger?: number; // Only increments when refresh is actually needed
}

const ContactList: React.FC<ContactListProps> = ({
  addressBook,
  syncService,
  onContactSelect,
  onAddContact,
  refreshTrigger,
}) => {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    console.log(`[ContactList] Initializing with cached contacts: ${contactCache.contacts.length}`);
    return contactCache.contacts;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "org">("name");

  // Fetch contacts function
  const fetchContacts = async () => {
    if (!addressBook) {
      const emptyContacts: Contact[] = [];
      setContacts(emptyContacts);
      contactCache.updateContacts(emptyContacts);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const fetchedContacts = await syncService.getContacts(addressBook);
      console.log(`[ContactList] Fetch completed, setting ${fetchedContacts.length} contacts`);
      setContacts(fetchedContacts);
      contactCache.updateContacts(fetchedContacts); // Update global cache and notify listeners
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load contacts"
      );
      console.error("Error fetching contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Use global cache to persist across component lifecycles
  useEffect(() => {
    if (!addressBook) {
      setContacts([]);
      return;
    }
    
    const currentKey = `${addressBook.url}-${refreshTrigger || 0}`;
    
    // Only fetch if the key has actually changed from the global cache
    if (currentKey !== contactCache.lastFetchKey) {
      console.log(`[ContactList] Fetching contacts - Key changed from "${contactCache.lastFetchKey}" to "${currentKey}"`);
      contactCache.lastFetchKey = currentKey;
      fetchContacts();
    } else {
      console.log(`[ContactList] Effect ran but key unchanged: "${currentKey}"`);
      // Always sync with cache when key is unchanged
      if (JSON.stringify(contactCache.contacts) !== JSON.stringify(contacts)) {
        console.log(`[ContactList] Syncing with cached contacts (${contactCache.contacts.length} contacts)`);
        setContacts(contactCache.contacts);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressBook?.url, refreshTrigger]);

  // Set up listener for cache updates
  useEffect(() => {
    const handleCacheUpdate = (newContacts: Contact[]) => {
      console.log(`[ContactList] Cache updated, received ${newContacts.length} contacts`);
      setContacts(newContacts);
    };

    contactCache.addListener(handleCacheUpdate);

    return () => {
      contactCache.removeListener(handleCacheUpdate);
    };
  }, []);

  // Separate effect to ensure contacts are always in sync with cache
  useEffect(() => {
    if (addressBook && contactCache.contacts.length > 0 && contacts.length === 0) {
      console.log(`[ContactList] Initial sync with cached contacts (${contactCache.contacts.length} contacts)`);
      setContacts(contactCache.contacts);
    }
  }, [addressBook, contacts.length]);

  // Listen for cache updates from other component instances
  useEffect(() => {
    const handleCacheUpdate = (updatedContacts: Contact[]) => {
      console.log(`[ContactList] Cache updated by another instance, syncing ${updatedContacts.length} contacts`);
      setContacts(updatedContacts);
    };

    contactCache.addListener(handleCacheUpdate);

    return () => {
      contactCache.removeListener(handleCacheUpdate);
    };
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.fn.toLowerCase().includes(searchLower) ||
      contact.firstName?.toLowerCase().includes(searchLower) ||
      contact.lastName?.toLowerCase().includes(searchLower) ||
      contact.org?.toLowerCase().includes(searchLower) ||
      contact.email?.some((email) =>
        email.toLowerCase().includes(searchLower)
      ) ||
      contact.tel?.some((tel) => tel.includes(searchTerm))
    );
  });

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (sortBy === "name") {
      return a.fn.localeCompare(b.fn);
    } else {
      // Sort by organization, fallback to name if org is not available
      const orgA = a.org || "";
      const orgB = b.org || "";
      return orgA.localeCompare(orgB) || a.fn.localeCompare(b.fn);
    }
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as "name" | "org");
  };

  if (!addressBook) {
    return (
      <div className="contact-list-empty">
        <p>Please select an address book to view contacts.</p>
      </div>
    );
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
    <>
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
            {searchTerm ? "No contacts match your search" : "No contacts found"}
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
                  <div className="contact-list-item-email">
                    {contact.email[0]}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Local loading overlay for contacts */}
      <LoadingOverlay 
        isVisible={loading} 
        text="Loading contacts..." 
        size="medium" 
      />
    </>
  );
};

export default ContactList;
