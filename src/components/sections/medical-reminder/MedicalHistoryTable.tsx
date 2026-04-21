"use client";

import { useEffect } from "react";
import { GetMedicalRemindersSchedulesHistoryResponse } from "@/@types/backend-api";

import { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, LucideIcon, Check, RotateCw, X } from "lucide-react";
import { Badge, BadgeVariant } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import {
  formatThaiDate,
  formatThaiDateWithTime,
  formatTime,
} from "@/utils/time";
import {
  MEAL_PERIOD,
  MEAL_TIMING,
  MealPeriodKey,
  MealTimingKey,
} from "@/constant/medicalReminder";

type GetMedicalRemindersSchedulesHistoryList =
  GetMedicalRemindersSchedulesHistoryResponse["list"];
type GetMedicalRemindersSchedulesHistoryItem =
  GetMedicalRemindersSchedulesHistoryList[number];

type TableSorting = { id: "updatedAt"; desc: boolean } | null;

const MedicalHistoryTable = ({
  scheduleHistory,
  pagination,
  setPagination,
  sorting,
  setSorting,
}: {
  scheduleHistory: GetMedicalRemindersSchedulesHistoryResponse;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  setPagination: React.Dispatch<
    React.SetStateAction<{
      pageIndex: number;
      pageSize: number;
    }>
  >;
  sorting: TableSorting;
  setSorting: React.Dispatch<React.SetStateAction<TableSorting>>;
}) => {
  const pageIndex = scheduleHistory?.pagination?.page ?? 0;

  const historyList: GetMedicalRemindersSchedulesHistoryList =
    scheduleHistory?.list || [];

  useEffect(() => {
    if (!scheduleHistory.pagination?.page) {
      return;
    }
    const nextPageIndex = pageIndex - 1;
    setPagination((prev) => {
      if (prev.pageIndex === nextPageIndex) {
        return prev;
      }
      return {
        ...prev,
        pageIndex: nextPageIndex,
      };
    });
  }, [pageIndex, scheduleHistory.pagination?.page, setPagination]);

  const sortingState: SortingState = sorting ? [sorting] : [];
  const handleSortingChange: React.Dispatch<
    React.SetStateAction<SortingState>
  > = (newSorting) => {
    const resolvedSorting =
      typeof newSorting === "function" ? newSorting(sortingState) : newSorting;
    if (resolvedSorting && resolvedSorting.length > 0) {
      const [nextSorting] = resolvedSorting;
      setSorting({
        id: "updatedAt",
        desc: nextSorting.desc ?? false,
      });
      return;
    }
    setSorting(null);
  };

  const columns: ColumnDef<GetMedicalRemindersSchedulesHistoryItem>[] = [
    {
      accessorKey: "medicalName",
      header: "ชื่อยา",
      cell: ({ row }) => {
        const name = row.original.medicalName;
        return (
          <div className="py-4 md:px-6 px-4 text-sm font-medium text-gray-900">
            {name}
          </div>
        );
      },
    },
    {
      accessorKey: "activity",
      header: "กิจกรรม",
      size: 120,
      maxSize: 120,
      cell: ({ row }) => {
        return (
          <SchedulesTimeStatusLabel
            scheduleTimeStatus={row.original.scheduleTimeStatus}
          />
        );
      },
    },
    {
      accessorKey: "schedule",
      header: "เวลาทาน/ใช้ยา",
      cell: ({ row }) => {
        const mealTiming =
          MEAL_TIMING[row.original.mealTiming as MealTimingKey];
        const mealPeriod =
          MEAL_PERIOD[row.original.mealPeriod as MealPeriodKey];
        return (
          <div className="py-4 md:px-6 px-4 flex flex-col text-sm">
            <span className="text-gray-900 font-medium">{mealTiming}</span>
            <span className="text-gray-600">{mealPeriod}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => {
        const sortedState = column.getIsSorted();
        const isAscOrder = sortedState === "asc";
        return (
          <Button
            variant="link"
            onClick={() => column.toggleSorting(isAscOrder)}
            className="text-gray-600 hover:text-gray-700 font-medium"
          >
            วันที่ เวลา
            <ArrowUpIcon
              className={cn(
                "transition-transform",
                isAscOrder ? "rotate-180" : "",
                sortedState ? "opacity-100" : "opacity-50",
              )}
            />
          </Button>
        );
      },
      cell: ({ row }) => {
        const updatedTime = new Date(row.original.updatedAt);
        return (
          <div className="py-4 md:px-6 px-4 flex flex-col text-sm">
            <div className="text-gray-900 font-medium">
              {formatThaiDate(updatedTime, { dateStyle: "long" })}
            </div>
            <span className="text-gray-600">{formatTime(updatedTime)}</span>
          </div>
        );
      },
    },
  ];
  return (
    <div className="flex w-full overflow-hidden">
      <DataTable
        data={historyList}
        columns={columns}
        sortInitialState={sortingState}
        onSortingChange={handleSortingChange}
        pagination={pagination}
        setPagination={setPagination}
        totalPage={scheduleHistory?.pagination?.totalPages || 0}
      />
    </div>
  );
};

const SchedulesTimeStatusLabel = ({
  scheduleTimeStatus,
}: {
  scheduleTimeStatus: GetMedicalRemindersSchedulesHistoryItem["scheduleTimeStatus"];
}) => {
  let Icon: LucideIcon | null = null;
  let label: string = "";
  let variant: BadgeVariant = "secondary";
  switch (scheduleTimeStatus) {
    case "accepted":
      Icon = Check;
      label = "ทานยา";
      variant = "success";
      break;
    case "skipped":
      Icon = X;
      label = "ข้าม";
      variant = "warning";
      break;
    case "postponed":
      Icon = RotateCw;
      label = "เลื่อน";
      variant = "secondary";
      break;
  }
  return (
    <div className="py-4 md:px-6 px-4 flex justify-start">
      {label && Icon && (
        <Badge variant={variant}>
          <Icon className="size-3" />
          {label}
        </Badge>
      )}
    </div>
  );
};

export default MedicalHistoryTable;
