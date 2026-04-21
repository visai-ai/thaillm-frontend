"use client";

import { GetChatConversationStatsResponse } from "@/@types/backend-api";
import { DataTable } from "@/components/common/DataTable";
import { LoadingSpinner } from "@/components/common/Loading";
import { ColumnDef } from "@tanstack/react-table";
import { BarChart3 } from "lucide-react";
import { useMemo } from "react";

type ChatStatsRow = {
  date: string;
  [key: string]: string | number;
};

export default function ChatStatsTable({
  data,
  isLoading,
}: {
  data?: GetChatConversationStatsResponse;
  isLoading: boolean;
}) {
  // Predefined standard categories that should always be displayed
  const standardCategories = useMemo(
    () => [
      "prescreening",
      "medicine_scheduling",
      "medical_appointment",
      "information_query",
      "emergency_contacts",
    ],
    [],
  );

  const columns = useMemo<ColumnDef<ChatStatsRow>[]>(() => {
    if (!data?.data) return [];

    // Get all unique categories from the data, including null values
    const dataCategories = Array.from(
      new Set(data.data.map((item) => item.category)),
    );

    // Combine standard categories with any additional categories from data
    const allCategories = Array.from(
      new Set([...standardCategories, ...dataCategories]),
    );

    const baseColumns: ColumnDef<ChatStatsRow>[] = [
      {
        accessorKey: "date",
        header: "วันที่",
        cell: ({ getValue }) => {
          const date = getValue() as string;
          const isSummaryRow = date === "รวมทั้งหมด";

          return (
            <div
              className={`py-2 px-4 font-medium ${isSummaryRow ? "text-gray-900 font-bold bg-gray-50" : "text-gray-900"}`}
            >
              {isSummaryRow
                ? date
                : new Date(date).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
            </div>
          );
        },
        size: 60,
      },
    ];

    // Add total column
    baseColumns.push({
      accessorKey: "total",
      header: "รวมทั้งหมด",
      cell: ({ row }) => {
        const isSummaryRow = row.original.date === "รวมทั้งหมด";
        const total = isSummaryRow
          ? row.original.total // For summary row, use the totalConversations value directly
          : Object.values(row.original)
              .filter((value) => typeof value === "number")
              .reduce((sum, value) => sum + (value as number), 0);
        return (
          <div
            className={`py-2 px-4 text-center font-semibold ${isSummaryRow ? "text-gray-900 bg-gray-50" : "text-gray-900"}`}
          >
            {total}
          </div>
        );
      },
      size: 60,
      meta: {
        className: "text-center",
      },
    });

    // Add columns for each category
    allCategories.forEach((category) => {
      const displayName = category || "uncategorized";
      const thaiName = category
        ? category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        : "ไม่ระบุประเภท";

      baseColumns.push({
        accessorKey: displayName,
        header: thaiName,
        cell: ({ getValue, row }) => {
          const count = getValue() as number;
          const isSummaryRow = row.original.date === "รวมทั้งหมด";
          return (
            <div
              className={`py-2 px-4 text-center font-medium ${isSummaryRow ? "text-gray-900 bg-gray-50 font-semibold" : "text-gray-700"}`}
            >
              {count || 0}
            </div>
          );
        },
        size: 60,
        meta: {
          className: "text-center",
        },
      });
    });

    return baseColumns;
  }, [data?.data, standardCategories]);

  const tableData = useMemo<ChatStatsRow[]>(() => {
    if (!data?.data) return [];

    // Group data by date
    const groupedByDate = data.data.reduce(
      (acc, item) => {
        const date = item.date || "unknown";
        if (!acc[date]) {
          acc[date] = { date };
          // Initialize all standard categories with 0
          standardCategories.forEach((cat) => {
            acc[date][cat] = 0;
          });
        }
        const categoryKey = item.category || "uncategorized";
        acc[date][categoryKey] = item.count;
        return acc;
      },
      {} as Record<string, ChatStatsRow>,
    );

    // Ensure all rows have all standard categories initialized
    Object.values(groupedByDate).forEach((row) => {
      standardCategories.forEach((cat) => {
        if (row[cat] === undefined) {
          row[cat] = 0;
        }
      });
    });

    // Convert to array and sort by date
    const sortedData = Object.values(groupedByDate).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Add summary row if summary data exists
    if (data.summary) {
      const summaryRow: ChatStatsRow = {
        date: "รวมทั้งหมด",
        total: data.summary.totalConversations,
      };

      // Add category counts from summary
      Object.entries(data.summary.categories).forEach(([category, count]) => {
        summaryRow[category] = count;
      });

      // Ensure all standard categories are included in summary row
      standardCategories.forEach((cat) => {
        if (summaryRow[cat] === undefined) {
          summaryRow[cat] = 0;
        }
      });

      sortedData.push(summaryRow);
    }

    return sortedData;
  }, [data?.data, data?.summary, standardCategories]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <BarChart3 className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">ไม่มีข้อมูล</p>
        <p className="text-sm">ไม่พบการใช้งานในช่วงเวลาที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-hidden w-full">
      <DataTable
        columns={columns}
        data={tableData}
        disablePagination={true}
        className="border border-gray-200 rounded-lg"
        headClassName="px-4!"
      />
    </div>
  );
}
