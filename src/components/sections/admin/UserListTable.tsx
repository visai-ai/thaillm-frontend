"use client";

import { GetUsersResponse } from "@/@types/backend-api";
import { CloseModalButton, Modal } from "@/components/common/CustomModal";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { formatThaiDateWithTime } from "@/utils/time";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

type UserRow = GetUsersResponse["list"][number];

const AVAILABLE_ROLES = [
  { value: "user", label: "user" },
  { value: "admin", label: "admin" },
];

export default function UserListTable({
  userList,
  pagination,
  setPagination,
}: {
  userList: GetUsersResponse;
  pagination?: { pageIndex: number; pageSize: number };
  setPagination?: React.Dispatch<
    React.SetStateAction<{ pageIndex: number; pageSize: number }>
  >;
}) {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [localRows, setLocalRows] = useState<UserRow[]>(userList.list);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{
    user: UserRow;
    next: boolean;
  } | null>(null);
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [rolePending, setRolePending] = useState<{
    user: UserRow;
    newRole: string;
  } | null>(null);

  useEffect(() => {
    setLocalRows(userList.list);
  }, [userList]);

  const handleToggleActive = async (row: UserRow, nextValue: boolean) => {
    // optimistic update
    setLocalRows((prev) =>
      prev.map((u) => (u.id === row.id ? { ...u, isActive: nextValue } : u)),
    );
    const res = await api.user.setUserActive(row.id, nextValue);
    if (!res.ok) {
      // revert on error
      setLocalRows((prev) =>
        prev.map((u) =>
          u.id === row.id ? { ...u, isActive: row.isActive } : u,
        ),
      );
      addNotification({
        title: "ไม่สามารถอัปเดตผู้ใช้ได้",
        description: (res.data as any)?.error || "",
        state: "error",
      });
      return;
    }
    // sync latest from server
    if (res.ok) {
      setLocalRows((prev) =>
        prev.map((u) =>
          u.id === row.id ? { ...u, isActive: (res.data as any).isActive } : u,
        ),
      );
    }
    addNotification({
      title: nextValue ? "เปิดการใช้งานผู้ใช้" : "ปิดการใช้งานผู้ใช้",
      description: `${row.email} ถูกตั้งค่าเป็น${nextValue ? "เปิดใช้งาน" : "ปิดใช้งาน"}แล้ว`,
      state: "success",
    });
  };

  const handleUpdateRole = async (row: UserRow, newRole: string) => {
    const newRoles = [newRole];
    const oldRoles = row.roles;
    // optimistic update
    setLocalRows((prev) =>
      prev.map((u) => (u.id === row.id ? { ...u, roles: newRoles } : u)),
    );
    const res = await api.user.setUserRoles(row.id, newRoles);
    if (!res.ok) {
      // revert on error
      setLocalRows((prev) =>
        prev.map((u) => (u.id === row.id ? { ...u, roles: oldRoles } : u)),
      );
      addNotification({
        title: "ไม่สามารถอัปเดตบทบาทได้",
        description: (res.data as any)?.error || "",
        state: "error",
      });
      return;
    }
    if (res.ok) {
      setLocalRows((prev) =>
        prev.map((u) =>
          u.id === row.id ? { ...u, roles: (res.data as any).roles } : u,
        ),
      );
    }
    addNotification({
      title: "อัปเดตบทบาทสำเร็จ",
      description: `${row.email} ถูกตั้งค่าเป็น ${newRole} แล้ว`,
      state: "success",
    });
  };

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "name",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: "ชื่อ - นามสกุล",
      size: 200,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="py-4 md:px-6 px-4 text-sm">
            <span className="text-gray-900 font-medium">{`${u.firstName} ${u.lastName}`}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "อีเมล",
      size: 200,
      cell: ({ row }) => (
        <div className="py-4 md:px-6 px-4 text-sm text-gray-700 break-word">
          {row.original.email}
        </div>
      ),
    },
    {
      accessorKey: "roles",
      header: "บทบาท",
      size: 100,
      accessorFn: (row) => row.roles?.join(", ") || "-",
      cell: ({ row }) => {
        const u = row.original;
        const currentRole = u.roles?.[0] || "user";
        return (
          <div className="py-4 md:px-6 px-4 text-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 hover:bg-gray-50 gap-1"
                >
                  {currentRole}
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {AVAILABLE_ROLES.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    className={cn(
                      currentRole === role.value && "bg-gray-100 font-semibold",
                    )}
                    onClick={() => {
                      if (role.value !== currentRole) {
                        setRolePending({ user: u, newRole: role.value });
                        setRoleConfirmOpen(true);
                      }
                    }}
                  >
                    {role.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "สร้างเมื่อ",
      size: 70,
      cell: ({ row }) => (
        <div className="py-4 md:px-6 px-4 text-sm text-gray-700">
          {row.original.createdAt
            ? formatThaiDateWithTime(new Date(row.original.createdAt))
            : "-"}
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "สถานะ",
      size: 60,
      cell: ({ row }) => {
        const u = row.original;
        const current = u.isActive;
        return (
          <div className="py-4 md:px-6 px-4 text-sm">
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <Button
                size="sm"
                variant={"ghost"}
                className={cn(
                  "rounded-none rounded-l-lg px-3 border-r border-gray-300 hover:bg-gray-100",
                  current && "text-gray-700 bg-gray-200 hover:bg-gray-200",
                )}
                onClick={() => {
                  if (current) return;
                  setPending({ user: u, next: true });
                  setConfirmOpen(true);
                }}
              >
                เปิดใช้งาน
              </Button>
              <Button
                size="sm"
                variant={"ghost"}
                className={cn(
                  "rounded-none rounded-r-lg -ml-px border-l border-gray-300 px-3 hover:bg-error-100 hover:text-error-700",
                  !current && "text-error-700 bg-error-200 hover:bg-error-200",
                )}
                onClick={() => {
                  if (!current) return;
                  setPending({ user: u, next: false });
                  setConfirmOpen(true);
                }}
              >
                ปิดใช้งาน
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex w-full overflow-hidden">
      <DataTable
        data={localRows}
        columns={columns}
        sortInitialState={[{ id: "name", desc: false }]}
        headClassName="bg-gray-50 border-b border-gray-200 text-gray-600"
        columnClassName="border-b border-gray-100"
        pagination={pagination}
        setPagination={setPagination}
        totalPage={userList.pagination.totalPages || 0}
      />
      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={AlertTriangle}
        variant={"warning"}
        title="ยืนยันการเปลี่ยนสถานะผู้ใช้"
        description={
          pending?.next
            ? "ต้องการเปิดใช้งานผู้ใช้นี้หรือไม่?\nผู้ใช้จะสามารถเข้าใช้งานแอปได้อีกครั้ง"
            : "ต้องการปิดใช้งานผู้ใช้นี้หรือไม่?\nผู้ใช้จะถูกออกจากระบบและไม่สามารถใช้งานได้"
        }
        className={`w-full sm:max-w-[400px]`}
        footer={
          <>
            <CloseModalButton
              variant="secondary"
              className="grow basis-0"
              onClick={() => {
                setPending(null);
              }}
            >
              ยกเลิก
            </CloseModalButton>
            <Button
              className="grow basis-0"
              onClick={async () => {
                if (!pending) return;
                await handleToggleActive(pending.user, pending.next);
                setConfirmOpen(false);
                setPending(null);
              }}
            >
              ตกลง
            </Button>
          </>
        }
      ></Modal>
      <Modal
        open={roleConfirmOpen}
        onOpenChange={(open) => {
          setRoleConfirmOpen(open);
          if (!open) setRolePending(null);
        }}
        icon={AlertTriangle}
        variant={"warning"}
        title="ยืนยันการเปลี่ยนบทบาท"
        description={`ต้องการเปลี่ยนบทบาทของ ${rolePending?.user.email} เป็น "${rolePending?.newRole}" หรือไม่?`}
        className={`w-full sm:max-w-[400px]`}
        footer={
          <>
            <CloseModalButton
              variant="secondary"
              className="grow basis-0"
              onClick={() => {
                setRolePending(null);
              }}
            >
              ยกเลิก
            </CloseModalButton>
            <Button
              className="grow basis-0"
              onClick={async () => {
                if (!rolePending) return;
                await handleUpdateRole(rolePending.user, rolePending.newRole);
                setRoleConfirmOpen(false);
                setRolePending(null);
              }}
            >
              ตกลง
            </Button>
          </>
        }
      ></Modal>
    </div>
  );
}
