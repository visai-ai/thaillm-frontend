"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, LogOutIcon, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuthStore } from "@/stores/useAuthStore";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

import { SidebarItem } from "@/@types/sidebar";
import { ProfileMenu } from "@/components/layout/main/Navbar";

export const MainSidebar = ({
  items,
  label,
  showIconsOnly,
}: {
  items: SidebarItem[];
  label?: string;
  showIconsOnly?: boolean;
}) => {
  const { isMobile } = useSidebar();
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <Sidebar
        className={cn(
          "gap-6 h-[calc(100svh_-_72px)] top-18",
          showIconsOnly ? "md:w-[80px]! w-[60px]! pointer-events-auto!" : "",
        )}
        overlayClassName={showIconsOnly ? "hidden" : ""}
        suppressHydrationWarning={true}
      >
        <SidebarHeader></SidebarHeader>
        <SidebarContentContainer
          items={items}
          label={label}
          showIconsOnly={showIconsOnly}
        />
        <SidebarFooter>
          {isMobile && user && (
            <div
              className={cn(
                showIconsOnly
                  ? "items-center justify-center"
                  : "px-4 items-start justify-between",
                "py-2 border-t border-primary-600 flex gap-3",
              )}
            >
              {/* user info */}
              <section
                className="flex items-center gap-3 overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {/* image */}
                <ProfileMenu>
                  {!showIconsOnly ? (
                    <>
                      {/* info */}
                      <div className="grow flex flex-col overflow-hidden">
                        <div className="text-white text-sm font-semibold truncate">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-primary-400 text-sm truncate">
                          {user.email}
                        </div>
                      </div>
                    </>
                  ) : (
                    <></>
                  )}
                </ProfileMenu>
              </section>
              {!showIconsOnly && (
                <>
                  {/* logout */}
                  <Button
                    variant={"icon"}
                    size={"icon"}
                    className="shrink-0"
                    aria-label="Logout"
                  >
                    <LogOutIcon className="shrink-0 size-5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
};

export const ChildSidebar = ({
  items,
  label,
  showIconsOnly,
  className,
}: {
  items: SidebarItem[];
  label?: string;
  showIconsOnly?: boolean;
  className?: string;
}) => {
  const pathname = usePathname();

  return (
    <>
      <Sidebar
        style={
          {
            "--sidebar": "var(--color-primary-800)",
          } as React.CSSProperties
        }
        className={cn(
          "bg-primary-800 max-w-[calc(100dvw_-_120px)]! h-[calc(100svh_-_72px)] top-18",
          className,
        )}
        overlayClassName={"hidden"}
        suppressHydrationWarning={true}
      >
        <SidebarContent>
          <SidebarContentContainer
            items={items}
            label={label}
            showIconsOnly={showIconsOnly}
          />
        </SidebarContent>
      </Sidebar>
    </>
  );
};

const SidebarContentContainer = ({
  items,
  label,
  showIconsOnly,
}: {
  items: SidebarItem[];
  label?: string;
  showIconsOnly?: boolean;
}) => {
  const pathname = usePathname();

  return (
    <SidebarContent>
      <SidebarGroup className={cn("pt-8", showIconsOnly ? "" : "sm:px-4 px-2")}>
        {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item, index) => (
              <SidebarMenuItem
                key={`${item.title}-${index}`}
                className={cn(
                  showIconsOnly
                    ? "p-0 flex items-center justify-center mx-auto"
                    : "",
                )}
                onClick={item.onClick}
              >
                {item?.children && item.children.length > 0 ? (
                  <>
                    <Collapsible defaultOpen className="group/collapsible">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={
                            item.path === pathname ||
                            pathname.startsWith(item.path || "")
                          }
                          className={cn(
                            showIconsOnly ? "p-3" : "",
                            item.className,
                          )}
                          asChild
                          tooltip={
                            showIconsOnly
                              ? {
                                  children: item.title,
                                  hidden: false,
                                }
                              : {}
                          }
                        >
                          <Link
                            href={item.path || ""}
                            className="flex items-center gap-2 justify-between"
                          >
                            <div className="grow overflow-hidden flex items-center gap-3">
                              {item?.icon && <item.icon className="shrink-0" />}
                              {!showIconsOnly && (
                                <span className="truncate">{item.title}</span>
                              )}
                            </div>
                            {!showIconsOnly && (
                              <ChevronDownIcon
                                className={cn(
                                  "shrink-0 size-5 text-gray-300 transition-all group-data-[state=open]/collapsible:rotate-180",
                                )}
                              />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!showIconsOnly && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((subItem, subItemIndex) => (
                              <SidebarMenuSubItem
                                key={`${subItem.title}-${subItemIndex}`}
                              >
                                <SidebarMenuSubButton
                                  isActive={subItem.path === pathname}
                                  asChild
                                >
                                  <Link href={subItem.path || ""}>
                                    {subItem?.icon && <subItem.icon />}
                                    {!showIconsOnly && (
                                      <span>{subItem.title}</span>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </>
                ) : (
                  <SidebarMenuButton
                    isActive={
                      item.path === pathname ||
                      pathname.startsWith(item.path || "")
                    }
                    className={cn(item.className)}
                    asChild
                    tooltip={
                      showIconsOnly
                        ? {
                            children: item.title,
                            hidden: false,
                          }
                        : {}
                    }
                  >
                    <div>
                      <Link
                        href={item.path || ""}
                        className={cn(
                          showIconsOnly ? "p-3" : "py-2 px-3",
                          "w-full flex gap-3",
                          item.linkClassName,
                        )}
                      >
                        {item?.icon && <item.icon />}
                        {!showIconsOnly && <span>{item.title}</span>}
                      </Link>
                      {item.rightComponent && item.rightComponent}
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
};
