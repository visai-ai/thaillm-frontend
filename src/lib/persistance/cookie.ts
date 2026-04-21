import { deleteCookie, getCookie, setCookie } from "cookies-next/client";
import { PersistanceStorage } from ".";

class CookieStorage implements PersistanceStorage {
  async getItem(key: string): Promise<string | null> {
    const value = await getCookie(key);
    return value ? value : null;
  }

  private static readonly MAX_AGE_YEARS = 10;
  private static readonly MAX_AGE_SECONDS =
    60 * 60 * 24 * 365 * CookieStorage.MAX_AGE_YEARS;

  async setItem(key: string, value: any): Promise<void> {
    await setCookie(key, value, {
      path: "/",
      maxAge: CookieStorage.MAX_AGE_SECONDS,
      secure: window.location.protocol === "https:",
      sameSite: "lax",
    });
  }

  async removeItem(key: string): Promise<void> {
    await deleteCookie(key, {
      path: "/",
      secure: window.location.protocol === "https:",
      sameSite: "lax",
    });
  }
}
export default CookieStorage;
