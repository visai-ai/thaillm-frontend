import { useId, useState, useTransition } from "react";
import {
  useForm,
  useFormContext,
  FormProvider,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

import {
  apiKeySchema,
  APIKeySchemaValues,
  RATE_LIMIT_UNITS,
  RateLimitType,
} from "@/lib/schema/apiKeySchema";
import { Modal } from "@/components/common/CustomModal";
import { Input } from "@/components/common/CustomInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import TextDropdown from "@/components/common/TextDropdown";
import { Button } from "@/components/ui/button";

import { KeyRound, CheckCircleIcon, RefreshCwIcon } from "lucide-react";
import { APIKeyList } from "@/hooks/useQueryGetAPIKey";
import CopyButton from "@/components/common/CopyButton";
import apiKeys from "@/lib/api/apiKeys";
import { useNotificationStore } from "@/stores/useNotificationStore";

type AddAPIKeyModalProps = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onRefetch?: () => void;
  defaultValues?: APIKeyList[number] | null;
};

const SUCCESS_FORM_STATE = {
  SUCCESS_CREATE_NEW_API_KEY: "success_create_new_api_key",
  SUCCESS_EDIT_API_KEY: "success_edit_api_key",
  SUCCESS_REGENERATE_API_KEY: "success_regenerate_api_key",
};

const AddAPIKeyModal = ({
  open,
  onOpenChange,
  onRefetch,
  defaultValues,
}: AddAPIKeyModalProps) => {
  const editId = defaultValues?.id;
  const isEditState = !!editId;
  const labelState = editId ? `แก้ไข` : `เพิ่ม`;

  const apiKeyFrom = useForm<APIKeySchemaValues>({
    resolver: zodResolver(apiKeySchema),
    mode: "onChange",
    defaultValues: {
      name: defaultValues?.name ?? "",
      isActive: defaultValues?.isActive ?? true,
      isRateLimitEnabled: defaultValues?.isRateLimitEnabled ?? false,
      rateLimitUnit:
        (defaultValues?.rateLimitUnit as RateLimitType) ?? RATE_LIMIT_UNITS[0],
      rateLimit: defaultValues?.rateLimit
        ? String(defaultValues?.rateLimit)
        : "",
    },
  });

  const [isPending, startTransition] = useTransition();
  const [successState, setSuccessState] = useState<
    (typeof SUCCESS_FORM_STATE)[keyof typeof SUCCESS_FORM_STATE] | null
  >(null);
  const [newAPIKey, setNewAPIKey] = useState<string>("");
  const { addNotification } = useNotificationStore();

  const mapFormToRequest = (values: APIKeySchemaValues) => {
    const usageLimit = values.isRateLimitEnabled
      ? Number(values.rateLimit?.trim()?.replaceAll(",", ""))
      : null;
    const limitPeriod = values.isRateLimitEnabled
      ? values.rateLimitUnit === "ต่อวัน"
        ? "day"
        : values.rateLimitUnit === "ต่อเดือน"
          ? "month"
          : null
      : null;
    return { usageLimit, limitPeriod } as const;
  };

  const onCreateAPIKey = () => {
    startTransition(async () => {
      const values = apiKeyFrom.getValues();
      const { usageLimit, limitPeriod } = mapFormToRequest(values);
      const res = await apiKeys.create({
        requestBody: {
          name: values.name,
          isActivated: values.isActive,
          usageLimit,
          limitPeriod: limitPeriod as any,
        },
      });
      if (!res.ok) {
        addNotification({
          state: "error",
          title: "สร้าง API Key ไม่สำเร็จ",
          description: `${res.data.error}: สร้าง API Key ไม่สำเร็จ`,
        });
        return;
      }
      setNewAPIKey(res.data.apiKey);
      setSuccessState(SUCCESS_FORM_STATE.SUCCESS_CREATE_NEW_API_KEY);
      onRefetch?.();
    });
  };

  const onEditAPIKey = () => {
    startTransition(async () => {
      if (!editId) return;
      const values = apiKeyFrom.getValues();
      const { usageLimit, limitPeriod } = mapFormToRequest(values);
      const res = await apiKeys.update({
        id: editId,
        requestBody: {
          name: values.name,
          isActivated: values.isActive,
          usageLimit,
          limitPeriod: limitPeriod as any,
        },
      });
      if (!res.ok) {
        addNotification({
          state: "error",
          title: "แก้ไข API Key ไม่สำเร็จ",
          description: `${res.data.error}: แก้ไข API Key ไม่สำเร็จ`,
        });
        return;
      }
      setNewAPIKey(res.data.apiKey);
      setSuccessState(SUCCESS_FORM_STATE.SUCCESS_EDIT_API_KEY);
      onRefetch?.();
    });
  };

  const onRegenerateAPIKey = () => {
    startTransition(async () => {
      if (!editId) return;
      const res = await apiKeys.regenerate(editId);
      if (!res.ok) {
        addNotification({
          state: "error",
          title: "สร้าง API Key ใหม่ไม่สำเร็จ",
          description: `${res.data.error}: สร้าง API Key ใหม่ไม่สำเร็จ`,
        });
        return;
      }
      setNewAPIKey(res.data.apiKey);
      setSuccessState(SUCCESS_FORM_STATE.SUCCESS_REGENERATE_API_KEY);
      onRefetch?.();
    });
  };

  const onClose = () => {
    onOpenChange(false);
  };

  if (successState) {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        {...(successState !== SUCCESS_FORM_STATE.SUCCESS_CREATE_NEW_API_KEY && {
          icon: CheckCircleIcon,
          variant: "success",
        })}
        className={cn(`w-full md:max-w-[480px]`)}
        title={`${
          successState === SUCCESS_FORM_STATE.SUCCESS_EDIT_API_KEY
            ? "แก้ไข API Key ใหม่สำเร็จ"
            : "สร้าง API Key ใหม่สำเร็จ"
        }`}
        description={`โปรดใช้ API key ของคุณอย่างปลอดภัย\nห้ามแชร์หรือฝังไว้ในโค้ดที่ผู้อื่นสามารถเข้าถึงได้แบบสาธารณะ`}
        body={
          <div className="w-full my-1">
            <Input
              value={newAPIKey}
              suffixElement={
                <Button
                  size={"sm"}
                  className="rounded-r-md rounded-l-none"
                  asChild
                >
                  <CopyButton
                    text={newAPIKey}
                    className="hover:text-white"
                    buttonText={"คัดลอก"}
                  />
                </Button>
              }
              readOnly
            />
          </div>
        }
      />
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      icon={KeyRound}
      iconShape="square"
      className={cn(`w-full md:max-w-160`)}
      title={`${labelState} API Key`}
      description={`${isEditState ? "" : "ระบุ"}รายละเอียดการสร้าง API Key`}
      body={
        <FormProvider {...apiKeyFrom}>
          <AddAPIKeyForm />
        </FormProvider>
      }
      footer={
        <>
          {isEditState ? (
            <div className="flex sm:text-base text-sm sm:items-center sm:flex-row flex-col justify-between w-full gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant={"secondary"}
                  onClick={onClose}
                  className="sm:w-35 sm:grow-0 grow"
                >
                  ยกเลิก
                </Button>
                <Button
                  variant={"secondary"}
                  onClick={onRegenerateAPIKey}
                  className="sm:w-35 sm:grow-0 grow"
                >
                  <RefreshCwIcon className="size-5" />
                  สร้างใหม่
                </Button>
              </div>
              <Button
                disabled={!apiKeyFrom.formState.isValid || isPending}
                onClick={onEditAPIKey}
                className="sm:w-35"
              >
                บันทึก
              </Button>
            </div>
          ) : (
            <div className="flex sm:text-base text-sm items-center gap-3 w-full">
              <Button
                variant={"secondary"}
                className="grow basis-0"
                onClick={onClose}
              >
                ยกเลิก
              </Button>
              <Button
                className="grow basis-0"
                type="button"
                disabled={!apiKeyFrom.formState.isValid || isPending}
                onClick={onCreateAPIKey}
              >
                เพิ่ม API Key
              </Button>
            </div>
          )}
        </>
      }
    />
  );
};

