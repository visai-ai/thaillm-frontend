import { CookieSettings, CookieUtils } from "@/lib/utils/cookieUtils";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useEffect, useState } from "react";

export const useCookieSettings = () => {
  const [settings, setSettings] = useState<CookieSettings>({
    cookieRequire: true,
    cookieAnalytic: false,
    cookieMarketing: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addNotification } = useNotificationStore();

  // Load cookie settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const cookieSettings = await CookieUtils.loadCookieSettings();
        setSettings(cookieSettings);
      } catch (error) {
        console.error("Error loading cookie settings:", error);
        addNotification({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดการตั้งค่าคุกกี้ได้",
          state: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [addNotification]);

  // Save cookie settings
  const saveSettings = async (newSettings: CookieSettings) => {
    try {
      setIsSaving(true);
      await CookieUtils.saveCookieSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving cookie settings:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
  };
};
