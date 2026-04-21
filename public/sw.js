// Service worker for push notifications

// Push event listener
self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();

      const options = {
        body: data.body || "You have a new notification",
        icon: data.icon || "/pwa/icon-192x192.png",
        badge: data.badge || "/pwa/icon-192x192.png",
        data: data.data || {},
        requireInteraction: false,
        silent: false,
        tag: data.data?.notificationId || ("push-" + Date.now()),
        timestamp: Date.now(),
        vibrate: [200, 100, 200], // Add vibration
        renotify: !!data.data?.notificationId, // Only renotify when using a known tag
      };

      event.waitUntil(
        self.registration
          .showNotification(data.title || "Notification", options)
          .catch((error) => {
            console.error("Error showing notification:", error);
          })
      );
    } catch (error) {
      console.error("Error parsing push data:", error);

      // Fallback notification
      event.waitUntil(
        self.registration.showNotification("Notification", {
          body: "You have a new notification",
          icon: "/pwa/icon-192x192.png",
          badge: "/pwa/icon-192x192.png",
        })
      );
    }
  } else {
    // No data, show default notification
    event.waitUntil(
      self.registration.showNotification("Notification", {
        body: "You have a new notification",
        icon: "/pwa/icon-192x192.png",
        badge: "/pwa/icon-192x192.png",
      })
    );
  }
});

// Notification click event listener
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Default action or 'open' action
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Service worker installation
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

// Service worker activation
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
