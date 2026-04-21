"use client";

import { APIKeyList, useQueryGetAPIKey } from "@/hooks/useQueryGetAPIKey";
import apiKeys from "@/lib/api/apiKeys";
import { useState, useEffect } from "react";

import { useNotificationStore } from "@/stores/useNotificationStore";
import { ColumnDef, SortingState } from "@tanstack/react-table";

import CopyButton from "@/components/common/CopyButton";
import { Modal } from "@/components/common/CustomModal";
import { DataTable } from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/Loading";
import { SortableHeader } from "@/components/common/SortableHeader";
import AddAPIKeyModal from "@/components/sections/api-key/AddAPIKeyModal";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { formatThaiDate } from "@/utils/time";
import { AlertTriangle, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

type GetAPIKeyItem = APIKeyList[number];

const DEFAULT_LIMIT = 10;

const mapBackendToUI = (item: any) => {
  const isRateLimitEnabled =
    item.usageLimit != null && item.limitPeriod != null;
  const rateLimitUnit =
    item.limitPeriod === "day"
      ? "ต่อวัน"
      : item.limitPeriod === "month"
        ? "ต่อเดือน"
        : undefined;
  return {
    id: item.id,
    name: item.name,
    isActive: item.isActivated,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    apiKey: item.apiKey,
    isRateLimitEnabled,
    rateLimit: item.usageLimit ?? undefined,
    rateLimitUnit,
    currentUsage: item.currentUsage,
  } as GetAPIKeyItem;
};

const APIKey = () => {
  const [openAddAPIKeyModal, setOpenAddAPIKeyModal] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const [sorting, setSorting] = useState<{
    id: string;
    desc: boolean;
  } | null>({ id: "createdAt", desc: true });

  const [editAPIKey, setEditAPIKey] = useState<GetAPIKeyItem | null>(null);
  const [deleteAPIKey, setDeleteAPIKey] = useState<GetAPIKeyItem | null>(null);

  const { data, isLoading, refetch } = useQueryGetAPIKey(
    pagination.pageIndex + 1,
    DEFAULT_LIMIT,
    sorting?.id || null,
    sorting?.desc ? "desc" : sorting ? "asc" : null,
  );
  const { addNotification } = useNotificationStore();

  // Reset pagination when sorting changes
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: DEFAULT_LIMIT });
  }, [sorting]);

  const resetPagination = () => {
    setPagination({ pageIndex: 0, pageSize: DEFAULT_LIMIT });
  };

  const handleOpenAddAPIKeyModal = () => {
    setOpenAddAPIKeyModal(true);
  };

  const handleDeleteAPIKey = async () => {
    const apiKeyName = deleteAPIKey?.name;
    try {
      if (!deleteAPIKey?.id) return;
      const res = await apiKeys.remove(deleteAPIKey.id);
      if (!res.ok) {
        addNotification({
          state: "error",
          title: "ลบ API Key ไม่สำเร็จ",
          description: `${res.data.error}: ลบ API Key ไม่สำเร็จ`,
        });
        return;
      }
      resetPagination();
      await refetch();
      addNotification({
        state: "success",
        title: "ลบ API Key สำเร็จ",
        description: `ลบ API Key '${apiKeyName}' สำเร็จ`,
      });
    } finally {
      setDeleteAPIKey(null);
    }
  };

  const isShowAddAPIKeyModal = !!editAPIKey || openAddAPIKeyModal;

  return (
    <>
      {deleteAPIKey && (
        <ConfirmationDeleteAPIKeyModal
          open={!!deleteAPIKey}
          onOpenChange={(state) => {
            if (!state) setDeleteAPIKey(null);
          }}
          onDelete={handleDeleteAPIKey}
          apiKeyName={deleteAPIKey?.name || ""}
        />
      )}
      {isShowAddAPIKeyModal && (
        <AddAPIKeyModal
          open={isShowAddAPIKeyModal}
          onOpenChange={(state: boolean) => {
            if (!state) {
              setEditAPIKey(null);
              resetPagination();
            }
            setOpenAddAPIKeyModal(state);
          }}
          defaultValues={editAPIKey}
          onRefetch={refetch}
        />
      )}
      <div className="flex flex-col gap-8 xl:p-8 md:p-6 p-4 overflow-hidden w-full h-full">
        <header className="flex justify-between items-center flex-row flex-wrap gap-1">
          <h1 className="text-3xl text-gray-900 font-semibold">API Key</h1>
          <Button
            onClick={handleOpenAddAPIKeyModal}
            size={"sm"}
            className="py-2.5 px-3.5"
          >
            <PlusIcon className="size-5 shrink-0" /> เพิ่ม API Key
          </Button>
        </header>
        <section className="flex flex-col gap-4 overflow-hidden w-full grow">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {data && data?.data.length === 0 ? (
                <div className="flex grow items-center justify-center">
                  <EmptyState
                    state="search"
                    title="ยังไม่มี API Key ในระบบ"
                    description={`เริ่มต้นใช้งานระบบของคุณด้วยการเพิ่ม API Key\nเพื่อเชื่อมต่อกับบริการได้อย่างสมบูรณ์`}
                    action={
                      <Button
                        onClick={handleOpenAddAPIKeyModal}
                        size={"sm"}
                        className="py-2.5 px-4"
                      >
                        <PlusIcon className="size-5 shrink-0" /> เพิ่ม API Key
                      </Button>
                    }
                  />
                </div>
              ) : (
                data &&
                data.data &&
                data.data.length > 0 && (
                  <APIKeyTable
                    apiKeyList={data.data.map(mapBackendToUI)}
                    pagination={pagination}
                    setPagination={setPagination}
                    sorting={sorting}
                    setSorting={setSorting}
                    onEdit={setEditAPIKey}
                    onDelete={setDeleteAPIKey}
                    totalPages={data.pagination.totalPages}
                  />
                )
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
};

type APIKeyTableProps = {
  apiKeyList: APIKeyList;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: React.Dispatch<
    React.SetStateAction<{ pageIndex: number; pageSize: number }>
  >;
  sorting: { id: string; desc: boolean } | null;
  setSorting: React.Dispatch<
    React.SetStateAction<{ id: string; desc: boolean } | null>
  >;
  onEdit?: (apiKey: GetAPIKeyItem) => void;
  onDelete?: (apiKey: GetAPIKeyItem) => void;
  totalPages: number;
};

type CustomColumnDef = ColumnDef<GetAPIKeyItem> & {};

const APIKeyTable = ({
  apiKeyList,
  pagination,
  setPagination,
  sorting,
  setSorting,
  onEdit,
  onDelete,
  totalPages,
}: APIKeyTableProps) => {
  // Convert single sorting object to SortingState array for DataTable
  const sortingState: SortingState = sorting ? [sorting] : [];

  // Handle sorting changes from DataTable
  const handleSortingChange: React.Dispatch<
    React.SetStateAction<SortingState>
  > = (newSorting) => {
    if (typeof newSorting === "function") {
      // Handle function form
      const result = newSorting(sortingState);
      if (result && result.length > 0) {
        setSorting(result[0]);
      } else {
        setSorting(null);
      }
    } else {
      // Handle direct value form
      if (newSorting && newSorting.length > 0) {
        setSorting(newSorting[0]);
      } else {
        setSorting(null);
      }
    }
  };

  // Handle direct sorting from SortableHeader component
  const handleSort = (columnId: string, desc: boolean | null) => {
    if (desc === null) {
      setSorting(null);
      return;
    }
    setSorting({ id: columnId, desc });
  };

  const columns: ColumnDef<GetAPIKeyItem>[] = [
    {
      accessorKey: "name",
      header: () => (
        <SortableHeader
          label="ชื่อ"
          columnId="name"
          currentSort={sorting}
          onSort={handleSort}
        />
      ),
      cell: ({ row }) => {
        return (
          <div className="py-4 md:px-6 px-4 text-sm text-gray-600 break-word">
            {row.original.name}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => (
        <SortableHeader
          label="สถานะ"
          columnId="status"
          currentSort={sorting}
          onSort={handleSort}
        />
      ),
      size: 120,
      maxSize: 120,
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <div className="py-4 md:px-6 px-4">
            {isActive ? (
              <Badge variant="success">
                <div className="size-1.5 rounded-full bg-success-500"></div>{" "}
                เปิดใช้งาน
              </Badge>
            ) : (
              <Badge variant="secondary">
                <div className="size-1.5 rounded-full bg-gray-500"></div>{" "}
                ปิดใช้งาน
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "apiKey",
      header: "API key",
      size: 120,
      maxSize: 120,
      cell: ({ row }) => {
        const lastFourKey = row?.original?.apiKey?.slice(-4);
        return (
          <div className="py-4 md:px-6 px-4 text-gray-600">
            ...{lastFourKey}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <SortableHeader
          label="วันที่สร้าง"
          columnId="createdAt"
          currentSort={sorting}
          onSort={handleSort}
        />
      ),
      size: 114,
      maxSize: 114,
      cell: ({ row }) => {
        if (!row?.original?.createdAt) return;
        return (
          <div className="py-4 md:px-6 px-4 text-gray-600">
            {formatThaiDate(new Date(row.original.createdAt), {
              year: "2-digit",
              month: "short",
              day: "2-digit",
            })}
          </div>
        );
      },
    },
    {
      accessorKey: "usage",
      header: "การใช้งาน",
      cell: ({ row }) => {
        const { currentUsage, isRateLimitEnabled, rateLimit, rateLimitUnit } =
          row.original;

        if (!isRateLimitEnabled) {
          return (
            <div className="py-4 md:px-6 px-4 text-gray-600 break-word">
              {currentUsage.toLocaleString()}
            </div>
          );
        }

        return (
          <div className="py-4 md:px-6 px-4 text-gray-600 break-word">
            {currentUsage.toLocaleString()}/{rateLimit?.toLocaleString()}{" "}
            {rateLimitUnit}
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "",
      size: 100,
      cell: ({ row }) => {
        return (
          <div className="p-1 sm:p-4 flex items-center gap-1">
            {/* Copy */}
            <CopyButton
              text={row.original.apiKey}
              className="hover:bg-gray-50"
            />
            {/* Edit */}
            <Button
              variant={"ghost-secondary"}
              size={"icon"}
              onClick={() => onEdit?.(row.original)}
            >
              <PencilIcon className="size-5" />
            </Button>
            {/* Delete */}
            <Button
              variant={"ghost-secondary"}
              size={"icon"}
              onClick={() => onDelete?.(row.original)}
            >
              <Trash2Icon className="size-5" />
            </Button>
          </div>
        );
      },
    },
  ];
  return (
    <div className="flex w-full overflow-hidden">
      <DataTable
        data={apiKeyList}
        columns={columns}
        sortInitialState={sortingState}
        onSortingChange={handleSortingChange}
        columnClassName={`data-[access-key="actions"]:sticky data-[access-key="actions"]:right-0 data-[access-key="actions"]:bg-white data-[access-key="actions"]:z-1`}
        headClassName={`data-[access-key="actions"]:sticky data-[access-key="actions"]:right-0 data-[access-key="actions"]:z-1 data-[access-key="actions"]:p-1 data-[access-key="actions"]:md:p-4`}
        pagination={pagination}
        setPagination={setPagination}
        totalPage={totalPages}
      />
    </div>
  );
};

const ConfirmationDeleteAPIKeyModal = ({
  open,
  onOpenChange,
  apiKeyName,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  apiKeyName?: string;
  onDelete?: () => void;
}) => {
  const handleCloseModal = () => {
    onOpenChange(false);
  };

  return (
    <Modal
      className="w-100"
      open={open}
      onOpenChange={onOpenChange}
      icon={AlertTriangle}
      variant={"warning"}
      title="ยืนยันการลบ API Key"
      description={`คุณต้องการลบ API Key ‘${apiKeyName}’ ใช่หรือไม่`}
      footer={
        <>
          <Button
            variant={`secondary`}
            className="grow basis-0"
            onClick={handleCloseModal}
          >
            ยกเลิก
          </Button>
          <Button
            variant={`destructive`}
            autoFocus
            className="grow basis-0"
            onClick={onDelete}
          >
            ลบ
          </Button>
        </>
      }
    />
  );
};

export default APIKey;
