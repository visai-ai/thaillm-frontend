"use client";

import React, { useState } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import {
  DayPicker,
  getDefaultClassNames,
  CalendarDay,
  Modifiers,
} from "react-day-picker";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/common/CustomInput";

import { cn } from "@/lib/utils";
import { formatThaiDate, isSameDay } from "@/utils/time";

import { th } from "react-day-picker/locale";

type AdditionalProps = {
  displayOnly?: boolean;
  highlightedDate?: Date[];
  highlightToday?: boolean;
  showCurrentDateLabel?: boolean;
};

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
} & AdditionalProps;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "link",
  displayOnly = false,
  showCurrentDateLabel = false,
  formatters,
  components,
  disabled,
  highlightedDate,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  // const { selected } = props;
  const selectedAny = (props as any)?.selected;
  const onSelectAny = (props as any)?.onSelect as
    | ((value: any) => void)
    | undefined;
  const selectedDate = selectedAny instanceof Date ? selectedAny : undefined;

  return (
    <>
      <DayPicker
        locale={th}
        showOutsideDays={showOutsideDays}
        className={cn(
          "bg-background group/calendar md:px-6 md:py-4 p-2 sm:p-4 [--cell-size:--spacing(10)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
          String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
          String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
          className,
        )}
        captionLayout={captionLayout}
        formatters={{
          formatMonthDropdown: (date) =>
            date.toLocaleString("default", { month: "short" }),
          ...formatters,
        }}
        classNames={{
          root: cn("w-fit", defaultClassNames.root),
          months: cn(
            "flex gap-4 flex-col md:flex-row relative",
            defaultClassNames.months,
          ),
          month: cn(
            "flex flex-col w-full",
            defaultClassNames.month,
            showCurrentDateLabel ? "gap-12" : "gap-3",
          ),
          nav: cn(
            "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
            defaultClassNames.nav,
          ),
          button_previous: cn(
            buttonVariants({ variant: buttonVariant }),
            "size-(--cell-size) p-0 select-none",
            defaultClassNames.button_previous,
            !displayOnly && " aria-disabled:opacity-50",
          ),
          button_next: cn(
            buttonVariants({ variant: buttonVariant }),
            "size-(--cell-size) p-0 select-none",
            defaultClassNames.button_next,
            !displayOnly && " aria-disabled:opacity-50",
          ),
          month_caption: cn(
            "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
            defaultClassNames.month_caption,
          ),
          dropdowns: cn(
            "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
            defaultClassNames.dropdowns,
          ),
          dropdown_root: cn(
            "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
            defaultClassNames.dropdown_root,
          ),
          dropdown: cn(
            "absolute inset-0 opacity-0",
            defaultClassNames.dropdown,
          ),
          caption_label: cn(
            "select-none font-medium",
            captionLayout === "label"
              ? "text-sm"
              : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
            defaultClassNames.caption_label,
          ),
          table: "w-full border-collapse",
          weekdays: cn("flex", defaultClassNames.weekdays),
          weekday: cn(
            "flex items-center justify-center text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] w-10 h-10 select-none",
            defaultClassNames.weekday,
          ),
          week: cn("flex w-full", defaultClassNames.week),
          week_number_header: cn(
            "select-none w-(--cell-size)",
            defaultClassNames.week_number_header,
          ),
          week_number: cn(
            "text-[0.8rem] select-none text-muted-foreground",
            defaultClassNames.week_number,
          ),
          day: cn(
            "group relative w-full h-full p-0 text-center group/day aspect-square select-none",
            defaultClassNames.day,
            "data-[selected-single=false][&:first-child[data-selected=true]_button]:rounded-l-md data-[selected-single=false][&:last-child[data-selected=true]_button]:rounded-r-md ",
          ),
          range_start: cn(
            "rounded-l-md bg-accent",
            defaultClassNames.range_start,
          ),
          range_middle: cn("rounded-none", defaultClassNames.range_middle),
          range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
          today: cn(
            "color-rainbow-gradient text-accent-foreground rounded-md data-[selected=true]:rounded-none",
            defaultClassNames.today,
          ),
          outside: cn(
            "text-muted-foreground aria-selected:text-muted-foreground",
            defaultClassNames.outside,
          ),
          disabled: cn(
            "text-muted-foreground",
            defaultClassNames.disabled,
            !displayOnly && "opacity-50",
          ),
          hidden: cn("invisible", defaultClassNames.hidden),
          ...classNames,
        }}
        components={{
          Root: ({ className, rootRef, ...props }) => {
            return (
              <>
                <div
                  data-slot="calendar"
                  ref={rootRef}
                  className={cn(className)}
                  {...props}
                />
                {showCurrentDateLabel && (
                  <div className="absolute top-14">
                    <div className="md:px-6 px-4 flex items-center gap-3">
                      <Input
                        type="text"
                        value={selectedDate ? formatThaiDate(selectedDate) : ""}
                        readOnly
                        className="py-2"
                        containerClassName="grow"
                      />
                      <Button
                        variant={"secondary"}
                        size="sm"
                        className="py-2.5 px-3.5"
                        onClick={() => onSelectAny?.(new Date())}
                      >
                        Today
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          },
          Chevron: ({ className, orientation, ...props }) => {
            if (orientation === "left") {
              return (
                <ChevronLeftIcon
                  className={cn("size-5", className)}
                  {...props}
                />
              );
            }

            if (orientation === "right") {
              return (
                <ChevronRightIcon
                  className={cn("size-5", className)}
                  {...props}
                />
              );
            }

            return (
              <ChevronDownIcon className={cn("size-5", className)} {...props} />
            );
          },
          DayButton: ({
            day,
            modifiers,
            ...props
          }: {
            day: CalendarDay;
            modifiers: Modifiers;
          } & React.HTMLAttributes<HTMLButtonElement>) => {
            return (
              <CalendarDayButton
                day={day}
                modifiers={modifiers}
                displayOnly={displayOnly}
                highlightedDate={highlightedDate}
                {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
              />
            );
          },
          WeekNumber: ({ children, ...props }) => {
            return (
              <td {...props}>
                <div className="group flex size-(--cell-size) items-center justify-center text-center">
                  {children}
                </div>
              </td>
            );
          },
          ...components,
        }}
        disabled={disabled || displayOnly}
        {...props}
      />
    </>
  );
}

export function CalendarDayButton({
  className,
  day,
  modifiers,
  displayOnly,
  highlightedDate,
  highlightToday = true,
  ...props
}: any & AdditionalProps) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isHighlighted = highlightedDate?.some((date: Date) =>
    isSameDay(date, day.date),
  );

  return (
    <div className="relative">
      <Button
        ref={ref}
        variant="icon"
        size="icon"
        data-day={day.date.toLocaleDateString("en-US")}
        data-selected-single={
          modifiers.selected &&
          !modifiers.range_start &&
          !modifiers.range_end &&
          !modifiers.range_middle
        }
        data-range-start={modifiers.range_start}
        data-range-end={modifiers.range_end}
        data-range-middle={modifiers.range_middle}
        data-outside={modifiers.outside}
        data-today={modifiers.today}
        className={cn(
          "data-[selected-single=true]:bg-primary-600 data-[selected-single=true]:hover:bg-primary-600 data-[selected-single=true]:text-white rounded-full data-[selected-single=true]:font-medium data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-(image:--color-rainbow-gradient) data-[range-start=true]:font-medium data-[range-end=true]:bg-(image:--color-rainbow-gradient) data-[range-end=true]:font-medium group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
          defaultClassNames.day,
          className,
          "outline-none data-[outside=true]:text-gray-500 disabled:data-[outside=true]:text-gray-300 focus:ring-0 focus-visible:ring-0 bg-blend-overlay text-gray-700 text-sm rounded-full",
          displayOnly ? " disabled:text-gray-700" : "disabled:text-gray-400",
          highlightToday
            ? "hover:data-[today=true]:bg-(image:--color-rainbow-gradient) data-[today=true]:bg-(image:--color-rainbow-gradient) hover:not-data-[selected-single=true]:not-data-[today=true]:bg-gray-50"
            : "hover:not-data-[selected-single=true]:bg-gray-50",
        )}
        {...props}
      />
      {isHighlighted && (
        <div className="absolute bottom-0 left-1/2 -translate-1/2 w-[5px] h-[5px] rounded-full bg-primary-600"></div>
      )}
    </div>
  );
}
