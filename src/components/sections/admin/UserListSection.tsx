"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/common/Loading";
import UserListTable from "./UserListTable";
import { useQueryGetUsers } from "@/hooks/useQueryGetUsers";

const DEFAULT_LIMIT = 10;

export default function UserListSection({
  externalSearch,
}: {
  externalSearch?: string;
}) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // when external search changes, debounce and reset to first page
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    const t = setTimeout(
      () => setDebouncedSearch((externalSearch || "").trim()),
      400,
    );
    return () => clearTimeout(t);
  }, [externalSearch]);

  const { data, isLoading } = useQueryGetUsers(
    pagination.pageIndex + 1,
    DEFAULT_LIMIT,
    debouncedSearch || undefined,
  );

  return (
    <div className="flex flex-col gap-4 overflow-hidden w-full">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        data && (
          <UserListTable
            userList={data}
            pagination={pagination}
            setPagination={setPagination}
          />
        )
      )}
    </div>
  );
}
