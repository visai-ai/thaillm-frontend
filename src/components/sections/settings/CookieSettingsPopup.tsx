"use client";

import { Modal } from "@/components/common/CustomModal";
import { cookieConfigs } from "@/components/sections/settings/CookieSection";
import SwitchSection from "@/components/sections/settings/SwitchSection";
import { Button } from "@/components/ui/button";
import { CookieSettings, CookieUtils } from "@/lib/utils/cookieUtils";
import { useNotificationStore } from "@/stores/useNotificationStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface CookieSettingsPopupProps {
  onClose: () => void;
}

const CookieSettingsModal = ({
  setShowModal,
  handleCloseCookiePopup,
}: {
  setShowModal: (show: boolean) => void;
  handleCloseCookiePopup: () => void;
}) => {
  const { addNotification } = useNotificationStore();
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<CookieSettings>({
    defaultValues: {
      cookieRequire: true,
      cookieAnalytic: false,
      cookieMarketing: false,
    },
  });

  // Load current cookie settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await CookieUtils.loadCookieSettings();
        reset(settings);
      } catch (error) {
        console.error("Error loading cookie settings:", error);
      }
    };
    loadSettings();
  }, [reset]);

  const onSubmit = async (data: CookieSettings) => {
    try {
      setIsSaving(true);
      await CookieUtils.saveCookieSettings(data);
      addNotification({
        state: "success",
        title: "บันทึกการตั้งค่า",
        description: "บันทึกการตั้งค่าคุกกี้สำเร็จ",
      });
      setShowModal(false);
      handleCloseCookiePopup();
    } catch (error) {
      console.error("Error saving cookie settings:", error);
      addNotification({
        state: "error",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการตั้งค่าคุกกี้ได้",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <Modal
      open={true}
      onOpenChange={setShowModal}
      title="การตั้งค่าคุกกี้"
      description="จัดการการใช้งานคุกกี้"
      showCloseButton={true}
      className="w-full sm:max-w-[600px] md:max-w-[500px]"
      body={
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <SwitchSection
            id={"cookie-popup"}
            control={control}
            configs={cookieConfigs}
          />
          <div className="flex gap-2 justify-end pt-4 border-t">
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
              disabled={isSaving}
            >
              {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </div>
        </form>
      }
    />
  );
};

const acceptAllCookies = async () => {
  try {
    await CookieUtils.saveCookieSettings({
      cookieRequire: true,
      cookieAnalytic: true,
      cookieMarketing: true,
    });
  } catch (error) {
    console.error("Error accepting all cookies:", error);
  }
};

export const CookieSettingsPopup = ({ onClose }: CookieSettingsPopupProps) => {
  const [showCookieSettingsModal, setShowCookieSettingsModal] = useState(false);
  return (
    <>
      {showCookieSettingsModal ? (
        <CookieSettingsModal
          setShowModal={setShowCookieSettingsModal}
          handleCloseCookiePopup={onClose}
        />
      ) : (
        <div className="fixed max-w-[400px] bottom-0 flex flex-col gap-4 border border-gray-100 right-0 m-4 z-[1000] md:p-6 p-4 bg-gray-50 shadow-xl rounded-2xl">
          <div>
            <div className="flex justify-between">
              <div className="text-lg font-semibold text-gray-900">
                เราใช้คุกกี้
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              เราใช้คุกกี้เพื่อให้แน่ใจว่าเรามอบประสบการณ์ที่ดีที่สุดให้กับคุณบนเว็บไซต์ของเรา
              และเพื่อรวบรวมข้อมูลเกี่ยวกับวิธีการที่ผู้ใช้โต้ตอบกับเว็บไซต์ของเรา
              <Link href={`/cookie-policy`} className="ml-1 underline">
                นโยบายคุกกี้
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-label="ยอมรับทั้งหมด"
              onClick={() => {
                acceptAllCookies();
                onClose();
              }}
              className="py-2.5 px-6 basis-0 grow text-sm font-semibold rounded-lg border border-primary-600 bg-primary-600 shadow-xs hover:bg-primary-700 disabled:border-primary-200 disabled:bg-primary-200 text-white focus:ring-4 focus:ring-primary-100"
            >
              ยอมรับ
            </button>
            <button
              type="button"
              aria-label="แสดงการตั้งค่าคุกกี้"
              onClick={() => {
                setShowCookieSettingsModal(true);
              }}
              className="py-2.5 px-6 basis-0 grow text-sm font-semibold rounded-lg border border-gray-300 bg-white shadow-xs hover:bg-gray-50 disabled:border-gray-200 text-gray-700 disabled:text-gray-300 focus:ring-4 focus:ring-gray-100"
            >
              ตั้งค่าคุกกี้ของคุณ
            </button>
          </div>
        </div>
      )}
    </>
  );
};
