import { useCallback } from 'react';
import { AddressBook } from '../types/dav';
import { SyncService } from '../services/SyncService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { AddressBookColorService } from '../services/AddressBookColorService';
import { useLoading } from '../contexts/LoadingContext';

interface UseAddressBookHandlersProps {
  addressBooks: AddressBook[];
  setAddressBooks: (addressBooks: AddressBook[] | ((prev: AddressBook[]) => AddressBook[])) => void;
  setVisibleAddressBooks: (addressBooks: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setShowNewAddressBookForm: (show: boolean) => void;
  setEditingAddressBook: (addressBook: AddressBook | null) => void;
  sync: SyncService;
}

export const useAddressBookHandlers = ({
  addressBooks,
  setAddressBooks,
  setVisibleAddressBooks,
  setShowNewAddressBookForm,
  setEditingAddressBook,
  sync,
}: UseAddressBookHandlersProps) => {
  const { showLoading, hideLoading } = useLoading();
  const errorService = ErrorHandlingService.getInstance();

  const handleCreateAddressBook = useCallback(() => {
    setShowNewAddressBookForm(true);
  }, [setShowNewAddressBookForm]);

  const handleEditAddressBook = useCallback((addressBook: AddressBook) => {
    setEditingAddressBook(addressBook);
  }, [setEditingAddressBook]);

  const handleNewAddressBookSave = useCallback(
    async (displayName: string, description?: string) => {
      if (!sync) {
        throw new Error("Sync service not available");
      }

      try {
        const newAddressBook = await sync.createAddressBook(displayName, description);

        setAddressBooks((prev) => {
          const updated = [...prev, newAddressBook];
          return updated;
        });

        setVisibleAddressBooks((prev) => {
          const newSet = new Set(prev);
          newSet.add(newAddressBook.url);
          return newSet;
        });

        setShowNewAddressBookForm(false);

        console.log("Address book created successfully:", newAddressBook.displayName);
      } catch (error) {
        console.error("Failed to create address book:", error);
        throw error;
      }
    },
    [sync, setAddressBooks, setVisibleAddressBooks, setShowNewAddressBookForm]
  );

  const handleNewAddressBookCancel = useCallback(() => {
    setShowNewAddressBookForm(false);
  }, [setShowNewAddressBookForm]);

  const handleEditAddressBookSave = useCallback(
    async (addressBook: AddressBook, displayName: string, color: string) => {
      try {
        showLoading("Updating address book...");

        const updatedAddressBook = await sync.updateAddressBook(addressBook, displayName);

        AddressBookColorService.setColor(addressBook.url, color);

        setAddressBooks((prevAddressBooks) => {
          return prevAddressBooks.map((ab) =>
            ab.url === addressBook.url ? { ...updatedAddressBook, color } : ab
          );
        });

        setEditingAddressBook(null);

        errorService.reportError(
          `Address book "${displayName}" updated successfully!`,
          "info"
        );
      } catch (error) {
        console.error("Failed to update address book:", error);
        throw error;
      } finally {
        hideLoading();
      }
    },
    [sync, errorService, showLoading, hideLoading, setAddressBooks, setEditingAddressBook]
  );

  const handleEditAddressBookDelete = useCallback(
    async (addressBook: AddressBook) => {
      try {
        showLoading("Deleting address book...");

        await sync.deleteAddressBook(addressBook);

        setAddressBooks((prevAddressBooks) => {
          return prevAddressBooks.filter((ab) => ab.url !== addressBook.url);
        });

        setVisibleAddressBooks((prev) => {
          const newVisible = new Set(prev);
          newVisible.delete(addressBook.url);
          return newVisible;
        });

        setEditingAddressBook(null);

        errorService.reportError(
          `Address book "${addressBook.displayName}" deleted successfully!`,
          "info"
        );
      } catch (error) {
        console.error("Failed to delete address book:", error);
        throw error;
      } finally {
        hideLoading();
      }
    },
    [sync, errorService, showLoading, hideLoading, setAddressBooks, setVisibleAddressBooks, setEditingAddressBook]
  );

  const handleEditAddressBookCancel = useCallback(() => {
    setEditingAddressBook(null);
  }, [setEditingAddressBook]);

  const handleAddressBookToggle = useCallback((addressBookUrl: string) => {
    setVisibleAddressBooks((prev) => {
      const newVisible = new Set(prev);
      if (newVisible.has(addressBookUrl)) {
        newVisible.delete(addressBookUrl);
      } else {
        newVisible.add(addressBookUrl);
      }
      return newVisible;
    });
  }, [setVisibleAddressBooks]);

  const handleAddressBookColorChange = useCallback(
    async (addressBookUrl: string, color: string) => {
      const addressBook = addressBooks.find((ab) => ab.url === addressBookUrl);
      if (!addressBook) {
        console.error("Address book not found for color update:", addressBookUrl);
        return;
      }

      try {
        AddressBookColorService.setColor(addressBookUrl, color);

        setAddressBooks((prevAddressBooks) =>
          prevAddressBooks.map((ab) =>
            ab.url === addressBookUrl ? { ...ab, color } : ab
          )
        );
      } catch (error) {
        console.error("Failed to update address book color:", error);
        errorService.reportError(
          `Failed to update address book color: ${errorService.formatErrorMessage(error)}`,
          "error"
        );
      }
    },
    [addressBooks, errorService, setAddressBooks]
  );

  return {
    handleCreateAddressBook,
    handleEditAddressBook,
    handleNewAddressBookSave,
    handleNewAddressBookCancel,
    handleEditAddressBookSave,
    handleEditAddressBookDelete,
    handleEditAddressBookCancel,
    handleAddressBookToggle,
    handleAddressBookColorChange,
  };
};