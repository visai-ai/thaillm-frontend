"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((cal) => cal.Calendar),
  {
    loading: () => <div className="w-75 h-75 bg-gray-100 animate-pulse"></div>,
    ssr: false,
  },
);

import type { CalendarProps } from "@/components/ui/calendar";
import type { DateRange as ReactDayPickerDateRange } from "react-day-picker";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type DateRangePickerProps = Omit<
  CalendarProps,
  "mode" | "selected" | "onSelect"
> & {
  selectedRange?: DateRange;
  onRangeChange?: (range: DateRange) => void;
  children: React.ReactNode;
  placeholder?: string;
};

const DateRangePicker = ({
  children,
  selectedRange,
  onRangeChange,
  placeholder = "เลือกช่วงวันที่",
  ...props
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    setRange(selectedRange || { from: undefined, to: undefined });
  }, [selectedRange]);

  const handleSelect = (selected: ReactDayPickerDateRange | undefined) => {
    if (selected) {
      setRange({
        from: selected.from,
        to: selected.to,
      });
    }
  };

  const handleConfirmation = () => {
    onRangeChange?.(range);
    onClose();
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent showCloseButton={false} className="!p-0 !gap-0">
          <DialogHeader className="h-0">
            <DialogTitle />
            <DialogDescription />
          </DialogHeader>
          <DialogBody className="!p-0">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              {...props}
            />
          </DialogBody>
          <DialogFooter className="p-4 border-t border-gray-200">
            <Button
              variant="secondary"
              className="grow basis-0"
              size="sm"
              onClick={onClose}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              className="grow basis-0"
              onClick={handleConfirmation}
              size="sm"
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DateRangePicker;
