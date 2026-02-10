/**
 * Firebase Cloud Messaging Service Worker
 *
 * This service worker handles background push notifications for the web app.
 * It must be placed in the public directory to be served from the root.
 */

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration (must match the main app config)
const firebaseConfig = {
  apiKey: "AIzaSyC55lowlixG6V8KI-bWV4T-x6MiuNp38-g",
  projectId: "insurance-news-ai",
  authDomain: "insurance-news-ai.firebaseapp.com",
  storageBucket: "insurance-news-ai.firebasestorage.app",
  messagingSenderId: "695640024145",
  appId: "1:695640024145:web:ab17c496e14b3d915ac470",
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

/**
 * Handle background messages
 * This is called when the app is in the background or closed
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'P&C Brief';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    // iOS-style notification options
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
    ],
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Determine the URL to open based on notification data
  let urlToOpen = '/';
  
  if (event.notification.data?.type === 'daily_brief') {
    urlToOpen = '/'; // Daily brief is on the home page
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Handle service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  self.skipWaiting();
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(clients.claim());
});

