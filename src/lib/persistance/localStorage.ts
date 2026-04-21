import { PersistanceStorage } from ".";

class LocalStorage implements PersistanceStorage {
  async getItem(key: string): Promise<string | null> {
    const value = localStorage.getItem(key);
    return value ? value : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
export default LocalStorage;
