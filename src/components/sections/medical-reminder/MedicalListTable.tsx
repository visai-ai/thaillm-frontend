"use client";

import { cn } from "@/lib/utils";
import { GetMedicalRemindersSchedulesResponse } from "@/@types/backend-api";
import { MEAL_TIMING } from "@/constant/medicalReminder";
import { MealTimingKey } from "@/constant/medicalReminder";
import dayjs from "dayjs";
import "dayjs/locale/th";
import buddhistEra from "dayjs/plugin/buddhistEra";
import {
  ColumnDef,
  Getter,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import {
  MoreVerticalIcon,
  CheckIcon,
  HelpCircleIcon,
  PenIcon,
  TrashIcon,
} from "lucide-react";

dayjs.extend(buddhistEra);

export type MedicalReminderSchedule =
  GetMedicalRemindersSchedulesResponse["list"];

export type MedicalReminderScheduleItem = MedicalReminderSchedule[number];
export type MedicalReminderScheduleTimes = NonNullable<
  MedicalReminderScheduleItem["medicalReminderScheduleTimes"]
>[number];

const MealTimingLabel = ({
  medicalReminderScheduleTimes,
  mealPeriodColumn,
  mealTiming,
  isInactive = false,
}: {
  medicalReminderScheduleTimes: MedicalReminderScheduleItem["medicalReminderScheduleTimes"];
  mealPeriodColumn: MedicalReminderScheduleTimes["mealPeriod"];
  mealTiming: MedicalReminderScheduleItem["mealTiming"];
  isInactive?: boolean;
}) => {
  let badgeVariant: BadgeVariant = "success";
  const schedule = medicalReminderScheduleTimes?.find(
    (m: any) => m.mealPeriod === mealPeriodColumn,
  );

  if (!schedule) return null;
  return (
    <div
      className={cn(
        "flex justify-center",
        isInactive && "opacity-50 bg-gray-25",
      )}
    >
      <Badge variant={badgeVariant} className={cn("py-0.5 px-1.5")}>
        {MEAL_TIMING[mealTiming as MealTimingKey]}
      </Badge>
    </div>
  );
};

export const MedicalListTable = ({
  data,
  onEdit,
  onDelete,
}: {
  data: MedicalReminderSchedule;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => {
  const columns: ColumnDef<MedicalReminderScheduleItem>[] = [
    {
      accessorKey: "name",
      header: "",
      minSize: 80,
      cell: ({ row }) => {
        const mealTimingLabel =
          MEAL_TIMING[row.original.mealTiming as MealTimingKey];
        const recommendation = row.original?.recommendation || [];
        const formattedRecommendation = recommendation.map((recommend) => {
          if (recommend.hasInput) {
            return `${recommend.label} ${recommend?.inputValue || "-"} ${
              recommend?.unit || ""
            }`;
          }
          return recommend.label;
        });
        return (
          <div className="flex flex-col bg-gray-50 text-sm">
            <div className="font-medium text-gray-900 flex items-start gap-0.5 truncate">
              {row.original.medicalName}

              {recommendation.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircleIcon className="mt-0.5 size-3.5 shrink-0 text-gray-400 hover:text-gray-500 data-[state=open]:text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent showArrow={false} className="bg-white">
                    <div className="text-xs flex flex-col gap-1">
                      <div className="text-gray-700 font-semibold">
                        ข้อแนะนำการใช้งาน
                      </div>
                      <p className="whitespace-pre-line">
                        {formattedRecommendation.join("\n")}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <span className="text-gray-600">{mealTimingLabel}</span>
            <span className="text-gray-600 text-xs">
              {row.original.startDate
                ? dayjs(row.original.startDate)
                    .locale("th-TH")
                    .format("D MMM BB")
                : ""}
              {row.original.endDate && " - "}
              {row.original.endDate
                ? dayjs(row.original.endDate).locale("th-TH").format("D MMM BB")
                : ""}
            </span>
          </div>
        );
      },
    },
    // อาหารเช้า
    {
      accessorKey: "breakfast",
      header: () => <div className="text-center">อาหารเช้า</div>,
      size: 120,
      id: "breakfast",
      cell: ({ row }) => {
        return (
          <MealTimingLabel
            medicalReminderScheduleTimes={
              row.original.medicalReminderScheduleTimes
            }
            mealPeriodColumn="breakfast"
            mealTiming={row.original.mealTiming}
            isInactive={row.original.status === "inactive"}
          />
        );
      },
    },
    // อาหารกลางวัน
    {
      accessorKey: "lunch",
      header: () => <div className="text-center">อาหารกลางวัน</div>,
      size: 120,
      id: "lunch",
      cell: ({ row }) => {
        return (
          <MealTimingLabel
            medicalReminderScheduleTimes={
              row.original.medicalReminderScheduleTimes
            }
            mealPeriodColumn="lunch"
            mealTiming={row.original.mealTiming}
            isInactive={row.original.status === "inactive"}
          />
        );
      },
    },
    // อาหารเย็น
    {
      accessorKey: "dinner",
      header: () => <div className="text-center">อาหารเย็น</div>,
      size: 120,
      id: "dinner",
      cell: ({ row }) => {
        return (
          <MealTimingLabel
            medicalReminderScheduleTimes={
              row.original.medicalReminderScheduleTimes
            }
            mealPeriodColumn="dinner"
            mealTiming={row.original.mealTiming}
            isInactive={row.original.status === "inactive"}
          />
        );
      },
    },
    // ก่อนนอน
    {
      accessorKey: "bedtime",
      header: () => <div className="text-center">ก่อนนอน</div>,
      size: 120,
      id: "bedtime",
      cell: ({ row }) => {
        return (
          <MealTimingLabel
            medicalReminderScheduleTimes={
              row.original.medicalReminderScheduleTimes
            }
            mealPeriodColumn="bedtime"
            mealTiming={row.original.mealTiming}
            isInactive={row.original.status === "inactive"}
          />
        );
      },
    },
    {
      accessorKey: "actions",
      id: "actions",
      header: "",
      size: 68,
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex justify-center">
                <Button variant="icon" className="h-5 w-5">
                  <span className="sr-only">Open menu</span>
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sm:min-w-[240px]">
              <DropdownMenuItem
                onClick={() => {
                  onEdit?.(row.original.id);
                }}
              >
                <PenIcon className="text-gray-500 group-hover:text-gray-600" />
                แก้ไข
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  onDelete?.(row.original.id);
                }}
              >
                <TrashIcon className="text-error-700 group-hover:text-error-800" />
                ลบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={cn("rounded-2xl overflow-auto shadow-sm-no-top")}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className={cn("!border-b-0")}>
              {headerGroup.headers.map((header, headerIndex) => {
                return (
                  <TableHead
                    style={{
                      minWidth: header.column.columnDef.size,
                      maxWidth: header.column.columnDef.size,
                    }}
                    key={header.id}
                    data-access-key={header.column.id}
                    className={cn(
                      headerIndex === 0
                        ? "bg-transparent sticky left-0"
                        : "border-b border-gray-200",
                      headerIndex === 1 && "rounded-tl-2xl",
                      `data-[access-key="actions"]:sticky data-[access-key="actions"]:right-0 data-[access-key="actions"]:z-1`,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="bg-white overflow-hidden">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell, cellIndex) => (
                  <TableCell
                    style={{
                      minWidth: cell.column.columnDef.size,
                      maxWidth: cell.column.columnDef.size,
                    }}
                    key={cell.id}
                    data-access-key={cell.column.id}
                    className={cn(
                      "md:px-6 md:py-4 sm:p-4 p-2",
                      cellIndex === 0 && "bg-gray-50 sticky left-0",
                      rowIndex === 0 && cellIndex === 0 && "rounded-tl-2xl",
                      `data-[access-key="actions"]:sticky data-[access-key="actions"]:right-0 data-[access-key="actions"]:bg-white data-[access-key="actions"]:z-1`,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                ไม่พบข้อมูล
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
