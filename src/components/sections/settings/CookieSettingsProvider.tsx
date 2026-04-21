"use client";

import { useState, useEffect } from "react";
import { CookieUtils } from "@/lib/utils/cookieUtils";
import { CookieSettingsPopup } from "./CookieSettingsPopup";

export const CookieSettingsProvider = () => {
  const [showCookiePopup, setShowCookiePopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkCookieSettings = async () => {
      try {
        setIsLoading(true);
        const hasSettings = await CookieUtils.hasCookieSettings();
        setShowCookiePopup(!hasSettings);
      } catch (error) {
        console.error("Error checking cookie settings:", error);
        // Show popup on error to be safe
        setShowCookiePopup(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkCookieSettings();
  }, []);

  const handleCloseCookiePopup = () => {
    setShowCookiePopup(false);
  };

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Only show popup if user hasn't set cookie preferences
  if (!showCookiePopup) {
    return null;
  }

  return <CookieSettingsPopup onClose={handleCloseCookiePopup} />;
};
