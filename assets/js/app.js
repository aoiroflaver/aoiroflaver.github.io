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
            }
          });
        });
        
        // 定期的に更新をチェック
        setInterval(() => {
          registration.update();
        }, 60000); // 1分ごと
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