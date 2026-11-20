/* KALESH.EXE — CHAOS ENGINE
   Meme stickers, popup windows, BREAKING NEWS slams, meme rain, serial zooms.
   Rule: chaos never blocks scrolling, posting or navigation. Everything is pointer-events:none
   or closable, and reduced-motion users get the calm version. */
(function () {
  const C = window.KALESH_CONTENT;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let chaosOn = true;
  try { chaosOn = localStorage.getItem('kalesh-chaos') !== 'off'; } catch {}

  function layer() {
    let l = document.getElementById('chaos-layer');
    if (!l) { l = document.createElement('div'); l.id = 'chaos-layer'; document.body.append(l); }
    return l;
  }

  /** small sticker that pops where you clicked */
  function sticker(x, y, text) {
    if (!chaosOn) return;
    const s = document.createElement('div');
    s.className = 'chaos-sticker';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.setProperty('--r', (Math.random() * 30 - 15).toFixed(1) + 'deg');
    s.innerHTML = `<span>${esc(pick(C.stickerEmoji))}</span>${esc(text || pick(C.stickers))}`;
    layer().append(s);
    setTimeout(() => s.remove(), 1100);
  }

  /** a retro popup window with a random meme, closable, never more than one */
  function popup(meme) {
    if (!chaosOn && !meme) return;
    document.querySelector('.chaos-popup')?.remove();
    const m = meme || pick(window.KALESH_MEMES?.() || C.memes);
    const w = document.createElement('div');
    w.className = 'chaos-popup';
    w.setAttribute('role', 'status');
    const left = 12 + Math.random() * Math.max(10, window.innerWidth - 330);
    const top = 90 + Math.random() * Math.max(10, window.innerHeight - 330);
    w.style.left = left + 'px'; w.style.top = top + 'px';
    w.innerHTML = `<div class="win-bar"><span>${esc(m[0])} MEME_${Math.floor(Math.random() * 900 + 100)}.EXE</span><button type="button" aria-label="Close meme popup">✕</button></div>
      <div class="win-body">${m[4] ? `<img src="${esc(m[4])}" alt="">` : `<div class="win-emoji">${esc(m[0])}</div>`}<b>${esc(m[1])}</b><p>${esc(m[2])}</p></div>`;
    w.querySelector('button').onclick = () => w.remove();
    document.body.append(w);
    window.SFX?.play(m[3] || 'pop');
    setTimeout(() => w.isConnected && w.classList.add('chaos-popup-out'), 9000);
    setTimeout(() => w.remove(), 9600);
  }

  /** full-width Indian-news-channel BREAKING NEWS slam */
  function breaking(headline, withSiren) {
    if (withSiren) window.SFX?.force('siren'); else window.SFX?.play('hit');
    if (reduced()) { window.KALESH_TOAST?.('🚨 BREAKING: ' + headline); return; }
    document.querySelector('.breaking-flash')?.remove();
    const b = document.createElement('div');
    b.className = 'breaking-flash';
    b.innerHTML = `<div class="bf-band bf-red">BREAKING NEWS · BREAKING NEWS · BREAKING NEWS · BREAKING NEWS · BREAKING NEWS ·</div>
      <div class="bf-center"><span class="bf-label">🚨 BREAKING 🚨</span><strong>${esc(headline)}</strong><em>KALESH TAK · SABSE TEZ · SABSE FALTU</em></div>
      <div class="bf-band bf-yellow">SABSE PEHLE · SABSE TEZ · SABSE FALTU · SABSE PEHLE · SABSE TEZ · SABSE FALTU ·</div>`;
    document.body.append(b);
    setTimeout(() => b.remove(), 2600);
  }

  /** emoji rain */
  function rain(emojis) {
    window.SFX?.play('airhorn');
    if (reduced()) return;
    const set = emojis || ['🐈', '🦆', '💥', '🌶️', '🗿', '🍿', '🔥', '💀'];
    for (let i = 0; i < 42; i++) {
      const d = document.createElement('div');
      d.className = 'meme-drop';
      d.textContent = pick(set);
      d.style.left = Math.random() * 100 + 'vw';
      d.style.animationDelay = (Math.random() * 1.4).toFixed(2) + 's';
      d.style.fontSize = (22 + Math.random() * 34).toFixed(0) + 'px';
      layer().append(d);
      setTimeout(() => d.remove(), 4200);
    }
  }

  /** the TV-serial triple dramatic zoom */
  function serialZoom() {
    window.SFX?.force('serial');
    if (reduced()) return;
    const app = document.getElementById('app');
    app.classList.remove('serial-zoom'); void app.offsetWidth; app.classList.add('serial-zoom');
    setTimeout(() => app.classList.remove('serial-zoom'), 2300);
  }

  function shake(el) {
    if (!el || reduced()) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }

  // Random meme popup now and then (only while the tab is visible & user is logged in to the feed)
  let popupTimer;
  function schedulePopups() {
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => {
      if (chaosOn && !document.hidden && document.querySelector('.main-shell') && !document.querySelector('.modal-backdrop')) popup();
      schedulePopups();
    }, 45000 + Math.random() * 40000);
  }

  // Random click stickers on non-interactive spots (1 in 3 clicks so it stays a surprise)
  document.addEventListener('click', e => {
    if (!document.querySelector('.main-shell')) return;
    if (e.target.closest('button,a,input,textarea,select,label,.chaos-popup,.modal-backdrop')) return;
    if (Math.random() < 0.34) { sticker(e.clientX, e.clientY); window.SFX?.play('pop'); }
  });

  // Typed secret words anywhere (outside inputs)
  let typed = '';
  const words = {
    kalesh: () => rain(),
    billi: () => rain(['🐈', '😼', '🐱', '😹', '🙀']),
    quack: () => { rain(['🦆', '🦆', '🦆', '🥚']); window.SFX?.play('quack'); },
    siren: () => breaking('KISI NE KEYBOARD PE "SIREN" LIKHA', true),
    drama: () => serialZoom(),
    aura: () => { sticker(innerWidth / 2, innerHeight / 2, '+999 AURA'); window.SFX?.play('boom'); }
  };
  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    for (const w in words) if (typed.endsWith(w)) { typed = ''; words[w](); window.KALESH_ACHIEVE?.('typist'); }
  });

  // Doom-scroll detector
  let scrolled = 0, warned = false;
  addEventListener('scroll', () => {
    scrolled++;
    if (!warned && scrolled > 900) { warned = true; window.KALESH_TOAST?.('🧃 Mummy ko pata hai tu kya kar raha hai?'); window.SFX?.play('siren'); }
  }, { passive: true });

  window.Chaos = {
    sticker, popup, breaking, rain, serialZoom, shake, schedulePopups,
    get on() { return chaosOn; },
    toggle() { chaosOn = !chaosOn; try { localStorage.setItem('kalesh-chaos', chaosOn ? 'on' : 'off'); } catch {} return chaosOn; }
  };
})();
