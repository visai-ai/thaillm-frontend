"use client";

import { SidebarProvider } from "@/components/ui/sidebar";

import Navbar from "@/components/layout/main/Navbar";
import NotificationComponent from "@/components/common/Notification";

import { SquareUserRound, BellRing } from "lucide-react";
import { SidebarItem } from "@/@types/sidebar";

import Sidebar from "@/components/layout/main/Sidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settingsItem: SidebarItem[] = [
    {
      title: "โปรไฟล์",
      path: "/settings/profile",
      icon: SquareUserRound,
    },
    {
      title: "การแจ้งเตือน",
      path: "/settings/notification",
      icon: BellRing,
    },
  ];

  return (
    <SidebarProvider className="h-svh overflow-hidden flex flex-col">
      {/* navbar */}
      <Navbar />
      <div className="flex grow h-[calc(100svh_-_72px)]">
        {/* sidebar */}
        <Sidebar sidebarMenuItems={settingsItem} />
        <div className="relative grow h-[inherit] overflow-hidden flex md:pt-4 md:pl-4 md:pb-8 md:pr-8 p-4 bg-sidebar">
          <div className="bg-white overflow-auto w-full rounded-2xl flex">
            {children}
          </div>
          <NotificationComponent />
        </div>
      </div>
    </SidebarProvider>
  );
}
