"use client";

import { GetAppointmentsResponse } from "@/@types/backend-api";
import { useEffect, useState } from "react";

import { DataTable } from "@/components/common/DataTable";
import { Modal } from "@/components/common/CustomModal";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";

import { formatThaiDate } from "@/utils/time";

type GetAppointmentsList = GetAppointmentsResponse["data"];
type GetAppointmentsItem = GetAppointmentsList[number];

const AppointmentHistoryTable = ({
  appointments,
  pagination,
  setPagination,
}: {
  appointments: GetAppointmentsResponse;
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
}) => {
  const pageIndex = appointments?.pagination?.page ?? 0;

  const appointmentList: GetAppointmentsList = appointments?.data || [];

  const [selected, setSelected] = useState<GetAppointmentsItem | null>(null);

  useEffect(() => {
    if (appointments.pagination?.page) {
      setPagination({
        ...pagination,
        pageIndex: pageIndex - 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments.pagination?.page]);

  const columns: ColumnDef<GetAppointmentsItem>[] = [
    {
      accessorKey: "datetime",
      header: "วันที่ เวลา",
      cell: ({ row }) => {
        const appointmentDate = new Date(row.original.date);
        const timeSlot = row.original.expectedTimeSlot;
        return (
          <div className="py-4 md:px-6 px-4 text-sm font-medium text-gray-900">
            <div className="flex flex-col">
              <span>{formatThaiDate(appointmentDate)}</span>
              {timeSlot && (
                <span className="text-gray-600 text-xs">
                  {timeSlot.slice(0, 5)}
                </span>
              )}
            </div>
          </div>
        );
      },
      size: 60,
    },
    {
      accessorKey: "hospitalName",
      header: "โรงพยาบาล",
      cell: ({ row }) => {
        const hospitalName = row.original.hospitalName || "-";
        const hospitalEmail = row.original.hospitalEmail || "-";
        return (
          <div className="py-4 md:px-6 px-4 text-sm font-medium text-gray-900">
            <div className="flex flex-col">
              <span>{hospitalName}</span>
              <span className="text-gray-600 text-xs">{hospitalEmail}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "departmentName",
      header: "แผนก",
      cell: ({ row }) => {
        const departmentName = row.original.departmentName || "-";
        return (
          <div className="py-4 md:px-6 px-4 text-sm font-medium text-gray-900">
            {departmentName}
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: "reason",
      header: "อาการ/เหตุผล",
      cell: ({ row }) => {
        const reason = row.original.reason || "-";
        const reasonDetail = row.original.reasonDetail;
        return (
          <div className="py-4 md:px-6 px-4 text-sm text-gray-900 whitespace-pre-line line-clamp-3">
            {reason}
            {reasonDetail ? `\n\n${reasonDetail}` : ""}
          </div>
        );
      },
      size: 280,
    },
    {
      accessorKey: "note",
      header: "หมายเหตุ",
      cell: ({ row }) => {
        const note = row.original.note || "-";
        return (
          <div className="py-4 md:px-6 px-4 text-sm text-gray-900 whitespace-pre-line line-clamp-3">
            {note}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex w-full overflow-hidden">
      <DataTable
        data={appointmentList}
        columns={columns}
        pagination={pagination}
        setPagination={setPagination}
        totalPage={appointments?.pagination?.totalPages || 0}
        onRowClick={(row) => setSelected(row)}
        columnClassName="align-top"
      />
      <AppointmentDetailModal
        appointment={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

const AppointmentDetailModal = ({
  appointment,
  onClose,
}: {
  appointment: GetAppointmentsItem | null;
  onClose: () => void;
}) => {
  return (
    <Modal
      open={!!appointment}
      onOpenChange={(state) => !state && onClose()}
      title="รายละเอียดการนัดหมาย"
      description=""
      className="w-full sm:max-w-2xl md:max-w-3xl"
      body={
        appointment ? (
          <div key={appointment.id} className="grid grid-cols-5 gap-2 text-sm">
            <span className="font-semibold col-span-1">วันที่:</span>
            <span className="col-span-4">
              {formatThaiDate(new Date(appointment.date))}
              {appointment.expectedTimeSlot
                ? ` เวลา ${appointment.expectedTimeSlot.slice(0, 5)}`
                : ""}
            </span>
            <span className="font-semibold col-span-1">โรงพยาบาล:</span>
            <span className="col-span-4">
              {appointment.hospitalName || "-"}
            </span>
            {appointment.hospitalEmail && (
              <>
                <span className="font-semibold col-span-1">อีเมล:</span>
                <span className="col-span-4 break-all">
                  {appointment.hospitalEmail}
                </span>
              </>
            )}
            <span className="font-semibold col-span-1">แผนก:</span>
            <span className="col-span-4">
              {appointment.departmentName || "-"}
            </span>
            <span className="font-semibold col-span-1">อาการ:</span>
            <span className="col-span-4 whitespace-pre-line">
              {appointment.reason || "-"}
              {appointment.reasonDetail
                ? `\n\n${appointment.reasonDetail}`
                : ""}
            </span>
            <span className="font-semibold col-span-1">หมายเหตุ:</span>
            <span className="col-span-4 whitespace-pre-line">
              {appointment.note || "-"}
            </span>
            {appointment.status && (
              <>
                <span className="font-semibold col-span-1">สถานะ:</span>
                <span className="col-span-4">{appointment.status}</span>
              </>
            )}
          </div>
        ) : (
          <div />
        )
      }
      footer={
        <Button variant="secondary" className="grow basis-0" onClick={onClose}>
          ปิด
        </Button>
      }
    />
  );
};

export default AppointmentHistoryTable;
