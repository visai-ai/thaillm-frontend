import { useRef, useState, useEffect, useId } from "react";
import { formatTwoDigit } from "@/utils/time";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PopoverContentProps } from "@/components/ui/popover";

import { Button } from "@/components/ui/button";

export interface Time {
  hour: string;
  minute: string;
}

type TimePickerProps = PopoverContentProps & {
  selectedTime?: Time;
  handleSetSelectedTime?: (time: Time) => void;
  children: React.ReactNode;
  minHour?: number;
  maxHour?: number;
};

const DEFAULT_VALUE = "0";

const TimePicker = ({
  selectedTime,
  handleSetSelectedTime,
  children,
  minHour,
  maxHour,
  ...props
}: TimePickerProps) => {
  const id = useId();
  const [time, setTime] = useState<Time>({
    hour: selectedTime?.hour || "0",
    minute: selectedTime?.minute || "0",
  });
  const [open, setOpen] = useState(false);

  const onClose = () => {
    setOpen(false);
  };

  const handleConfirmation = () => {
    const hour = time.hour === DEFAULT_VALUE ? "00" : time.hour;
    const minute = time.minute === DEFAULT_VALUE ? "00" : time.minute;
    handleSetSelectedTime?.({ hour, minute });
    onClose();
  };

  return (
    <>
      <Popover key={id} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          {...props}
          onWheel={(e) => {
            e.stopPropagation();
          }}
          className="p-0"
        >
          <div className="flex flex-col">
            <TimeSelector
              selectedHour={time?.hour}
              selectedMinute={time?.minute}
              onHourChange={(hour) => {
                setTime({ ...time, hour });
              }}
              onMinuteChange={(minute) => {
                setTime({ ...time, minute });
              }}
              className="py-5 px-6"
              minHour={minHour}
              maxHour={maxHour}
            />
            <div className="p-4 border-t flex items-center gap-3">
              <Button
                type="button"
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
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

interface ScrollableTimeColumnProps {
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  label?: string;
  className?: string;
}

const ScrollableTimeColumn = ({
  values,
  selectedValue,
  onValueChange,
  label,
  className,
}: ScrollableTimeColumnProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 56;
  const visibleItems = 3;
  const containerHeight = visibleItems * itemHeight;

  useEffect(() => {
    const normalizedSelectedValue =
      selectedValue.length === 1 && selectedValue >= "0" && selectedValue <= "9"
        ? `0${selectedValue}`
        : selectedValue;
    const selectedIndex = values.indexOf(normalizedSelectedValue, 120);
    if (scrollRef.current && selectedIndex !== -1) {
      // Calculate scroll position to center the selected item
      const scrollTop = selectedIndex * itemHeight;
      scrollRef.current.scrollTop = scrollTop;
    }
  }, [selectedValue, values, itemHeight]);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const scrollTop = scrollRef.current.scrollTop;
    // Calculate which item is in the center
    const centerIndex = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(centerIndex, values.length - 1));

    if (values[clampedIndex] !== selectedValue) {
      onValueChange(values[clampedIndex]);
    }
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {label && (
        <div className="text-sm font-medium text-muted-foreground mb-2">
          {label}
        </div>
      )}
      <div
        className="relative overflow-hidden rounded-lg bg-white w-full"
        style={{ height: containerHeight }}
      >
        {/* Selection indicator */}
        <div
          className="absolute left-0 right-0 border-y border-gray-200 w-full pointer-events-none z-10"
          style={{
            top: (containerHeight - itemHeight) / 2,
            height: itemHeight,
          }}
        />

        <div
          ref={scrollRef}
          className="overflow-y-auto hide-scrollbar h-full"
          onScroll={handleScroll}
          style={{
            scrollSnapType: "y mandatory",
            paddingTop: (containerHeight - itemHeight) / 2,
            paddingBottom: (containerHeight - itemHeight) / 2,
          }}
        >
          {values.map((value, index) => (
            <div
              key={value + "-" + index}
              className={cn(
                "flex items-center justify-center cursor-pointer transition-all duration-200 select-none",
                "hover:bg-time-picker-hover",
                selectedValue === value
                  ? "text-gray-900 font-semibold"
                  : "text-gray-400",
              )}
              style={{
                height: itemHeight,
                scrollSnapAlign: "center",
              }}
              onClick={() => onValueChange(value)}
            >
              <span className="text-lg font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface TimeSelectorProps {
  selectedHour: string;
  selectedMinute: string;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
  className?: string;
  minHour?: number;
  maxHour?: number;
}

export const TimeSelector = ({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
  className,
  minHour = 0,
  maxHour = 23,
}: TimeSelectorProps) => {
  const start = Math.max(0, Math.min(23, minHour));
  const end = Math.max(0, Math.min(23, maxHour));
  // Generate hours 00-23
  const baseHours = Array.from({ length: end - start + 1 }, (_, i) =>
    formatTwoDigit(i + start),
  );
  const hours = Array(18).fill(baseHours).flat();

  // Generate minutes 00-59
  const baseMinutes = Array.from({ length: 60 }, (_, i) => formatTwoDigit(i));
  const minutes = Array(6).fill(baseMinutes).flat();

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <ScrollableTimeColumn
        values={hours}
        selectedValue={selectedHour}
        onValueChange={onHourChange}
        className="grow items-end"
      />
      <div className="flex items-center justify-center">
        <span className="text-lg text-gray-900">:</span>
      </div>
      <ScrollableTimeColumn
        values={minutes}
        selectedValue={selectedMinute}
        onValueChange={onMinuteChange}
        className="grow items-start"
      />
    </div>
  );
};

export default TimePicker;
