import api from "@/lib/api";
import {
  getServiceWorkerRegistration,
  isPushNotificationSupported,
} from "@/lib/serviceWorker";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useCallback, useEffect, useState } from "react";

export interface UsePushNotificationReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscriptionCount: number;
  browserPermission: NotificationPermission;
  currentBrowserSubscribed: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export const usePushNotification = (): UsePushNotificationReturn => {
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [browserPermission, setBrowserPermission] =
    useState<NotificationPermission>("default");
  const [currentBrowserSubscribed, setCurrentBrowserSubscribed] =
    useState(false);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      // Check browser permission
      const permission = Notification.permission;
      setBrowserPermission(permission);

      // Get service worker registration with retry for Safari
      let registration = await getServiceWorkerRegistration();

      if (!registration) {
        console.warn("No service worker registration available");
        setIsSubscribed(false);
        return;
      }

      // Check browser subscription
      const subscription = await registration.pushManager.getSubscription();
      const browserSubscribed = !!subscription;
      setCurrentBrowserSubscribed(browserSubscribed);

      // Get backend subscriptions
      const response = await api.pushNotification.getSubscriptions();
      if (response.ok) {
        setSubscriptionCount(response.data.subscriptions);

        // Check if current browser is subscribed in backend
        const currentEndpoint = subscription?.endpoint;
        const backendSubscribed =
          currentEndpoint && response.data.endpoints.includes(currentEndpoint);

        // Push notifications are enabled only if both browser and backend allow
        const fullySubscribed =
          browserSubscribed && !!backendSubscribed && permission === "granted";
        setIsSubscribed(fullySubscribed);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    // Check if push notifications are supported
    if (isPushNotificationSupported()) {
      setIsSupported(true);
      checkSubscriptionStatus();
    } else {
      console.warn("Push notifications not supported in this browser");
      setIsSupported(false);
    }
  }, [user?.id, checkSubscriptionStatus]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user?.id) {
      console.warn("Push notifications not supported or user not logged in");
      return;
    }

    setIsLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Notification permission denied");
        setIsLoading(false);
        return;
      }

      // Get service worker registratio n with retry for Safari
      let registration = await getServiceWorkerRegistration();

      if (!registration) {
        throw new Error("Failed to get service worker registration");
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEYS_PUBLIC_KEY,
      });

      // Send subscription to backend
      const subscriptionJson = subscription.toJSON();
      const subscriptionData = {
        endpoint: subscriptionJson.endpoint!,
        keys: {
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        },
        userAgent: navigator.userAgent,
      };

      const response = await api.pushNotification.subscribe(subscriptionData);
      if (response.ok) {
        setIsSubscribed(true);
        await checkSubscriptionStatus();
      } else {
        throw new Error("Failed to save subscription");
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      addNotification({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปิดใช้งาน Push Notification ได้",
        state: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id, checkSubscriptionStatus, addNotification]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        console.warn(
          "No service worker registration available for unsubscribe",
        );
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove subscription from backend
        const subscriptionJson = subscription.toJSON();
        if (subscriptionJson.endpoint) {
          try {
            await api.pushNotification.unsubscribe(subscriptionJson.endpoint);
          } catch (error) {
            console.warn("Failed to remove subscription from backend:", error);
          }
        }

        setIsSubscribed(false);
        await checkSubscriptionStatus();
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      addNotification({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถปิดใช้งาน Push Notification ได้",
        state: "error",
      });
    }
  }, [checkSubscriptionStatus, addNotification]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscriptionCount,
    browserPermission,
    currentBrowserSubscribed,
    subscribe,
    unsubscribe,
  };
};
