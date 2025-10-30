const CACHE_NAME = 'pwa-cache-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/assets/js/sw.js'
];

// Service Worker のインストール
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // インストール後すぐにアクティブにする（開発時のみ推奨）
        return self.skipWaiting();
      })
  );
});

// Service Worker のアクティベート
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// フェッチイベント（オフライン対応）
self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetch', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュから見つかった場合はそれを返す
        if (response) {
          console.log('Service Worker: Found in cache', event.request.url);
          return response;
        }
        // キャッシュにない場合はネットワークから取得
        return fetch(event.request)
          .then((response) => {
            // レスポンスが有効でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
      .catch(() => {
        // ネットワークエラーの場合、HTMLリクエストなら index.html を返す
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// プッシュ通知（オプション）
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  const options = {
    body: event.data ? event.data.text() : 'プッシュ通知のテストです',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📱</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📱</text></svg>',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('PWA アプリ', options)
  );
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click');
  event.notification.close();
  
  if (event.notification.data && event.notification.data.type === 'app-update') {
    // アプリ更新通知の場合
    if (event.action === 'update') {
      // 今すぐ更新を選択
      event.waitUntil(
        clients.matchAll().then(clients => {
          if (clients.length > 0) {
            // 既存のタブがある場合はフォーカス
            clients[0].focus();
            clients[0].postMessage({ type: 'SKIP_WAITING' });
          } else {
            // 新しいタブを開く
            clients.openWindow('/');
          }
        })
      );
    } else if (event.action === 'dismiss') {
      // 後で更新を選択 - 何もしない
      console.log('Update dismissed');
    } else {
      // 通知本体をクリック
      event.waitUntil(
        clients.matchAll().then(clients => {
          if (clients.length > 0) {
            clients[0].focus();
          } else {
            clients.openWindow('/');
          }
        })
      );
    }
  } else {
    // 通常の通知の場合
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// メッセージ受信（アプリからの更新指示）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received SKIP_WAITING message');
    self.skipWaiting();
    
    // クライアントにリロード指示を送信
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SKIP_WAITING' });
      });
    });
  } else if (event.data && event.data.type === 'SEND_UPDATE_NOTIFICATION') {
    // 更新通知の送信
    console.log('Service Worker: Sending update notification');
    self.registration.showNotification(event.data.data.title, {
      body: event.data.data.body,
      icon: event.data.data.icon,
      badge: event.data.data.badge,
      tag: event.data.data.tag,
      renotify: event.data.data.renotify,
      requireInteraction: event.data.data.requireInteraction,
      actions: [
        {
          action: 'update',
          title: '今すぐ更新'
        },
        {
          action: 'dismiss',
          title: '後で'
        }
      ],
      data: {
        type: 'app-update',
        url: '/'
      }
    });
  }
});