"use client";

import { CookieSettingsProvider } from "@/components/sections/settings/CookieSettingsProvider";
import NotificationComponent from "@/components/common/Notification";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <>{children}</>
      <CookieSettingsProvider />
      <NotificationComponent />
    </>
  );
}
