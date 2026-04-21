"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  className?: string;
  showCustomRange?: boolean;
  onToggleCustomRange?: () => void;
}

const MonthSelector = ({
  selectedMonth,
  onMonthChange,
  className = "",
  showCustomRange = false,
  onToggleCustomRange,
}: MonthSelectorProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedMonth);

  useEffect(() => {
    setCurrentMonth(selectedMonth);
  }, [selectedMonth]);

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    onMonthChange(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    onMonthChange(newMonth);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now);
    onMonthChange(now);
  };

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(year));
    setCurrentMonth(newMonth);
    onMonthChange(newMonth);
  };

  const handleMonthChange = (month: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(parseInt(month));
    setCurrentMonth(newMonth);
    onMonthChange(newMonth);
  };

  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();
  const currentYearIndex = new Date().getFullYear();

  // Generate year options
  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => currentYearIndex - 4 + i,
  );

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: new Date(2024, i).toLocaleDateString("th-TH", { month: "long" }),
  }));

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 flex-col sm:flex-row ${className}`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="p-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-26 sm:w-32 justify-between text-xs sm:text-base"
              >
                {monthOptions[currentMonthIndex]?.label}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {monthOptions.map((month) => (
                <DropdownMenuItem
                  key={month.value}
                  onClick={() => handleMonthChange(month.value)}
                >
                  {month.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-20 sm:w-22 justify-between text-xs sm:text-base"
              >
                {currentYear}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {yearOptions.map((year) => (
                <DropdownMenuItem
                  key={year}
                  onClick={() => handleYearChange(year.toString())}
                >
                  {year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="p-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={goToCurrentMonth}
          className="text-xs"
        >
          เดือนนี้
        </Button>

        {onToggleCustomRange && (
          <Button
            onClick={onToggleCustomRange}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 text-xs"
          >
            {showCustomRange ? "ซ่อนกำหนดเอง" : "กำหนเอง"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default MonthSelector;
