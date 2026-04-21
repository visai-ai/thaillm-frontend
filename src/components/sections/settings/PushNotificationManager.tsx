"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePushNotification } from "@/hooks/usePushNotification";

interface PushNotificationManagerProps {
  children: React.ReactNode;
}

export default function PushNotificationManager({
  children,
}: PushNotificationManagerProps) {
  const { user } = useAuthStore();
  const { isSupported, isSubscribed, subscribe } = usePushNotification();

  useEffect(() => {
    // Auto-subscribe when user logs in and push notifications are supported
    if (isSupported && user?.id && !isSubscribed) {
      subscribe();
    }
  }, [isSupported, user?.id, isSubscribed, subscribe]);

  return <>{children}</>;
}
