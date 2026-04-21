/**
 * Service Worker Registration Utility
 * Handles service worker registration with Safari compatibility
 */

import { getBasePath } from "@/lib/config";

export interface ServiceWorkerRegistrationResult {
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

/**
 * Check if service workers are supported in the current browser
 */
export function isServiceWorkerSupported(): boolean {
  return "serviceWorker" in navigator;
}

/**
 * Check if push notifications are supported in the current browser
 */
export function isPushNotificationSupported(): boolean {
  return isServiceWorkerSupported() && "PushManager" in window;
}

/**
 * Check if the current browser is Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Register service worker with Safari compatibility
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  if (!isServiceWorkerSupported()) {
    return {
      registration: null,
      error: new Error("Service workers are not supported in this browser"),
    };
  }

  try {
    // Get base path for service worker registration
    const basePath = getBasePath();
    const swPath = basePath ? `${basePath}/sw.js` : "/sw.js";
    const scope = basePath ? `${basePath}/` : "/";

    // Check if service worker is already registered
    const existingRegistration =
      await navigator.serviceWorker.getRegistration(scope);
    if (existingRegistration) {
      console.log("Service worker already registered:", existingRegistration);
      return {
        registration: existingRegistration,
        error: null,
      };
    }

    // For Safari, we need to ensure the service worker is properly registered
    // Safari has stricter requirements for service worker registration
    const registration = await navigator.serviceWorker.register(swPath, {
      scope: scope,
      updateViaCache: "none", // Ensure fresh service worker in Safari
    });

    // Wait for the service worker to be ready with timeout for Safari
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Service worker ready timeout")),
        10000,
      ),
    );

    await Promise.race([readyPromise, timeoutPromise]);

    console.log("Service worker registered successfully:", registration);

    return {
      registration,
      error: null,
    };
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return {
      registration: null,
      error: error as Error,
    };
  }
}

/**
 * Get the current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    // Get base path for service worker registration
    const basePath = getBasePath();
    const scope = basePath ? `${basePath}/` : "/";

    // First try to get existing registration
    const existingRegistration =
      await navigator.serviceWorker.getRegistration(scope);

    if (existingRegistration) {
      return existingRegistration;
    }

    // If no existing registration, try to register
    const result = await registerServiceWorker();
    return result.registration;
  } catch (error) {
    console.error("Failed to get service worker registration:", error);
    return null;
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorkers(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
    console.log("All service workers unregistered");
    return true;
  } catch (error) {
    console.error("Failed to unregister service workers:", error);
    return false;
  }
}
