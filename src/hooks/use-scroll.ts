import { useRef, useEffect, useState, useCallback } from "react";

type UseCheckScrollToBottomOptions = {
  tolerance?: number;
};

export function useCheckScrollToBottom<T extends HTMLElement = HTMLDivElement>(
  options?: UseCheckScrollToBottomOptions,
) {
  const scrollRef = useRef<T>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [triggerScrollToBottom, setTriggerScrollToBottom] = useState(false);
  const { tolerance = 200 } = options || {};

  const checkScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const currentScroll = scrollHeight - scrollTop;

      if (currentScroll <= clientHeight + tolerance) {
        setIsAtBottom(true);
      }
    }
  };

  useEffect(() => {
    let currentScrollElement: T | null = null;

    const initialCheckScroll = async () => {
      await new Promise((r) => setTimeout(r, 500));
      currentScrollElement = scrollRef.current;

      if (currentScrollElement) {
        currentScrollElement.addEventListener("scroll", checkScrollPosition);
      }
    };

    initialCheckScroll();

    return () => {
      if (currentScrollElement) {
        currentScrollElement.removeEventListener("scroll", checkScrollPosition);
      }
    };
  }, [scrollRef.current, checkScrollPosition, triggerScrollToBottom]);

  return { scrollRef, isAtBottom, setTriggerScrollToBottom };
}
