"use client";

import { SidebarProvider } from "@/components/ui/sidebar";

import Navbar from "@/components/layout/main/Navbar";
import NotificationComponent from "@/components/common/Notification";

import { BeakerIcon, FileText, KeyRoundIcon } from "lucide-react";
import { SidebarItem } from "@/@types/sidebar";

import Sidebar from "@/components/layout/main/Sidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const items: SidebarItem[] = [
    {
      title: "Chatbot Arena",
      path: "/developer/chatbot-arena",
      icon: BeakerIcon,
    },
    {
      title: "API Document",
      path: "/developer/api-document",
      icon: FileText,
    },
    {
      title: "API Key",
      path: "/developer/api-key",
      icon: KeyRoundIcon,
    },
  ];

  return (
    <SidebarProvider className="h-svh overflow-hidden flex flex-col">
      {/* navbar */}
      <Navbar />
      <div className="flex grow h-[calc(100svh_-_72px)]">
        {/* sidebar */}
        <Sidebar sidebarMenuItems={items} />
        <div className="relative grow h-[inherit] overflow-hidden flex md:pt-4 md:pl-4 md:pb-8 md:pr-8 p-4 bg-sidebar">
          <div className="bg-white overflow-auto w-full rounded-2xl flex z-0">
            {children}
          </div>
          <NotificationComponent />
        </div>
      </div>
    </SidebarProvider>
  );
}
