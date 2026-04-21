"use client";

import DateRangePicker from "@/components/common/DateRangePicker";
import MonthSelector from "@/components/common/MonthSelector";
import { Button } from "@/components/ui/button";
import { formatLocaleDate } from "@/utils/time";
import { Calendar } from "lucide-react";
import { useState } from "react";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function AdminChatDashboardHeader({
  onDateRangeChange,
  onMonthChange,
}: {
  onDateRangeChange: (startTime?: string, endTime?: string) => void;
  onMonthChange: (startTime?: string, endTime?: string) => void;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showCustomRange, setShowCustomRange] = useState(false);

  const handleMonthChange = (month: Date) => {
    setSelectedMonth(month);
    setShowCustomRange(false);

    // Clear custom date range when month changes
    setDateRange({ from: undefined, to: undefined });
    onDateRangeChange(undefined, undefined);

    // Calculate start and end of the month
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);

    onMonthChange(startOfMonth.toISOString(), endOfMonth.toISOString());
  };

  const handleRangeChange = (range: DateRange) => {
    setDateRange(range);

    // Convert dates to ISO strings with proper time settings
    let startTime: string | undefined;
    let endTime: string | undefined;

    if (range.from) {
      // Set start time to 00:00:00 of the selected day
      const startDate = new Date(range.from);
      startDate.setHours(0, 0, 0, 0);
      startTime = startDate.toISOString();
    }

    if (range.to) {
      // Set end time to 00:00:00 of the next day after the selected end date
      const endDate = new Date(range.to);
      endDate.setDate(endDate.getDate() + 1); // Add one day
      endDate.setHours(0, 0, 0, 0);
      endTime = endDate.toISOString();
    }

    onDateRangeChange(startTime, endTime);
  };

  const handleClearFilter = () => {
    setDateRange({ from: undefined, to: undefined });
    setShowCustomRange(false);
    setSelectedMonth(new Date());
    onDateRangeChange(undefined, undefined);
    onMonthChange(undefined, undefined);
  };

  const toggleCustomRange = () => {
    setShowCustomRange(!showCustomRange);
    if (!showCustomRange) {
      // Clear custom range when hiding it
      setDateRange({ from: undefined, to: undefined });
      onDateRangeChange(undefined, undefined);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <header className="flex flex-col gap-1 grow">
          <h1 className="text-3xl text-gray-900 font-semibold">แดชบอร์ดแชท</h1>
          <h4 className="text-gray-600">สถิติการใช้งานแชทตามประเภทและวันที่</h4>
        </header>
      </div>

      {/* Month Selector - Primary Filter */}
      <div className="flex items-center gap-2 justify-center">
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          showCustomRange={showCustomRange}
          onToggleCustomRange={toggleCustomRange}
        />
      </div>

      {/* Custom Date Range - Optional Override */}
      {showCustomRange && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              กำหนดช่วงวันที่เอง
            </label>
            <Button
              onClick={handleClearFilter}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              ล้าง
            </Button>
          </div>
          <DateRangePicker
            selectedRange={dateRange}
            onRangeChange={handleRangeChange}
            placeholder="เลือกช่วงวันที่"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2 justify-start text-left w-full"
            >
              <Calendar className="w-4 h-4" />
              {dateRange.from ? (
                <span>
                  {dateRange.to
                    ? `${formatLocaleDate(dateRange.from)} - ${formatLocaleDate(dateRange.to)}`
                    : formatLocaleDate(dateRange.from)}
                </span>
              ) : (
                <span>เลือกช่วงวันที่</span>
              )}
            </Button>
          </DateRangePicker>
        </div>
      )}
    </div>
  );
}
