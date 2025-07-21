import React from 'react';
import { Contact } from '../../types/dav';
import './ContactDetail.css';

interface ContactDetailProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onClose: () => void;
}

const ContactDetail: React.FC<ContactDetailProps> = ({ contact, onEdit, onClose }) => {
  return (
    <div className="contact-detail-container">
      <div className="contact-detail-header">
        <h2>Contact Details</h2>
        <div className="contact-detail-actions">
          <button 
            className="contact-edit-button" 
            onClick={() => onEdit(contact)}
            aria-label="Edit contact"
          >
            Edit
          </button>
          <button 
            className="contact-close-button" 
            onClick={onClose}
            aria-label="Close contact details"
          >
            Close
          </button>
        </div>
      </div>

      <div className="contact-detail-content">
        <div className="contact-detail-section">
          <h3 className="contact-detail-name">{contact.fn}</h3>
          {contact.org && (
            <div className="contact-detail-org">{contact.org}</div>
          )}
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

export default ContactDetail;