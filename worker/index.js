self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'The Makeup Store', body: 'New Update!' };
  const options = {
    body: data.body,
    icon: '/icon-192x192.png?v=2',
    badge: '/icon-192x192.png?v=2',
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});


// --- ADMIN PUSH LOGIC ---
self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icon-192x192.png?v=2',
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'admin-order-notification',
      renotify: true,
      data: { url: data.url }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (err) {
    console.error("Push payload error:", err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});