import CookieStorage from "@/lib/persistance/cookie";

export interface CookieSettings {
  cookieRequire: boolean;
  cookieAnalytic: boolean;
  cookieMarketing: boolean;
}

const COOKIE_KEYS = {
  cookieRequire: "bdi_std_cookie_require",
  cookieAnalytic: "bdi_std_cookie_analytic",
  cookieMarketing: "bdi_std_cookie_marketing",
} as const;

// Create a single instance of CookieStorage
const storage = new CookieStorage();

export const loadCookieSettings = async (): Promise<CookieSettings> => {
  try {
    const [cookieAnalytic, cookieMarketing] = await Promise.all([
      storage.getItem(COOKIE_KEYS.cookieAnalytic),
      storage.getItem(COOKIE_KEYS.cookieMarketing),
    ]);

    return {
      cookieRequire: true, // cookieRequire is always true
      cookieAnalytic: cookieAnalytic === "true",
      cookieMarketing: cookieMarketing === "true",
    };
  } catch (error) {
    console.error("Error loading cookie settings:", error);
    // Return default values if loading fails
    return {
      cookieRequire: true,
      cookieAnalytic: false,
      cookieMarketing: false,
    };
  }
};

export const saveCookieSettings = async (
  settings: CookieSettings,
): Promise<void> => {
  try {
    await Promise.all([
      storage.setItem(COOKIE_KEYS.cookieRequire, "true"), // cookieRequire is always true
      storage.setItem(
        COOKIE_KEYS.cookieAnalytic,
        settings.cookieAnalytic.toString(),
      ),
      storage.setItem(
        COOKIE_KEYS.cookieMarketing,
        settings.cookieMarketing.toString(),
      ),
    ]);
  } catch (error) {
    console.error("Error saving cookie settings:", error);
    throw error;
  }
};

export const clearCookieSettings = async (): Promise<void> => {
  try {
    await Promise.all([
      storage.removeItem(COOKIE_KEYS.cookieRequire),
      storage.removeItem(COOKIE_KEYS.cookieAnalytic),
      storage.removeItem(COOKIE_KEYS.cookieMarketing),
    ]);
  } catch (error) {
    console.error("Error clearing cookie settings:", error);
    throw error;
  }
};

export const hasCookieSettings = async (): Promise<boolean> => {
  try {
    const [cookieRequire, cookieAnalytic, cookieMarketing] = await Promise.all([
      storage.getItem(COOKIE_KEYS.cookieRequire),
      storage.getItem(COOKIE_KEYS.cookieAnalytic),
      storage.getItem(COOKIE_KEYS.cookieMarketing),
    ]);

    // Check if any of the cookie settings exist
    return (
      cookieRequire !== null ||
      cookieAnalytic !== null ||
      cookieMarketing !== null
    );
  } catch (error) {
    console.error("Error checking cookie settings:", error);
    return false;
  }
};

// For backward compatibility, export as CookieUtils object
export const CookieUtils = {
  loadCookieSettings,
  saveCookieSettings,
  clearCookieSettings,
  hasCookieSettings,
};
