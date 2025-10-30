// Service Worker の登録と更新管理
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('assets/js/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
        document.getElementById('status').textContent = '✅ PWA 対応済み';
        
        // 更新チェック
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいバージョンが利用可能
              showUpdateNotification();
              // プッシュ通知も送信
              sendUpdatePushNotification();
            }
          });
        });
        
        // 定期的に更新をチェック
        setInterval(() => {
          registration.update();
        }, 60000); // 1分ごと
        
        // 通知許可の確認とプッシュ通知設定
        checkNotificationPermission();
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
        document.getElementById('status').textContent = '❌ PWA 登録失敗';
      });
  });

  // Service Workerからのメッセージを受信
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      window.location.reload();
    }
  });
}

// インストールボタンの制御
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    installBtn.style.display = 'none';
  }
});

window.addEventListener('appinstalled', (evt) => {
  console.log('PWA was installed');
  installBtn.style.display = 'none';
  document.getElementById('status').textContent = '🎉 インストール完了！';
  
  // インストール後に通知許可をリクエスト
  setTimeout(() => {
    requestNotificationPermission();
  }, 2000);
});

// 更新通知の表示
function showUpdateNotification() {
  const updateNotification = document.createElement('div');
  updateNotification.id = 'updateNotification';
  updateNotification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      color: #333;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      text-align: center;
      max-width: 90%;
      animation: slideDown 0.3s ease-out;
    ">
      <div style="margin-bottom: 10px; font-weight: 600;">新しいバージョンが利用可能です</div>
      <button id="updateBtn" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
        margin-right: 10px;
      ">更新</button>
      <button id="dismissBtn" style="
        background: #ccc;
        color: #333;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
      ">後で</button>
    </div>
    <style>
      @keyframes slideDown {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(updateNotification);
  
  // 更新ボタンのイベント
  document.getElementById('updateBtn').addEventListener('click', () => {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
    updateNotification.remove();
  });
  
  // 後でボタンのイベント
  document.getElementById('dismissBtn').addEventListener('click', () => {
    updateNotification.remove();
  });
  
  // 10秒後に自動で消す
  setTimeout(() => {
    if (document.getElementById('updateNotification')) {
      updateNotification.remove();
    }
  }, 10000);
}

// 通知許可の確認
function checkNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('このブラウザは通知をサポートしていません');
    return;
  }
  
  if (Notification.permission === 'default') {
    // まだ許可を求めていない場合、UI表示
    showNotificationRequestUI();
  } else if (Notification.permission === 'granted') {
    // すでに許可済みの場合、プッシュ通知を設定
    subscribeToPushNotifications();
  }
}

// 通知許可リクエスト
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('通知が許可されました');
      subscribeToPushNotifications();
      document.getElementById('status').textContent = '🔔 通知が有効になりました';
    } else {
      console.log('通知が拒否されました');
    }
  });
}

// 通知許可リクエストUIの表示
function showNotificationRequestUI() {
  const notificationUI = document.createElement('div');
  notificationUI.id = 'notificationRequest';
  notificationUI.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      color: #333;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      text-align: center;
      max-width: 95%;
      min-width: 320px;
      animation: slideUp 0.3s ease-out;
    ">
      <div style="margin-bottom: 10px; font-weight: 600;">📱 アプリ更新の通知を受け取りますか？</div>
      <div style="margin-bottom: 10px; font-size: 0.9em; color: #666;">新しいバージョンが利用可能になったらお知らせします</div>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button id="enableNotificationBtn" style="
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          min-width: 100px;
        ">許可する</button>
        <button id="skipNotificationBtn" style="
          background: #ccc;
          color: #333;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          min-width: 100px;
        ">スキップ</button>
      </div>
    </div>
    <style>
      @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      @media (max-width: 480px) {
        #notificationRequest > div {
          max-width: 95vw !important;
          min-width: 280px !important;
          padding: 20px !important;
        }
      }
    </style>
  `;
  
  document.body.appendChild(notificationUI);
  
  // 許可ボタンのイベント
  document.getElementById('enableNotificationBtn').addEventListener('click', () => {
    requestNotificationPermission();
    notificationUI.remove();
  });
  
  // スキップボタンのイベント
  document.getElementById('skipNotificationBtn').addEventListener('click', () => {
    notificationUI.remove();
  });
  
  // 15秒後に自動で消す
  setTimeout(() => {
    if (document.getElementById('notificationRequest')) {
      notificationUI.remove();
    }
  }, 15000);
}

// プッシュ通知の購読
function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('プッシュ通知はサポートされていません');
    return;
  }
  
  navigator.serviceWorker.ready.then(registration => {
    // 既存の購読情報を確認
    return registration.pushManager.getSubscription().then(subscription => {
      if (subscription) {
        console.log('既にプッシュ通知に購読済み');
        return subscription;
      }
      
      // 新規購読
      // VAPIDキーは本来サーバーから取得するが、今回はデモ用の固定値
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NHQ9y8PTWnhp-ZdJ4I2jT5RxXyK2g4vO5zdpVvVJKhXD1H0p_mGdE8';
      
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    });
  }).then(subscription => {
    console.log('プッシュ通知に購読しました:', subscription);
    // 本来はサーバーに購読情報を送信するが、今回はローカルストレージに保存
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
  }).catch(error => {
    console.error('プッシュ通知の購読に失敗:', error);
  });
}

// VAPID キーの変換用ヘルパー関数
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 更新時のプッシュ通知送信
function sendUpdatePushNotification() {
  // プッシュ通知の購読情報を確認
  const subscription = localStorage.getItem('pushSubscription');
  if (!subscription) {
    console.log('プッシュ通知の購読情報がありません');
    return;
  }
  
  // Service Workerに通知送信指示
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Service Worker経由でプッシュ通知を送信
      registration.active.postMessage({
        type: 'SEND_UPDATE_NOTIFICATION',
        data: {
          title: '🔄 PWA アプリが更新されました',
          body: '新しいバージョンが利用可能です。タップして更新してください。',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📱</text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔄</text></svg>',
          tag: 'app-update',
          renotify: true,
          requireInteraction: true
        }
      });
    });
  }
}