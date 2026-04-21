"use client";

import { SidebarItem } from "@/@types/sidebar";

import {
  ChildSidebar,
  MainSidebar,
} from "@/components/layout/main/CustomSidebar";

import { cn } from "@/lib/utils";

export const Sidebar = ({
  sidebarMenuItems,
  childSidebarMenuItems,
  isChildSidebarLoading,
}: {
  sidebarMenuItems?: SidebarItem[];
  childSidebarMenuItems?: SidebarItem[];
  isChildSidebarLoading?: boolean;
}) => {
  const hasChildSidebar =
    (childSidebarMenuItems && childSidebarMenuItems?.length > 0) ||
    isChildSidebarLoading;

  if (!sidebarMenuItems) {
    return null;
  }

  return (
    <>
      <MainSidebar items={sidebarMenuItems} showIconsOnly={hasChildSidebar} />
      {hasChildSidebar && (
        <MenuSidebar
          items={childSidebarMenuItems || []}
          className="md:left-[80px] left-[60px]"
        />
      )}
    </>
  );
};

export const MenuSidebar = ({
  items,
  className,
}: {
  items: SidebarItem[];
  className?: string;
}) => {
  return (
    <ChildSidebar items={items} label="แชทบอท" className={cn(className)} />
  );
};

export default Sidebar;
