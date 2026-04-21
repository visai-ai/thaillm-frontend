"use client";

import { useQueryGetChatConversationStats } from "@/hooks/useQueryGetChatConversationStats";
import { useState } from "react";
import AdminChatDashboardHeader from "./AdminChatDashboardHeader";
import ChatStatsTable from "./ChatStatsTable";

export default function ChatDashboardSection() {
  // Initialize with current month's date range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);

    return {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString(),
    };
  };

  const currentMonthRange = getCurrentMonthRange();

  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const [monthStartTime, setMonthStartTime] = useState<string | undefined>(
    currentMonthRange.start,
  );
  const [monthEndTime, setMonthEndTime] = useState<string | undefined>(
    currentMonthRange.end,
  );

  // Use custom date range if provided, otherwise use month range, with fallback to current month
  const effectiveStartTime =
    startTime || monthStartTime || currentMonthRange.start;
  const effectiveEndTime = endTime || monthEndTime || currentMonthRange.end;

  const { data, isLoading, error } = useQueryGetChatConversationStats(
    effectiveStartTime,
    effectiveEndTime,
  );

  const handleDateRangeChange = (
    newStartTime?: string,
    newEndTime?: string,
  ) => {
    setStartTime(newStartTime);
    setEndTime(newEndTime);
  };

  const handleMonthChange = (newStartTime?: string, newEndTime?: string) => {
    setMonthStartTime(newStartTime);
    setMonthEndTime(newEndTime);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p className="text-lg font-medium">เกิดข้อผิดพลาด</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <>
      <AdminChatDashboardHeader
        onDateRangeChange={handleDateRangeChange}
        onMonthChange={handleMonthChange}
      />
      <ChatStatsTable data={data} isLoading={isLoading} />
    </>
  );
}
