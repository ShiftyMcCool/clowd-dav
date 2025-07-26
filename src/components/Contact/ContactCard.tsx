import React from 'react';
import { Contact } from '../../types/dav';
import './ContactCard.css';

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onClick,
  onEdit
}) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(contact);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const primaryEmail = contact.email?.[0];
  const primaryPhone = contact.tel?.[0];

  return (
    <div className="contact-card" onClick={() => onClick(contact)}>
      <div className="contact-card-header">
        <div className="contact-avatar">
          {getInitials(contact.fn)}
        </div>
        <button
          className="contact-card-edit-btn"
          onClick={handleEditClick}
          aria-label="Edit contact"
          title="Edit contact"
        >
          ✏️
        </button>
      </div>
      
      <div className="contact-card-content">
        <h3 className="contact-name">{contact.fn}</h3>
        
        {contact.org && (
          <p className="contact-org">{contact.org}</p>
        )}
        
        {primaryEmail && (
          <p className="contact-email" title={primaryEmail}>
            {primaryEmail}
          </p>
        )}
        
        {primaryPhone && (
          <p className="contact-phone" title={primaryPhone}>
            {primaryPhone}
          </p>
        )}
      </div>
    </div>
  );
};