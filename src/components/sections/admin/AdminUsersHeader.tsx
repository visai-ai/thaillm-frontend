"use client";

import { useState } from "react";
import { Input } from "@/components/common/CustomInput";
import { Search } from "lucide-react";
import UserListSection from "./UserListSection";

export default function AdminUsersHeader() {
  const [search, setSearch] = useState("");

  return (
    <>
      <div className="flex flex-wrap items-start gap-4">
        <header className="flex flex-col gap-1 grow">
          <h1 className="text-3xl text-gray-900 font-semibold">จัดการผู้ใช้</h1>
          <h4 className="text-gray-600">ดูรายการผู้ใช้ทั้งหมด</h4>
        </header>
        <div className="w-full sm:w-80 ml-auto">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาผู้ใช้"
            prefixElement={
              <div className="flex items-center justify-center pl-3">
                <Search className="w-4 h-4 text-gray-500" />
              </div>
            }
          />
        </div>
      </div>
      <UserListSection externalSearch={search} />
    </>
  );
}
