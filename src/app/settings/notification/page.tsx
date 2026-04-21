"use client";

import { useEffect, useRef, useState } from "react";
import { Control, useForm } from "react-hook-form";

import Content from "@/components/sections/settings/Content";
import SwitchSection from "@/components/sections/settings/SwitchSection";
import { Button } from "@/components/ui/button";
import {
  notificationSettingsSchema,
  NotificationSettingsSchema,
} from "@/lib/schema/notificationSchema";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { usePushNotification } from "@/hooks/usePushNotification";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { PADDING_X_LAYOUT } from "@/constant/common";
import userApi from "@/lib/api/user";

export default function Notification() {
  const { addNotification } = useNotificationStore();
  const {
    isSupported,
    isSubscribed,
    browserPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotification();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedSettings, setLoadedSettings] = useState<{
    enablePushNotifications: boolean;
    enableEmailNotifications: boolean;
  } | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isValid, isSubmitting: isFormSubmitting },
  } = useForm<NotificationSettingsSchema>({
    resolver: zodResolver(notificationSettingsSchema),
    mode: "onChange",
    defaultValues: {
      enablePushNotifications: false,
      enableEmailNotifications: true,
    },
  });

  // Watch form values to calculate custom dirty state
  const formValues = watch();

  // Custom dirty state that compares against loaded settings
  const isDirty = loadedSettings
    ? formValues.enablePushNotifications !==
        loadedSettings.enablePushNotifications ||
      formValues.enableEmailNotifications !==
        loadedSettings.enableEmailNotifications
    : false;

  const settingsLoaded = useRef(false);
  useEffect(() => {
    if (settingsLoaded.current) return;

    const fetchSettings = async () => {
      try {
        const response = await userApi.getSetting();
        if (response.ok && response.data) {
          const savedSettings = response.data;
          const loadedSettingsData = {
            enablePushNotifications: isSubscribed,
            enableEmailNotifications: savedSettings.enableEmailNotification,
          };

          setLoadedSettings(loadedSettingsData);
          setValue(
            "enableEmailNotifications",
            savedSettings.enableEmailNotification,
          );
          settingsLoaded.current = true;
        }
      } catch (error) {
        console.error("Failed to fetch notification settings:", error);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setValue]);

  // Sync push notification state with usePushNotification hook
  useEffect(() => {
    setValue("enablePushNotifications", isSubscribed);
  }, [isSubscribed, setValue]);

  // Handle form submission
  const onSubmit = async (data: NotificationSettingsSchema) => {
    setIsSubmitting(true);
    try {
      // Update email notification settings via API
      const emailResponse = await userApi.updateSetting({
        enableEmailNotification: data.enableEmailNotifications,
      });

      if (!emailResponse.ok) {
        addNotification({
          title: "เกิดข้อผิดพลาด",
          description:
            "ไม่สามารถบันทึกการตั้งค่าการแจ้งเตือนอีเมลได้ กรุณาลองใหม่อีกครั้ง",
          state: "error",
        });
        return;
      }

      if (data.enablePushNotifications && !isSubscribed) {
        // User wants to enable push notifications
        await subscribeToPush();
      } else if (!data.enablePushNotifications && isSubscribed) {
        // User wants to disable push notifications
        await unsubscribeFromPush();
      }

      addNotification({
        title: "บันทึกสำเร็จ",
        description: "การตั้งค่าการแจ้งเตือนถูกบันทึกแล้ว",
        state: "success",
      });

      const newSettings = {
        enablePushNotifications: data.enablePushNotifications,
        enableEmailNotifications: data.enableEmailNotifications,
      };

      setLoadedSettings(newSettings);
      reset(newSettings, { keepDirty: false });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      addNotification({
        title: "เกิดข้อผิดพลาด",
        description:
          "ไม่สามารถบันทึกการตั้งค่าการแจ้งเตือนได้ กรุณาลองใหม่อีกครั้ง",
        state: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    const response = await userApi.getSetting();
    if (response.ok && response.data) {
      const resetSettings = {
        enablePushNotifications: isSubscribed,
        enableEmailNotifications: response.data.enableEmailNotification,
      };
      setLoadedSettings(resetSettings);
      reset(resetSettings);
    } else {
      const resetSettings = {
        enablePushNotifications: isSubscribed,
        enableEmailNotifications: false,
      };
      setLoadedSettings(resetSettings);
      reset(resetSettings);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col xl:py-8 md:py-6 py-4 gap-8 overflow-auto w-full",
        PADDING_X_LAYOUT,
      )}
    >
      <div className="flex xl:flex-row flex-col items-start gap-4">
        <header className="flex flex-col gap-1 grow">
          <h1 className="text-3xl text-gray-900 font-semibold">การแจ้งเตือน</h1>
          <h4 className="text-gray-600">จัดการประเภทของการแจ้งเตือน</h4>
        </header>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-[1fr] lg:grid-cols-[minmax(140px,280px)_minmax(360px,1280px)] gap-8 mx-auto w-full"
      >
        <Content title="ประเภทการแจ้งเตือน">
          <NotificationLevelSection
            control={control}
            isPushSupported={isSupported}
            browserPermission={browserPermission}
          />
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
              disabled={isSubmitting || isFormSubmitting || !isDirty}
            >
              {isSubmitting || isFormSubmitting
                ? "กำลังบันทึก..."
                : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

const NotificationLevelSection = ({
  control,
  isPushSupported,
  browserPermission,
}: {
  control: Control<NotificationSettingsSchema>;
  isPushSupported: boolean;
  browserPermission: NotificationPermission;
}) => {
  const getPushNotificationStatus = () => {
    if (!isPushSupported) {
      return "ไม่รองรับในเบราว์เซอร์นี้";
    }

    if (browserPermission === "denied" || browserPermission === "default") {
      return "กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์";
    }

    return "";
  };

  const notificationLevelConfigs = [
    {
      name: "enableEmailNotifications",
      label: "การแจ้งเตือนทาง Email",
    },
    {
      name: "enablePushNotifications",
      label: "การแจ้งเตือนแบบ Push Notification",
      disabled: !isPushSupported || browserPermission === "denied",
      statusText: getPushNotificationStatus(),
    },
  ];

  return (
    <SwitchSection
      id={"notification"}
      control={control}
      configs={notificationLevelConfigs}
    />
  );
};
