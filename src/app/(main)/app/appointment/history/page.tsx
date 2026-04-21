"use client";

import { LoadingSpinner } from "@/components/common/Loading";
import SubPageLayout from "@/components/layout/main/SubPageLayout";
import AppointmentHistoryTable from "@/components/sections/appointment/AppointmentHistoryTable";
import { useQueryGetHistoryAppointments } from "@/hooks/useQueryGetAppointments";
import { useState } from "react";

const limitPerPage = 10;

export default function Page() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: limitPerPage,
  });

  const currentPage = pagination.pageIndex + 1;

  const { data: historyAppointments, isLoading } =
    useQueryGetHistoryAppointments(currentPage, limitPerPage);

  return (
    <SubPageLayout
      historyPageList={[
        { name: "รายการนัดหมายแพทย์", path: "/app/appointment" },
      ]}
      currentPageName={"ประวัติการนัดหมาย"}
    >
      <div className="flex flex-col gap-4 overflow-hidden w-full">
        <h1 className="text-3xl text-gray-900 font-semibold">
          ประวัติการนัดหมาย
        </h1>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {historyAppointments && historyAppointments.data.length > 0 ? (
              <AppointmentHistoryTable
                appointments={historyAppointments}
                pagination={pagination}
                setPagination={setPagination}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-gray-500 text-lg mb-2">
                  ยังไม่มีประวัติการนัดหมาย
                </div>
                <div className="text-gray-400 text-sm">
                  ประวัติการนัดหมายจะแสดงที่นี่เมื่อมีการนัดหมายที่ผ่านมาแล้ว
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SubPageLayout>
  );
}
