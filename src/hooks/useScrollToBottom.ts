import { Conversation } from "@/stores/useChatStore";
import { useCallback, useEffect, useRef, useState } from "react";

export const useScrollToBottom = ({
  conversations,
}: {
  conversations: Conversation[];
}) => {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (containerRef?.current !== null) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  const scrollIfAutoEnabled = useCallback(() => {
    if (autoScrollEnabled) scrollToBottom();
  }, [autoScrollEnabled, scrollToBottom]);

  // Track user scroll to toggle auto-scroll depending on whether the view is at bottom
  useEffect(() => {
    const ref = containerRef.current;
    if (!ref) return;
    const THRESHOLD_PX = 10;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = ref;
      const isAtBottom =
        scrollHeight - scrollTop - clientHeight <= THRESHOLD_PX;
      setAutoScrollEnabled(isAtBottom);
    };
    ref.addEventListener("scroll", onScroll);
    // Initialize state
    onScroll();
    return () => {
      ref.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Scroll to bottom after the component has fully mounted/rendered
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollIfAutoEnabled();
    });
    return () => cancelAnimationFrame(id);
  }, [scrollIfAutoEnabled]);

  // Scroll to bottom whenever a new conversation item is added
  useEffect(() => {
    scrollIfAutoEnabled();
  }, [conversations, scrollIfAutoEnabled]);

  return { containerRef, scrollIfAutoEnabled };
};
