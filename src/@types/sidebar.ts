import { LucideIcon } from "lucide-react";

export type SidebarItem = {
  title: string;
  path?: string;
  icon?: LucideIcon;
  children?: SidebarItem[];
  onClick?: () => void;
  className?: string;
  linkClassName?: string;
  rightComponent?: React.ReactNode;
};
