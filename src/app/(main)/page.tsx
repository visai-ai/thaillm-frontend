"use client";

import ChatSection from "@/components/sections/chatbot/ChatSection";
import { useChatConversations } from "@/hooks/useChatroom";

import { useRef } from "react";

const Page = () => {
  const chatroomIdRef = useRef<string>(crypto.randomUUID());
  const chatroomId = chatroomIdRef.current;

  const { conversations, isLoading, error, addConversation, editConversation } =
    useChatConversations(chatroomId, false);

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
};

export default Page;
