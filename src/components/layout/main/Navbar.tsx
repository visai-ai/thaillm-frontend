"use client";

import { use, useEffect } from "react";
import { usePathname } from "next/navigation";
import ThaillmLogoWhite from "@/../public/images/ThaiLLM-logo-white.webp";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlignLeft, UserIcon, PenIcon, LogOutIcon, Shield } from "lucide-react";
import { getUser } from "@/lib/api/util";

import useAuth, { LOGIN_PAGE_URL } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/useAuthStore";

import { useSidebar } from "@/components/ui/sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLoadingStore } from "@/stores/useLoadingStore";

const Navbar = () => {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const NAVBAR_MENU = [
    {
      label: "ผู้ช่วยสุขภาพ",
      href: "/",
      prefix: "/",
    },
    {
      label: "สำหรับนักพัฒนา",
      href: "/developer/chatbot-arena",
      prefix: "/developer",
    },
  ];

  return (
    <nav className="flex bg-sidebar h-18 w-full py-3 px-3 sm:pl-6 sm:px-8 items-center justify-between border-b border-primary-500">
      <div className="flex items-center gap-4">
        <Link href={`/`}>
          <Image
            alt="BDI Logo"
            src={ThaillmLogoWhite}
            width={32}
            height={32}
            className="w-[32px] min-w-[32px] sm:mr-2"
          />
        </Link>
        <ul className="flex items-center gap-1">
          {NAVBAR_MENU.map((menu, index) => {
            const isActive =
              menu.prefix === "/"
                ? !pathname.startsWith("/developer")
                : pathname.startsWith(menu.prefix);

            return (
              <li key={index}>
                <Link
                  href={menu.href}
                  className={cn(
                    "rounded-md py-2 px-2 sm:px-3 font-semibold text-center text-sm sm:text-base truncate",
                    isActive
                      ? "text-white bg-primary-600"
                      : "text-primary-100 hover:bg-primary-600 hover:text-white",
                  )}
                >
                  {menu.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {isMobile && (
        <SidebarTrigger
          triggerIcon={AlignLeft}
          className="text-sidebar-foreground"
        />
      )}
      {!isMobile && <ProfileMenu />}
    </nav>
  );
};

export const ProfileMenu = ({ children }: { children?: React.ReactNode }) => {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const setLoading = useLoadingStore((state) => state.setLoading);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } finally {
      setLoading(false);
    }
    router.push(LOGIN_PAGE_URL);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="cursor-pointer shrink-0 h-10 w-10 font-medium rounded-full overflow-hidden bg-white flex items-center justify-center text-gray-700">
            {user && user.firstName && user.lastName ? (
              <>
                {user.firstName[0]?.toUpperCase()}
                {user.lastName[0]?.toUpperCase()}
              </>
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
          </div>
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-80 p-0">
        <div className="flex flex-col space-x-3">
          {user && (
            <div className="flex flex-col space-y-1 border-b border-gray-200 pb-3 px-4 pt-4">
              <h4 className="leading-none font-medium">
                {user?.firstName} {user?.lastName}
              </h4>
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          )}
          <ul className="w-full p-1.5 text-sm">
            <li>
              <Button
                asChild
                variant={`ghost-secondary`}
                className="w-full text-left justify-start"
              >
                <Link href={`/settings/profile`}>
                  <PenIcon /> แก้ไขโปรไฟล์
                </Link>
              </Button>
            </li>
            {user?.roles?.includes("admin") && (
              <li>
                <Button
                  asChild
                  variant={`ghost-secondary`}
                  className="w-full text-left justify-start"
                >
                  <Link href={`/admin`}>
                    <Shield /> ผู้ดูแลระบบ
                  </Link>
                </Button>
              </li>
            )}
            <li>
              <Button
                variant={`ghost-secondary`}
                className="w-full text-left justify-start"
                onClick={handleLogout}
              >
                <LogOutIcon /> ออกจากระบบ
              </Button>
            </li>
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Navbar;
