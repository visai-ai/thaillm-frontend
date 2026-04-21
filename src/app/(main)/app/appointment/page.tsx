"use client";

import AddAppointmentModal, {
  NewAppointmentMethod,
} from "@/components/sections/appointment/AddAppointmentModal";
import AppointmentList from "@/components/sections/appointment/AppointmentList";
import { PADDING_X_LAYOUT } from "@/constant/common";
import { useQueryGetFutureAppointments } from "@/hooks/useQueryGetAppointments";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LoadingSpinner } from "@/components/common/Loading";
import { ChevronDownIcon, History } from "lucide-react";
import Link from "next/link";

export default function Page() {
  const [openNewAppointmentModal, setOpenNewAppointmentModal] = useState(false);
  const [newAppointmentMethod, setNewAppointmentMethod] =
    useState<NewAppointmentMethod>("default");

  const { data, isLoading, refetch } = useQueryGetFutureAppointments();

  return (
    <div className="flex flex-col xl:py-8 md:py-6 py-4 gap-8 sm:overflow-hidden overflow-auto w-full">
      <div
        className={cn(
          "flex xl:flex-row flex-col items-start gap-4",
          PADDING_X_LAYOUT,
        )}
      >
        <header className="flex flex-col gap-1 grow">
          <h1 className="text-3xl text-gray-900 font-semibold">
            รายการนัดหมายแพทย์
          </h1>
          <h4 className="text-gray-600">
            สร้างการแจ้งเตือนตามวันที่และเวลาที่คุณต้องการ
          </h4>
        </header>
        {openNewAppointmentModal && (
          <AddAppointmentModal
            open={openNewAppointmentModal}
            onOpenChange={(state) => {
              if (!state) setNewAppointmentMethod("default");
              setOpenNewAppointmentModal(state);
            }}
            method={newAppointmentMethod}
            onRefetch={refetch}
          />
        )}

        <div className="flex gap-3 ml-auto flex-wrap justify-end">
          <Link href="/app/appointment/history">
            <Button variant={"secondary"} className="flex gap-2">
              <History className="size-5 shrink-0" />
              ประวัติการนัดหมาย
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex justify-end gap-3">
                เพิ่มรายการนัดหมายแพทย์
                <ChevronDownIcon className="data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sm:min-w-[240px]">
              <DropdownMenuItem
                onClick={() => setOpenNewAppointmentModal(true)}
              >
                เพิ่มนัดหมายแพทย์ใหม่
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setNewAppointmentMethod("from-chat-history");
                  setOpenNewAppointmentModal(true);
                }}
              >
                เพิ่มนัดหมายแพทย์จากประวัติการสนทนา
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {data ? (
            <AppointmentList appointments={data} onRefetch={refetch} />
          ) : (
            <></>
          )}
        </>
      )}
    </div>
  );
}
