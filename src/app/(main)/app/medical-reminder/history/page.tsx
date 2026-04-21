"use client";

import { LoadingSpinner } from "@/components/common/Loading";
import SubPageLayout from "@/components/layout/main/SubPageLayout";
import MedicalHistoryTable from "@/components/sections/medical-reminder/MedicalHistoryTable";
import { useQueryGetHistoryMedicalReminders } from "@/hooks/useQueryGetHistoryMedicalReminders";
import { useEffect, useState } from "react";

const limitPerPage = 10;
type HistoryTableSorting = { id: "updatedAt"; desc: boolean } | null;

export default function Page() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<HistoryTableSorting>({
    id: "updatedAt",
    desc: true,
  });

  const sortBy = sorting?.id ?? "updatedAt";
  const sortOrder = sorting ? (sorting.desc ? "desc" : "asc") : "desc";

  useEffect(() => {
    setPagination((prev) => {
      if (prev.pageIndex === 0) {
        return prev;
      }
      return {
        ...prev,
        pageIndex: 0,
      };
    });
  }, [sortBy, sortOrder]);

  const { data: dataHistory, isLoading } = useQueryGetHistoryMedicalReminders(
    pagination.pageIndex + 1,
    limitPerPage,
    sortBy,
    sortOrder,
  );

  return (
    <SubPageLayout
      historyPageList={[
        { name: "รายการแจ้งเตือนยา", path: "/app/medical-reminder" },
      ]}
      currentPageName={"ประวัติการทานยา"}
    >
      <div className="flex flex-col gap-4 overflow-hidden w-full">
        <h1 className="text-3xl text-gray-900 font-semibold">
          ประวัติการทานยา
        </h1>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {dataHistory && (
              <MedicalHistoryTable
                scheduleHistory={dataHistory}
                pagination={pagination}
                setPagination={setPagination}
                sorting={sorting}
                setSorting={setSorting}
              />
            )}
          </>
        )}
      </div>
    </SubPageLayout>
  );
}
