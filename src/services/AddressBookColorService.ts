import { AddressBook } from '../types/dav';

/**
 * Service for managing address book colors in local storage
 * Address book colors are stored locally and not synced to the server
 */
export class AddressBookColorService {
  private static readonly COLORS_KEY = 'addressbook_colors';

  /**
   * Gets the stored color for an address book
   */
  static getColor(addressBookUrl: string): string | undefined {
    if (!this.isLocalStorageAvailable()) {
      return undefined;
    }

    try {
      const storedColors = localStorage.getItem(this.COLORS_KEY);
      if (!storedColors) return undefined;

      const colors = JSON.parse(storedColors) as Record<string, string>;
      return colors[addressBookUrl];
    } catch (error) {
      console.error('Failed to retrieve address book color:', error);
      return undefined;
    }
  }

  /**
   * Sets the color for an address book
   */
  static setColor(addressBookUrl: string, color: string): void {
    if (!this.isLocalStorageAvailable()) {
      console.warn('Local storage not available, color setting disabled');
      return;
    }

    try {
      const storedColors = localStorage.getItem(this.COLORS_KEY);
      const colors = storedColors ? JSON.parse(storedColors) as Record<string, string> : {};
      
      colors[addressBookUrl] = color;
      localStorage.setItem(this.COLORS_KEY, JSON.stringify(colors));
    } catch (error) {
      console.error('Failed to store address book color:', error);
    }
  }

  /**
   * Removes the color setting for an address book
   */
  static removeColor(addressBookUrl: string): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const storedColors = localStorage.getItem(this.COLORS_KEY);
      if (!storedColors) return;

      const colors = JSON.parse(storedColors) as Record<string, string>;
      delete colors[addressBookUrl];
      localStorage.setItem(this.COLORS_KEY, JSON.stringify(colors));
    } catch (error) {
      console.error('Failed to remove address book color:', error);
    }
  }

  /**
   * Gets all stored colors
   */
  static getAllColors(): Record<string, string> {
    if (!this.isLocalStorageAvailable()) {
      return {};
    }

    try {
      const storedColors = localStorage.getItem(this.COLORS_KEY);
      return storedColors ? JSON.parse(storedColors) as Record<string, string> : {};
    } catch (error) {
      console.error('Failed to retrieve all address book colors:', error);
      return {};
    }
  }

  /**
   * Applies stored colors to address books
   */
  static applyColorsToAddressBooks(addressBooks: AddressBook[]): AddressBook[] {
    const colors = this.getAllColors();
    
    return addressBooks.map(addressBook => ({
      ...addressBook,
      color: colors[addressBook.url] || '#6b7280' // Default gray color
    }));
  }

  /**
   * Clears all stored colors
   */
  static clearAllColors(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    localStorage.removeItem(this.COLORS_KEY);
  }

  private static isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}