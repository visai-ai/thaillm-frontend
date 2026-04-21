import { Button } from "@/components/ui/button";
import { ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  columnId: string;
  currentSort: { id: string; desc: boolean } | null;
  onSort: (columnId: string, desc: boolean | null) => void;
  className?: string;
}

export const SortableHeader = ({
  label,
  columnId,
  currentSort,
  onSort,
  className,
}: SortableHeaderProps) => {
  const isCurrentSort = currentSort?.id === columnId;
  const isDesc = currentSort?.desc === true;

  const handleClick = () => {
    if (isCurrentSort) {
      if (isDesc) {
        // Currently desc -> change to asc
        onSort(columnId, false);
      } else {
        // Currently asc -> remove sort
        onSort(columnId, null);
      }
    } else {
      // No sort -> start with desc
      onSort(columnId, true);
    }
  };

  const getSortIcon = () => {
    if (!isCurrentSort) {
      return (
        <div className="w-4 h-4 opacity-0 group-hover:opacity-30 transition-opacity">
          <ArrowUpIcon className="text-gray-400 rotate-180" />
        </div>
      );
    }

    if (isDesc) {
      return <ArrowUpIcon className="transition-transform rotate-180" />;
    }

    return <ArrowUpIcon className="transition-transform" />;
  };

  return (
    <Button
      variant="link"
      onClick={handleClick}
      className={cn(
        "text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1 group cursor-pointer",
        className,
      )}
    >
      {label}
      {getSortIcon()}
    </Button>
  );
};
