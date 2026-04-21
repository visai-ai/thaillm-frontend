"use client";

import { SidebarItem } from "@/@types/sidebar";
import NotificationComponent from "@/components/common/Notification";
import Navbar from "@/components/layout/main/Navbar";
import Sidebar from "@/components/layout/main/Sidebar";
import { CookieSettingsProvider } from "@/components/sections/settings/CookieSettingsProvider";
import PushNotificationManager from "@/components/sections/settings/PushNotificationManager";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  useCreateChatRoom,
  useDeleteChatRoom,
  useQueryListChatroom,
} from "@/hooks/useChatroom";
import useAuth from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarHeart,
  MessageSquare,
  MoreVertical,
  Pill,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  UpdateUserProfileModal,
  UpdateUserProfileSchema,
  updateUserProfileSchema,
  SirirajPersonalInfoModal,
  ParticipantInformationSheetModal,
  SirirajConsentModal,
  hasMedicalSirirajInPath,
} from "../settings/profile/UpdateUserProfileForm";

function hasFilledPersonalInfo(
  personalInfo: Record<string, unknown> | null | undefined,
): boolean {
  if (personalInfo == null || typeof personalInfo !== "object") return false;
  const o = personalInfo as Record<string, unknown>;
  const hasAge =
    typeof o.age === "number" && !Number.isNaN(o.age) && o.age >= 1;
  const hasPhone = typeof o.phone === "string" && o.phone.trim().length > 0;
  const hasAddress =
    typeof o.addressLine === "string" &&
    (o.addressLine as string).trim().length > 0;
  return !!(hasAge && hasPhone && hasAddress);
}

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isSirirajPersonalInfoModalOpen, setSirirajPersonalInfoModalOpen] =
    useState(false);
  const [
    isParticipantInformationSheetModalOpen,
    setParticipantInformationSheetModalOpen,
  ] = useState(false);
  const [isSirirajConsentModalOpen, setSirirajConsentModalOpen] =
    useState(false);

  const formMethods = useForm<UpdateUserProfileSchema>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = formMethods;

  const { getMe } = useAuth();
  const getMeRef = useRef(getMe);
  getMeRef.current = getMe;
  useEffect(() => {
    let cancelled = false;
    const perform = async () => {
      const resp = await getMeRef.current();
      if (cancelled) return;
      if (resp.ok && resp.data) {
        const data = resp.data as typeof resp.data & {
          personalInfo?: Record<string, unknown> | null;
          sirirajInfoSheetConsentAt?: string | null;
          sirirajConsentAt?: string | null;
        };
        if (!data.firstName || !data.lastName) {
          setProfileModalOpen(true);
        } else if (
          hasMedicalSirirajInPath() &&
          !hasFilledPersonalInfo(data.personalInfo)
        ) {
          setSirirajPersonalInfoModalOpen(true);
        } else if (
          hasMedicalSirirajInPath() &&
          hasFilledPersonalInfo(data.personalInfo)
        ) {
          if (!data.sirirajInfoSheetConsentAt) {
            setParticipantInformationSheetModalOpen(true);
          } else if (!data.sirirajConsentAt) {
            setSirirajConsentModalOpen(true);
          }
        }
      }
    };
    perform();
    return () => {
      cancelled = true;
    };
  }, []);

  const items: SidebarItem[] = [
    {
      title: "แชทบอท",
      path: "/",
      icon: MessageSquare,
    },
    {
      title: "รายการแจ้งเตือนยา",
      path: "/app/medical-reminder",
      icon: Pill,
    },
    {
      title: "รายการนัดหมายแพทย์",
      path: "/app/appointment",
      icon: CalendarHeart,
    },
  ];

  const isChatroomPage = !pathname.startsWith("/app/");
  const { data: chatrooms, isLoading } = useQueryListChatroom(isChatroomPage);
  const createChatRoomMutation = useCreateChatRoom();
  const deleteChatRoomMutation = useDeleteChatRoom();
  const queryClient = useQueryClient();

  // Listen for chatroom refresh broadcasts from other tabs
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }

    const channel = new BroadcastChannel("chat-store-sync");

    channel.onmessage = (event) => {
      const message = event.data;

      // Handle chatroom refresh from other tabs
      if (message.type === "REFRESH_CHATROOMS") {
        queryClient.invalidateQueries({ queryKey: ["chatroom"] });
      }
    };

    return () => {
      channel.close();
    };
  }, [queryClient]);

  // Component for chat room menu with delete option
  const ChatRoomMenu = ({
    chatRoomId,
    chatRoomName,
  }: {
    chatRoomId: string;
    chatRoomName: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async () => {
      try {
        await deleteChatRoomMutation.mutateAsync(chatRoomId);
        setIsOpen(false);

        // If we're currently viewing the deleted chat room, redirect to chatbot main page
        if (pathname === `/${chatRoomId}`) {
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to delete chat room:", error);
      }
    };

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="icon" size="sm" className="h-6 w-6 p-0 mr-2">
            <MoreVertical className="h-3 w-3 text-primary-400 group-hover/menu-item:text-primary-300" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="right" className="w-40 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={deleteChatRoomMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteChatRoomMutation.isPending ? "กำลังลบ..." : "ลบแชท"}
          </Button>
        </PopoverContent>
      </Popover>
    );
  };

  const formattedChatRoomMenuItems: SidebarItem[] =
    isChatroomPage && chatrooms
      ? [
          {
            title: createChatRoomMutation.isPending
              ? "กำลังสร้าง..."
              : "สร้างแชทใหม่",
            onClick: async () => {
              if (createChatRoomMutation.isPending) return;

              try {
                const newChatRoom = await createChatRoomMutation.mutateAsync(
                  {},
                );

                if (newChatRoom) {
                  router.push(`/${newChatRoom.id}`);
                }
              } catch (error) {
                console.error("Failed to create chat room:", error);
              }
            },
            className: `border border-primary-500 text-center justify-center mb-2 bg-transparent! ${
              createChatRoomMutation.isPending
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`,
            linkClassName: "justify-center",
          },
          ...chatrooms.map((item) => ({
            title: item.name,
            path: `/${item.id}`,
            rightComponent: item.id ? (
              <ChatRoomMenu chatRoomId={item.id} chatRoomName={item.name} />
            ) : null,
          })),
        ]
      : [];

  return (
    <>
      <PushNotificationManager>
        <SidebarProvider className="h-svh overflow-hidden flex flex-col">
          {/* navbar */}
          <Navbar />
          <div className="flex grow h-[calc(100svh_-_72px)]">
            {/* sidebar */}
            <Sidebar
              sidebarMenuItems={items}
              childSidebarMenuItems={
                isChatroomPage ? formattedChatRoomMenuItems : []
              }
              isChildSidebarLoading={isChatroomPage ? isLoading : false}
            />
            <div className="relative grow h-[inherit] overflow-hidden flex bg-white">
              <div className="overflow-y-auto overflow-x-hidden w-full rounded-2xl flex relative z-10">
                {children}
              </div>
              <div className="absolute bottom-[-50%] left-0 bg-secondary-400 opacity-[0.4] w-[70%] h-[533px] blur-[260px] rounded-full z-1"></div>
              <div className="absolute bottom-[-60%] right-0 bg-[#8257C4] opacity-[0.4] w-[70%] h-[533px] blur-[260px] rounded-full z-0"></div>
              <NotificationComponent />
            </div>
          </div>
        </SidebarProvider>
        <FormProvider {...formMethods}>
          <UpdateUserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            onProfileSuccess={() => setSirirajPersonalInfoModalOpen(true)}
          />
          <SirirajPersonalInfoModal
            isOpen={isSirirajPersonalInfoModalOpen}
            onClose={() => setSirirajPersonalInfoModalOpen(false)}
            onSuccess={() => {
              setSirirajPersonalInfoModalOpen(false);
              if (user?.sirirajInfoSheetConsentAt) {
                if (!user?.sirirajConsentAt) {
                  setSirirajConsentModalOpen(true);
                }
              } else {
                setParticipantInformationSheetModalOpen(true);
              }
            }}
          />
          <ParticipantInformationSheetModal
            isOpen={isParticipantInformationSheetModalOpen}
            onClose={() => setParticipantInformationSheetModalOpen(false)}
            onBackToPersonalInfo={() => {
              setParticipantInformationSheetModalOpen(false);
              setSirirajPersonalInfoModalOpen(true);
            }}
            onConsentSuccess={async () => {
              const resp = await getMe();
              if (resp.ok && resp.data && !resp.data.sirirajConsentAt) {
                setSirirajConsentModalOpen(true);
              }
            }}
          />
          <SirirajConsentModal
            isOpen={isSirirajConsentModalOpen}
            onClose={() => setSirirajConsentModalOpen(false)}
            onBackToPersonalInfo={() => {
              setSirirajConsentModalOpen(false);
              setSirirajPersonalInfoModalOpen(true);
            }}
            onConsentSuccess={() => getMe()}
          />
        </FormProvider>
        <CookieSettingsProvider />
      </PushNotificationManager>
    </>
  );
}
