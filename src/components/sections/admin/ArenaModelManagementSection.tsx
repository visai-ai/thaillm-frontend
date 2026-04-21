"use client";

import { useRef, useState } from "react";
import { useQueryArenaAdminModels } from "@/hooks/useQueryArenaAdminModels";
import {
  useMutationArenaModelCreate,
  useMutationArenaModelUpdate,
  useMutationArenaModelDelete,
  useMutationArenaModelTest,
} from "@/hooks/useMutationArenaModel";
import type { ArenaModelAdmin } from "@/lib/api/arena";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/common/CustomInput";
import { Modal, CloseModalButton } from "@/components/common/CustomModal";
import { LoadingSpinner } from "@/components/common/Loading";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  Check,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type FormState = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  enabled: true,
};

const ArenaModelManagementSection = () => {
  const { data: models, isLoading, error } = useQueryArenaAdminModels();
  const createMutation = useMutationArenaModelCreate();
  const updateMutation = useMutationArenaModelUpdate();
  const deleteMutation = useMutationArenaModelDelete();
  const testMutation = useMutationArenaModelTest();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ArenaModelAdmin | null>(
    null,
  );
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const startCreate = () => {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setTestResult(null);
  };

  const startEdit = (model: ArenaModelAdmin) => {
    setEditingId(model.id);
    setForm({
      name: model.name,
      baseUrl: model.baseUrl,
      apiKey: "",
      model: model.model,
      enabled: model.enabled,
    });
    setTestResult(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTestResult(null);
  };

  const handleSave = () => {
    if (editingId === "new") {
      createMutation.mutate(
        {
          name: form.name,
          baseUrl: form.baseUrl,
          apiKey: form.apiKey,
          model: form.model,
          enabled: form.enabled,
        },
        {
          onSuccess: () => {
            cancelEdit();
            addNotification({
              title: "เพิ่มโมเดลสำเร็จ",
              description: `${form.name} ถูกเพิ่มเรียบร้อยแล้ว`,
              state: "success",
            });
          },
          onError: (err) => {
            addNotification({
              title: "ไม่สามารถเพิ่มโมเดลได้",
              description: err.message,
              state: "error",
            });
          },
        },
      );
    } else if (editingId) {
      const data: Record<string, unknown> = {
        name: form.name,
        baseUrl: form.baseUrl,
        model: form.model,
        enabled: form.enabled,
      };
      if (form.apiKey) data.apiKey = form.apiKey;
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            cancelEdit();
            addNotification({
              title: "อัปเดตโมเดลสำเร็จ",
              description: `${form.name} ถูกอัปเดตเรียบร้อยแล้ว`,
              state: "success",
            });
          },
          onError: (err) => {
            addNotification({
              title: "ไม่สามารถอัปเดตโมเดลได้",
              description: err.message,
              state: "error",
            });
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        addNotification({
          title: "ลบโมเดลสำเร็จ",
          description: `${deleteTarget.name} ถูกลบเรียบร้อยแล้ว`,
          state: "success",
        });
        setDeleteTarget(null);
      },
      onError: (err) => {
        addNotification({
          title: "ไม่สามารถลบโมเดลได้",
          description: err.message,
          state: "error",
        });
      },
    });
  };

  const handleToggleEnabled = (model: ArenaModelAdmin) => {
    const nextEnabled = !model.enabled;
    updateMutation.mutate(
      { id: model.id, data: { enabled: nextEnabled } },
      {
        onSuccess: () => {
          addNotification({
            title: nextEnabled ? "เปิดใช้งานโมเดล" : "ปิดใช้งานโมเดล",
            description: `${model.name} ถูก${nextEnabled ? "เปิด" : "ปิด"}ใช้งานแล้ว`,
            state: "success",
          });
        },
      },
    );
  };

  const handleTestConnection = () => {
    setTestResult(null);
    testMutation.mutate(
      { baseUrl: form.baseUrl, apiKey: form.apiKey, model: form.model },
      {
        onSuccess: (result) => setTestResult(result),
        onError: (err) =>
          setTestResult({ success: false, message: err.message }),
      },
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isFormValid =
    form.name &&
    form.baseUrl &&
    form.model &&
    (editingId !== "new" || form.apiKey);

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return <div className="text-red-500">เกิดข้อผิดพลาด: {error.message}</div>;

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!editingId && (
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มโมเดล
        </Button>
      )}

      {/* Inline form */}
      {editingId && (
        <div
          ref={formRef}
          className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50"
        >
          <h3 className="font-semibold text-gray-700">
            {editingId === "new" ? "เพิ่มโมเดลใหม่" : "แก้ไขโมเดล"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ชื่อโมเดล"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="เช่น GPT-4o"
            />
            <Input
              label="Model ID"
              value={form.model}
              onChange={(e) =>
                setForm((f) => ({ ...f, model: e.target.value }))
              }
              placeholder="เช่น gpt-4o"
            />
            <Input
              label="Base URL"
              value={form.baseUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, baseUrl: e.target.value }))
              }
              placeholder="เช่น https://api.openai.com/v1"
            />
            <Input
              label="API Key"
              type="password"
              value={form.apiKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiKey: e.target.value }))
              }
              placeholder={
                editingId === "new" ? "กรอก API Key" : "ไม่เปลี่ยนถ้าไม่กรอก"
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">
              เปิดใช้งาน
            </label>
            <Switch
              size="sm"
              checked={form.enabled}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, enabled: checked }))
              }
            />
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={
                !form.baseUrl ||
                !form.apiKey ||
                !form.model ||
                testMutation.isPending
              }
              className="gap-2"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              ทดสอบการเชื่อมต่อ
            </Button>
            {testResult && (
              <span
                className={cn(
                  "text-sm",
                  testResult.success ? "text-success-600" : "text-error-600",
                )}
              >
                {testResult.success ? "✓" : "✗"} {testResult.message}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              size="sm"
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              บันทึก
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelEdit}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {/* Mobile: card layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {models && models.length > 0 ? (
          models.map((m) => (
            <div
              key={m.id}
              className="border border-gray-200 rounded-xl p-4 bg-white space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{m.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      m.enabled
                        ? "bg-success-100 text-success-700"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {m.enabled ? "เปิด" : "ปิด"}
                  </span>
                </div>
                <Switch
                  size="sm"
                  checked={m.enabled}
                  onCheckedChange={() => handleToggleEnabled(m)}
                />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex gap-2">
                  <span className="text-gray-400 shrink-0 w-16">Model ID</span>
                  <span className="text-gray-600 font-mono truncate">
                    {m.model}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 shrink-0 w-16">Base URL</span>
                  <span className="text-gray-500 truncate">{m.baseUrl}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 shrink-0 w-16">API Key</span>
                  <span className="text-gray-400 font-mono">
                    {m.maskedApiKey}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(m)}
                  disabled={editingId !== null}
                  className="gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  แก้ไข
                </Button>
                <Button
                  variant="outline-destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(m)}
                  disabled={editingId !== null}
                  className="gap-1 text-error-500 hover:text-error-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-gray-200 rounded-xl px-4 py-8 text-center text-gray-400">
            ยังไม่มีโมเดล — กดปุ่ม &quot;เพิ่มโมเดล&quot; เพื่อเริ่มต้น
          </div>
        )}
      </div>

      {/* Desktop: table layout */}
      <div className="border border-gray-200 rounded-xl overflow-x-auto hidden md:block">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                ชื่อ
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Model ID
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Base URL
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                API Key
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                สถานะ
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody>
            {models && models.length > 0 ? (
              models.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {m.model}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">
                    {m.baseUrl}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden lg:table-cell">
                    {m.maskedApiKey}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      size="sm"
                      checked={m.enabled}
                      onCheckedChange={() => handleToggleEnabled(m)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(m)}
                        disabled={editingId !== null}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(m)}
                        disabled={editingId !== null}
                        className="text-error-500 hover:text-error-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มีโมเดล — กดปุ่ม &quot;เพิ่มโมเดล&quot; เพื่อเริ่มต้น
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        icon={AlertTriangle}
        variant="warning"
        title="ลบโมเดล"
        description={`คุณต้องการลบโมเดล "${deleteTarget?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        footer={
          <div className="flex gap-2 w-full">
            <CloseModalButton variant="outline" className="flex-1">
              ยกเลิก
            </CloseModalButton>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              ลบโมเดล
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default ArenaModelManagementSection;
