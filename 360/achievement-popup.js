// Achievement notification styled and animated like the dashboard's sign-in toast.
export function createAchievementPopup({ parent = document.body, onShow = () => {} } = {}) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:110;pointer-events:none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <link rel="stylesheet" href="${new URL('./achievement-popup.css', import.meta.url).href}">
    <div class="position"><div class="popup" role="status" aria-live="polite" aria-atomic="true" hidden>
      <div class="toast-window"><div class="toast-copy"><span class="toast-title">Achievement unlocked</span><span class="toast-detail"></span></div></div>
      <div class="toast-symbol" aria-hidden="true">
        <span class="toast-halo"></span>
        <svg class="toast-ring" viewBox="0 0 76 76">
          <defs>
            <linearGradient id="toast-metal" x2="0" y2="1"><stop stop-color="#e0e2df"/><stop offset=".35" stop-color="#737974"/><stop offset="1" stop-color="#343934"/></linearGradient>
            <linearGradient id="toast-green" x2="0" y2="1"><stop stop-color="#c9f878"/><stop offset=".48" stop-color="#91d53e"/><stop offset="1" stop-color="#4b921c"/></linearGradient>
          </defs>
          <circle cx="38" cy="38" r="36" fill="url(#toast-metal)" stroke="#b1b5ae" stroke-width="1"/>
          <circle cx="38" cy="38" r="32.5" fill="#0c100c"/>
          <g fill="none" stroke-width="6.5" stroke="url(#toast-green)">
            <path d="M 9 34 A 29 29 0 0 1 34 9"/><path d="M 42 9 A 29 29 0 0 1 67 34"/>
            <path d="M 67 42 A 29 29 0 0 1 42 67"/><path d="M 34 67 A 29 29 0 0 1 9 42"/>
          </g>
        </svg>
        <div class="toast-face"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 9h18v10c0 7-4 11-9 11s-9-4-9-11V9Zm0 3H8v5c0 7 4 10 10 10M33 12h7v5c0 7-4 10-10 10M24 30v7m-8 3h16m-13-3h10"/></svg></div>
      </div>
    </div></div>`;
  parent.append(host);
  const popup = root.querySelector('.popup');
  const queue = [];
  let timer, active = false;
  function resize() {
    host.style.setProperty('--popup-scale', Math.min(innerWidth / 1280, innerHeight / 720));
  }
  resize();
  window.addEventListener('resize', resize);
  function next() {
    if (active || !queue.length) return;
    active = true;
    const achievement = queue.shift();
    root.querySelector('.toast-detail').textContent = `${achievement.name} · ${achievement.gamerscore} G`;
    popup.hidden = false;
    popup.classList.remove('playing');
    void popup.offsetWidth;
    popup.classList.add('playing');
    try { onShow(achievement); } catch (error) { console.error(error); }
    timer = setTimeout(() => {
      popup.hidden = true;
      timer = setTimeout(() => { active = false; next(); }, 250);
    }, 6200);
  }
  function clear() {
    clearTimeout(timer);
    queue.length = 0;
    active = false;
    popup.hidden = true;
    popup.classList.remove('playing');
  }
  return {
    show(achievement) {
      if (!achievement || typeof achievement.name !== 'string' || !Number.isFinite(achievement.gamerscore)) return;
      queue.push({ name: achievement.name, gamerscore: achievement.gamerscore });
      next();
    },
    clear,
    destroy() { clear(); window.removeEventListener('resize', resize); host.remove(); }
  };
}
