"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, XCircleIcon, CircleCheckIcon } from "lucide-react";
import { useNotificationStore } from "@/stores/useNotificationStore";

const NotificationComponent = () => {
  const { notifications, removeNotification } = useNotificationStore();
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newNotifications = notifications.filter(
      (n) => !seenIdsRef.current.has(n.id),
    );

    if (notifications.length > 5) {
      notifications.forEach((n) => removeNotification(n.id));
      seenIdsRef.current.clear();
      return;
    }

    newNotifications.forEach((n) => {
      seenIdsRef.current.add(n.id);
      setTimeout(() => {
        removeNotification(n.id);
        seenIdsRef.current.delete(n.id);
      }, 3000);
    });
  }, [notifications, removeNotification]);

  const getIcon = (state: "info" | "error" | "success") => {
    switch (state) {
      case "success":
        return (
          <div className="border-2 border-success-600/40 outline-success-600/10 p-0.5 outline-2 outline-offset-2 rounded-full flex items-center justify-center">
            <CircleCheckIcon className="size-5 !text-success-600" />
          </div>
        );
      case "error":
        return (
          <div className="border-2 border-error-600/40 outline-error-600/10 p-0.5 outline-2 outline-offset-2 rounded-full flex items-center justify-center">
            <XCircleIcon className="size-5 !text-error-600" />
          </div>
        );
      default:
        return (
          <div className="border-2 border-primary-600/40 outline-primary-600/10 p-0.5 outline-2 outline-offset-2 rounded-full flex items-center justify-center">
            <InfoIcon className="size-5 !text-primary-600" />
          </div>
        );
    }
  };

  const getVariant = (state: "info" | "error" | "success") => {
    switch (state) {
      case "error":
        return "destructive" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="fixed md:bottom-4 bottom-2 z-50 md:w-[calc(100svw_-_324px)] w-[calc(100svw_-_32px)]">
      <div className="px-4 space-y-2 w-full">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3,
              }}
            >
              <Alert
                variant={getVariant(notification.state)}
                className="flex items-start gap-4"
              >
                <div className="shrink-0 absolute top-3 left-3">
                  {getIcon(notification.state)}
                </div>
                <div className="space-y-1 pl-9">
                  <AlertTitle>{notification.title}</AlertTitle>
                  <AlertDescription>
                    {notification.description}
                  </AlertDescription>
                </div>
              </Alert>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationComponent;
