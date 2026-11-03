(() => {
  const status = document.getElementById('offline-state');
  const button = document.getElementById('install-app');
  let installPrompt;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const setStatus = (text, ready=false) => {status.textContent=text;status.classList.toggle('offline-ready',ready);};
  const setButton = () => {button.textContent=standalone()?'App info':'Install app';};
  setButton();
  window.addEventListener('beforeinstallprompt', event => {event.preventDefault();installPrompt=event;});
  window.addEventListener('appinstalled', () => {installPrompt=null;setButton();});
  button.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt=installPrompt;installPrompt=null;
      try {await prompt.prompt();await prompt.userChoice;} catch {}
      return;
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
    const instructions = standalone()
      ? '<p>Your game is already open as an app.</p>'
      : ios
        ? '<ol><li>Open this address in Safari.</li><li>Tap the Share button, then <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>, then open Daily Grid from its new icon.</li></ol>'
        : '<p>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, if available.</p>';
    document.getElementById('modalbody').innerHTML=`<h2>Your pocket crossword.</h2>${instructions}<p>Open the app once while connected and wait for <strong>Ready offline · 20 puzzles</strong> below the game. Then you can reopen it without a connection.</p><p>Your progress stays on this device. Clearing browser data may remove your progress and offline copy.</p>`;
    document.getElementById('modal').showModal();
  });
  const checkOffline = worker => new Promise(resolve => {
    if (!worker) return resolve(false);
    const channel=new MessageChannel();
    const timeout=setTimeout(()=>{channel.port1.close();resolve(false);},8000);
    channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();resolve(event.data?.ready===true);};
    worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
  });
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    setStatus('Offline saving unavailable in this browser');return;
  }
  async function register() {
    setStatus('Saving for offline play…');
    const timeout=setTimeout(()=>setStatus('Offline copy not ready · reopen while connected'),45000);
    try {
      await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      const registration=await navigator.serviceWorker.ready;
      if (await checkOffline(registration.active)) setStatus('Ready offline · 20 puzzles',true);
      else setStatus('Offline copy not ready · reopen while connected');
    } catch {setStatus('Offline copy not saved · reopen while connected');}
    finally {clearTimeout(timeout);}
  }
  window.addEventListener('online',register);
  register();
})();
