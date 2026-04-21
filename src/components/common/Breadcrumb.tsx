import Link from "next/link";
import { cn } from "@/lib/utils";

import { ChevronRightIcon } from "lucide-react";

export type BreadcrumbProps = {
  historyPageList: { name?: string; path: string; icon?: React.ReactNode }[];
  currentPageName: string;
  loadingCurrentPageName?: boolean;
};

const Breadcrumb = ({
  historyPageList,
  currentPageName,
  loadingCurrentPageName = false,
}: BreadcrumbProps) => {
  return (
    <div className={cn("flex flex-row items-center w-full gap-3.5 text-sm")}>
      {historyPageList.map((historyPage, index) => {
        return (
          <div
            key={index}
            className="flex flex-row gap-3.5 items-center overflow-hidden min-w-12"
          >
            <Link
              key={index}
              href={historyPage.path}
              className="text-gray-600 truncate flex items-center gap-1.5"
            >
              {historyPage.icon}
              {historyPage.name}
            </Link>
            <ChevronRightIcon className="text-gray-300 size-4 shrink-0" />
          </div>
        );
      })}
      {loadingCurrentPageName ? (
        <div className="w-20 bg-gray-100 rounded-md animate-pulse h-7"></div>
      ) : (
        <span className="px-2 py-1 font-semibold text-gray-700 rounded-md bg-gray-50 truncate">
          {currentPageName}
        </span>
      )}
    </div>
  );
};

export default Breadcrumb;
