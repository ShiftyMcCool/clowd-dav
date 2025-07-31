import React, { Suspense, lazy } from 'react';
import { AddressBook } from '../types/dav';

const NewAddressBookForm = lazy(() =>
  import('./AddressBook/NewAddressBookForm').then((module) => ({
    default: module.NewAddressBookForm,
  }))
);
const EditAddressBookForm = lazy(() =>
  import('./AddressBook/EditAddressBookForm').then((module) => ({
    default: module.EditAddressBookForm,
  }))
);

interface GlobalModalsProps {
  showNewAddressBookForm: boolean;
  editingAddressBook: AddressBook | null;
  onNewAddressBookSave: (displayName: string, description?: string) => Promise<void>;
  onNewAddressBookCancel: () => void;
  onEditAddressBookSave: (addressBook: AddressBook, displayName: string, color: string) => Promise<void>;
  onEditAddressBookDelete: (addressBook: AddressBook) => Promise<void>;
  onEditAddressBookCancel: () => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  showNewAddressBookForm,
  editingAddressBook,
  onNewAddressBookSave,
  onNewAddressBookCancel,
  onEditAddressBookSave,
  onEditAddressBookDelete,
  onEditAddressBookCancel,
}) => {
  return (
    <>
      {showNewAddressBookForm && (
        <Suspense fallback={<div />}>
          <NewAddressBookForm
            onSave={onNewAddressBookSave}
            onCancel={onNewAddressBookCancel}
          />
        </Suspense>
      )}

      {editingAddressBook && (
        <Suspense fallback={<div />}>
          <EditAddressBookForm
            addressBook={editingAddressBook}
            onSave={onEditAddressBookSave}
            onDelete={onEditAddressBookDelete}
            onCancel={onEditAddressBookCancel}
          />
        </Suspense>
      )}
    </>
  );
};