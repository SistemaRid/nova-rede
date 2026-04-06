importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBYSoz9F_pAgznjUjWmPIPqL_jdCk1CFVY',
  authDomain: 'rede-b5f80.firebaseapp.com',
  projectId: 'rede-b5f80',
  storageBucket: 'rede-b5f80.firebasestorage.app',
  messagingSenderId: '855256737101',
  appId: '1:855256737101:web:c5295b8fdf2970f40a8304'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Nova mensagem';
  const notificationOptions = {
    body: payload.notification?.body || 'Voce recebeu uma nova mensagem',
    icon: '/nova-rede.png',
    badge: '/nova-rede.png',
    data: payload.data || {},
    tag: payload.data?.conversationId || 'ephemeral-message'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
