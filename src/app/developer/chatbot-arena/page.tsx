import { cn } from "@/lib/utils";
import { PADDING_X_LAYOUT } from "@/constant/common";

import ChatArenaSection from "@/components/layout/chatbotArena/ChatArenaSection";

const ChatbotArena = () => {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 xl:py-8 md:py-6 py-4 overflow-auto w-full h-full">
      <header className={cn("flex flex-col gap-1 shrink-0", PADDING_X_LAYOUT)}>
        <h1 className="text-3xl text-gray-900 font-semibold">Chatbot Arena</h1>
        <h4 className="text-gray-600">
          ทดลองเปรียบเทียบคำตอบจาก 2 โมเดลที่แตกต่างกัน
        </h4>
      </header>
      <ChatArenaSection className="relative grow min-h-[540px]" />
    </div>
  );
};

export default ChatbotArena;
