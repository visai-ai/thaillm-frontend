"use client";

import { Input } from "@/components/common/CustomInput";
import { LoadingSpinner } from "@/components/common/Loading";
import Content from "@/components/sections/settings/Content";
import { Button } from "@/components/ui/button";
import { useCookieSettings } from "@/hooks/useCookieSettings";
import api from "@/lib/api";
import { profileSchema, ProfileSchema } from "@/lib/schema/profileSchema";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CookieSection } from "@/components/sections/settings/CookieSection";
import { DeleteAccountSection } from "@/components/sections/settings/DeleteAccountSection";
import { PADDING_X_LAYOUT } from "@/constant/common";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const {
    isLoading,
    settings: cookieSettings,
    isSaving,
    saveSettings,
  } = useCookieSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isValid, isSubmitting: isFormSubmitting, isDirty },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      firstname: user?.firstName || "",
      lastname: user?.lastName || "",
      email: user?.email || "",
      cookieRequire: true,
      cookieAnalytic: false,
      cookieMarketing: false,
    },
  });

  // Update form values when cookie settings are loaded
  useEffect(() => {
    setValue("firstname", user?.firstName || "");
    setValue("lastname", user?.lastName || "");
    setValue("email", user?.email || "");
    setValue("cookieRequire", cookieSettings.cookieRequire);
    setValue("cookieAnalytic", cookieSettings.cookieAnalytic);
    setValue("cookieMarketing", cookieSettings.cookieMarketing);
  }, [cookieSettings, setValue, user]);

  // Handle form submission
  const onSubmit = async (data: ProfileSchema) => {
    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error("User not found");
      }

      await saveSettings({
        cookieRequire: data.cookieRequire,
        cookieAnalytic: data.cookieAnalytic,
        cookieMarketing: data.cookieMarketing,
      });

      const response = await api.user.updateUser({
        id: user.id,
        requestBody: {
          firstName: data.firstname,
          lastName: data.lastname,
          dob: null,
          gender: null,
          phone: null,
        },
      });
      if (response.ok) {
        setUser({
          ...user,
          firstName: data.firstname,
          lastName: data.lastname,
        });
        addNotification({
          state: "success",
          title: "บันทึกข้อมูล",
          description: "บันทึกข้อมูลสำเร็จ",
        });
      } else {
        addNotification({
          state: "error",
          title: "บันทึกข้อมูล",
          description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง",
        });
      }
    } finally {
      setIsSubmitting(false);
      // Reset form dirty state after successful save
      reset(data, { keepDirty: false });
    }
  };

  // Handle cancel - reset form to original values
  const handleCancel = () => {
    reset({
      firstname: user?.firstName || "",
      lastname: user?.lastName || "",
      email: user?.email || "",
      cookieRequire: cookieSettings.cookieRequire,
      cookieAnalytic: cookieSettings.cookieAnalytic,
      cookieMarketing: cookieSettings.cookieMarketing,
    });
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col xl:py-8 md:py-6 py-4 gap-8 overflow-auto w-full",
          PADDING_X_LAYOUT,
        )}
      >
        <div className="flex xl:flex-row flex-col items-start gap-4">
          <header className="flex flex-col gap-1 grow">
            <h1 className="text-3xl text-gray-900 font-semibold">โปรไฟล์</h1>
            <h4 className="text-gray-600">จัดการโปรไฟล์และการตั้งค่าบัญชี</h4>
          </header>
        </div>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-[1fr] lg:grid-cols-[minmax(170px,280px)_minmax(400px,1280px)] gap-8 mx-auto w-full"
          >
            <Content title="ข้อมูลส่วนตัว" description="อัปเดตข้อมูลส่วนตัว">
              <div className="grid-cols-2 gap-3 md:gap-6 grid max-w-[720px]">
                <Input
                  label={"ชื่อ"}
                  type="text"
                  placeholder="กรอกชื่อ"
                  variant={errors.firstname ? "error" : "default"}
                  hint={errors.firstname?.message}
                  {...register("firstname")}
                />
                <Input
                  label={"นามสกุล"}
                  type="text"
                  placeholder="กรอกนามสกุล"
                  variant={errors.lastname ? "error" : "default"}
                  hint={errors.lastname?.message}
                  {...register("lastname")}
                />
                <Input
                  prefixElement={
                    <div className="flex items-center justify-center pl-3">
                      <MailIcon className="w-5 text-gray-500" />
                    </div>
                  }
                  label={"อีเมล"}
                  type="email"
                  placeholder="กรอกอีเมล"
                  containerClassName="col-span-2"
                  disabled={true}
                  variant={errors.email ? "error" : "default"}
                  hint={errors.email?.message}
                  {...register("email")}
                />
              </div>
            </Content>
            <hr className="col-span-2" />
            <Content
              title="การตั้งค่าคุกกี้"
              description="จัดการการใช้งานคุกกี้"
            >
              <CookieSection control={control} />
            </Content>
            <hr className="col-span-2" />
            <Content
              title="ลบบัญชีการใช้งาน"
              description="ลบบัญชีและข้อมูลทั้งหมดถาวร"
            >
              <DeleteAccountSection />
            </Content>
            <div className="col-span-2">
              <hr className="" />
              <div className="flex gap-2 justify-end py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit text-sm"
                  onClick={handleCancel}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="w-fit text-sm"
                  disabled={
                    isSubmitting ||
                    isSaving ||
                    isFormSubmitting ||
                    !isDirty ||
                    !isValid
                  }
                >
                  {isSubmitting || isSaving || isFormSubmitting
                    ? "กำลังบันทึก..."
                    : "บันทึกการเปลี่ยนแปลง"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
