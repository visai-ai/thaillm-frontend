"use client";

import dynamic from "next/dynamic";
import { useState, useId, useEffect } from "react";
// import { Calendar } from "@/components/ui/calendar";
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

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((cal) => cal.Calendar),
  {
    loading: () => <div className="w-75 h-75 bg-gray-100 animate-pulse"></div>,
    ssr: false,
  },
);

import type { CalendarProps } from "@/components/ui/calendar";

type SingleDatePickerProps = Omit<
  CalendarProps,
  "mode" | "selected" | "onSelect"
> & {
  selectedDate?: Date;
  handleSetSelectedDate?: (date: Date | undefined) => void;
  children: React.ReactNode;
};

const DatePicker = ({
  children,
  selectedDate,
  handleSetSelectedDate,
  ...props
}: SingleDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setDate(selectedDate || new Date());
  }, [selectedDate]);

  const handleSelect = (selected: Date | undefined) => {
    setDate(selected);
  };

  const handleConfirmation = () => {
    handleSetSelectedDate?.(date);
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
              mode="single"
              selected={date}
              onSelect={handleSelect}
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

export default DatePicker;
