import React from 'react';
import { Contact } from '../../types/dav';
import { EditIcon } from './EditIcon';
import './ContactDetail.css';

interface ContactDetailProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onClose: () => void;
}

export const ContactDetail: React.FC<ContactDetailProps> = ({ contact, onEdit, onClose }) => {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEditClick = () => {
    onClose(); // Close the detail modal first
    onEdit(contact); // Then open the edit modal
  };

  return (
    <div className="contact-detail-container">
      <div className="contact-detail-content">
        <div className="contact-detail-header-section">
          <div className="contact-detail-header">
            <div className="contact-detail-avatar">
              {contact.photo ? (
                <img 
                  src={contact.photo} 
                  alt={contact.fn}
                  className="contact-detail-avatar-image"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.classList.add('contact-detail-avatar-fallback');
                      parent.textContent = getInitials(contact.fn);
                    }
                  }}
                />
              ) : (
                getInitials(contact.fn)
              )}
            </div>
            <div className="contact-detail-info">
              <h3 className="contact-detail-name">{contact.fn}</h3>
              {contact.org && (
                <div className="contact-detail-org">{contact.org}</div>
              )}
            </div>
            <button 
              className="contact-detail-edit-btn" 
              onClick={handleEditClick}
              aria-label="Edit contact"
              title="Edit contact"
            >
              <EditIcon size={20} />
            </button>
          </div>
        </div>

        {contact.email && contact.email.length > 0 && (
          <div className="contact-detail-section">
            <h4>Email</h4>
            <ul className="contact-detail-list">
              {contact.email.map((email, index) => (
                <li key={`email-${index}`}>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contact.tel && contact.tel.length > 0 && (
          <div className="contact-detail-section">
            <h4>Phone</h4>
            <ul className="contact-detail-list">
              {contact.tel.map((tel, index) => (
                <li key={`tel-${index}`}>
                  <a href={`tel:${tel}`}>{tel}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="contact-detail-section contact-detail-meta">
          <div className="contact-detail-uid">
            <span>ID: </span>
            <code>{contact.uid}</code>
          </div>
        </div>
      </div>
    </div>
  );
};