const AddAPIKeyForm = () => {
  const apiKeyFromId = useId();
  const enableRateLimitId = useId();
  const isActiveId = useId();

  const { setValue, register, watch, control, formState } =
    useFormContext<APIKeySchemaValues>();

  const rateLimit = watch("rateLimit");
  const isRateLimitEnabled = watch("isRateLimitEnabled");
  const rateLimitUnit = watch("rateLimitUnit");

  return (
    <form id={apiKeyFromId} className="pt-1 flex flex-col gap-4" noValidate>
      {/* API Key name */}
      <Input
        type="text"
        placeholder="กรอกชื่อ API Key"
        label="ชื่อ API Key"
        requiredLabel={true}
        maxLength={1000}
        {...register("name")}
      />
      {/* rate limit */}
      <div className="space-y-2">
        {/* toggle rate limit */}
        <div className="flex items-center gap-3 cursor-pointer w-fit">
          <Controller
            key={`isRateLimitEnabled`}
            name={`isRateLimitEnabled`}
            control={control}
            render={({ field }) => (
              <>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  id={enableRateLimitId}
                />
                <Label htmlFor={enableRateLimitId} className="cursor-pointer">
                  {field.value ? "เปิด" : "ปิด"}
                  ใช้งาน Rate limit
                </Label>
              </>
            )}
          />
        </div>
        {/* rate limit config */}
        {isRateLimitEnabled && (
          <>
            <div className="flex sm:items-end sm:flex-row flex-col gap-2">
              <Input
                type="text"
                placeholder="กรอกจำนวนการจำกัดการใช้งาน"
                label="จำนวนการจำกัดการใช้งาน"
                requiredLabel={true}
                {...register("rateLimit")}
                containerClassName="grow basis-0"
                maxLength={9}
                variant={
                  rateLimit && formState.errors.rateLimit ? "error" : "default"
                }
              />
              <TextDropdown
                items={[...RATE_LIMIT_UNITS]}
                selectedItem={rateLimitUnit || ""}
                handleSetSelectedItem={(item: string) => {
                  setValue("rateLimitUnit", item as RateLimitType, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                placeholder="เลือกหน่วย"
                className="grow basis-0"
              />
            </div>
            {formState.errors.rateLimit && rateLimit && (
              <p className="text-xs text-red-500">
                {formState.errors.rateLimit.message}
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-3 cursor-pointer w-fit">
        <Controller
          key={`isActive`}
          name={`isActive`}
          control={control}
          render={({ field }) => (
            <>
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                id={isActiveId}
              />
              <Label htmlFor={isActiveId} className="cursor-pointer">
                {field.value ? "เปิด" : "ปิด"}
                ใช้งาน API Key
              </Label>
            </>
          )}
        />
      </div>
    </form>
  );
};

export default AddAPIKeyModal;
