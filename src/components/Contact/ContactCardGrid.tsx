import React, { useState, useEffect } from "react";
import { Contact, AddressBook } from "../../types/dav";
import { SyncService } from "../../services/SyncService";
import { LoadingOverlay } from "../common/LoadingOverlay";
import { ContactCard } from "./ContactCard";
import { Modal } from "../common/Modal";
import { ContactForm } from "./ContactForm";
import { ContactDetail } from "./ContactDetail";
import { DAVClient } from "../../services/DAVClient";
import "./ContactCardGrid.css";

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

interface ContactCardGridProps {
  addressBook: AddressBook | null;
  syncService: SyncService;
  davClient: DAVClient;
  refreshTrigger?: number;
}

export const ContactCardGrid: React.FC<ContactCardGridProps> = ({
  addressBook,
  syncService,
  davClient,
  refreshTrigger,
}) => {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    console.log(`[ContactCardGrid] Initializing with cached contacts: ${contactCache.contacts.length}`);
    return contactCache.contacts;
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "org">("name");
  
  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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
      console.log(`[ContactCardGrid] Fetch completed, setting ${fetchedContacts.length} contacts`);
      setContacts(fetchedContacts);
      contactCache.updateContacts(fetchedContacts);
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
      console.log(`[ContactCardGrid] Fetching contacts - Key changed from "${contactCache.lastFetchKey}" to "${currentKey}"`);
      contactCache.lastFetchKey = currentKey;
      fetchContacts();
    } else {
      console.log(`[ContactCardGrid] Effect ran but key unchanged: "${currentKey}"`);
      // Always sync with cache when key is unchanged
      if (JSON.stringify(contactCache.contacts) !== JSON.stringify(contacts)) {
        console.log(`[ContactCardGrid] Syncing with cached contacts (${contactCache.contacts.length} contacts)`);
        setContacts(contactCache.contacts);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressBook?.url, refreshTrigger]);

  // Set up listener for cache updates
  useEffect(() => {
    const handleCacheUpdate = (newContacts: Contact[]) => {
      console.log(`[ContactCardGrid] Cache updated, received ${newContacts.length} contacts`);
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
      console.log(`[ContactCardGrid] Initial sync with cached contacts (${contactCache.contacts.length} contacts)`);
      setContacts(contactCache.contacts);
    }
  }, [addressBook, contacts.length]);

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

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetail(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowEditForm(true);
  };

  const handleCreateContact = () => {
    setSelectedContact(null);
    setShowCreateForm(true);
  };

  const handleContactSave = async (savedContact: Contact) => {
    // Refresh contacts after save
    await fetchContacts();
    
    // Close modals
    setShowCreateForm(false);
    setShowEditForm(false);
    setSelectedContact(null);
  };

  const handleContactDelete = async (contact: Contact) => {
    if (!addressBook) return;
    
    try {
      await davClient.deleteContact(addressBook, contact);
      // Refresh contacts after delete
      await fetchContacts();
      
      // Close modals
      setShowEditForm(false);
      setShowDetail(false);
      setSelectedContact(null);
    } catch (err) {
      console.error("Error deleting contact:", err);
      throw err; // Re-throw to let the form handle the error
    }
  };

  const closeModals = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setShowDetail(false);
    setSelectedContact(null);
  };

  if (!addressBook) {
    return (
      <div className="contact-grid-empty">
        <p>Please select an address book to view contacts.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contact-grid-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <div className="contact-grid-container">
        <div className="contact-grid-header">
          <h2>{addressBook.displayName}</h2>
          <button
            className="add-contact-button"
            onClick={handleCreateContact}
            aria-label="Add new contact"
          >
            + Add Contact
          </button>
        </div>

        <div className="contact-grid-controls">
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
          <div className="contact-grid-empty">
            {searchTerm ? (
              <div>
                <p>No contacts match your search</p>
                <button 
                  className="create-first-contact-button"
                  onClick={handleCreateContact}
                >
                  Create new contact
                </button>
              </div>
            ) : (
              <div>
                <p>No contacts found</p>
                <button 
                  className="create-first-contact-button"
                  onClick={handleCreateContact}
                >
                  Create your first contact
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="contact-cards-grid">
            {sortedContacts.map((contact) => (
              <ContactCard
                key={contact.uid}
                contact={contact}
                onClick={handleContactClick}
                onEdit={handleEditContact}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Loading overlay */}
      <LoadingOverlay 
        isVisible={loading} 
        text="Loading contacts..." 
        size="medium" 
      />

      {/* Create Contact Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={closeModals}
        title="Create New Contact"
        size="medium"
      >
        {addressBook && (
          <ContactForm
            addressBook={addressBook}
            davClient={davClient}
            onSave={handleContactSave}
            onCancel={closeModals}
          />
        )}
      </Modal>

      {/* Edit Contact Modal */}
      <Modal
        isOpen={showEditForm}
        onClose={closeModals}
        title="Edit Contact"
        size="medium"
      >
        {addressBook && selectedContact && (
          <ContactForm
            contact={selectedContact}
            addressBook={addressBook}
            davClient={davClient}
            onSave={handleContactSave}
            onCancel={closeModals}
            onDelete={handleContactDelete}
          />
        )}
      </Modal>

      {/* Contact Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={closeModals}
        title="Contact Details"
        size="medium"
      >
        {selectedContact && (
          <ContactDetail
            contact={selectedContact}
            onEdit={handleEditContact}
            onClose={closeModals}
          />
        )}
      </Modal>
    </>
  );
};