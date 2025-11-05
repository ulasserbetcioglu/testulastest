// public/service-worker.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const title = data.title || 'Bildirim';
  const options = {
    body: data.body || 'Yeni bir bildiriminiz var.',
    icon: data.icon || '/ilaclamatik-logo.png', // Uygulamanızın logosu
    badge: data.badge || '/ilaclamatik-logo.png',
    data: data.data || {}, // Bildirimle birlikte gönderilecek ek veriler
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Bildirime tıklandığında yapılacak işlem (örn: uygulamayı açma)
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
