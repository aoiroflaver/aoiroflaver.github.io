// Service Worker の登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('assets/js/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
        document.getElementById('status').textContent = '✅ PWA 対応済み';
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
        document.getElementById('status').textContent = '❌ PWA 登録失敗';
      });
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