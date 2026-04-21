"use client";

import { useChatConversations } from "@/hooks/useChatroom";
import { useParams } from "next/navigation";

import { LoadingSpinner } from "@/components/common/Loading";
import ChatSection from "@/components/sections/chatbot/ChatSection";

export default function Page() {
  const params = useParams<{ chatroomId: string }>();
  const chatroomId = params?.chatroomId;

  const { conversations, isLoading, error, addConversation, editConversation } =
    useChatConversations(chatroomId!, true);

  if (isLoading && conversations.length === 0)
    return (
      <div className="flex flex-col gap-4 grow h-full items-center justify-center">
        <LoadingSpinner />
        <p className="text-base text-gray-700">กำลังโหลดข้อมูล</p>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col gap-4 grow h-full items-center justify-center">
        <p className="text-base text-gray-700">เกิดข้อผิดพลาด</p>
      </div>
    );

  return (
    <div className="flex grow h-full">
      <ChatSection
        chatroomId={chatroomId}
        conversations={conversations}
        addConversation={addConversation}
        editConversation={editConversation}
      />
    </div>
  );
}
