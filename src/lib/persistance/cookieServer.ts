import { PersistanceStorage } from ".";
import { getCookie, setCookie, deleteCookie } from "cookies-next/server";

class CookieStorage implements PersistanceStorage {
  async getItem(key: string): Promise<string | null> {
    const value = await getCookie(key);
    return value != null ? String(value) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await setCookie(key, value, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  async removeItem(key: string): Promise<void> {
    await deleteCookie(key, {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
}
export default CookieStorage;
