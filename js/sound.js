/* KALESH.EXE — SFX.EXE
   Every sound is synthesized live with WebAudio. No copyrighted clips, no files to load.
   Sound is OFF by default. All effects respect the sound switch. */
(function () {
  let ctx = null, out = null;
  let enabled = false;
  let uploadClip;
  let broadcastClip;
  let clipTimer;
  function stopClip() {
    clearTimeout(clipTimer);
    broadcastClip?.pause();
  }
  function playClip(url, seconds) {
    if (!enabled) return;
    uploadClip?.pause();
    stopClip();
    broadcastClip = new Audio(url);
    broadcastClip.volume = 0.5;
    broadcastClip.play().catch(() => {});
    if (seconds) clipTimer = setTimeout(stopClip, seconds * 1000);
  }
  try { enabled = localStorage.getItem('kalesh-sound') === 'on'; } catch {}

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      const comp = ctx.createDynamicsCompressor();
      out = ctx.createGain();
      out.gain.value = 0.55;
      out.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone({ type = 'sine', f = 440, f2, dur = 0.2, vol = 0.2, delay = 0, attack = 0.005, lp, vib }) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    if (vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = vib.rate; lg.gain.value = vib.depth;
      l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
    node.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise({ dur = 0.4, vol = 0.3, delay = 0, from = 4000, to = 200, type = 'lowpass' }) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur);
  }

  const SOUNDS = {
    // the legendary deep "boom"
    boom() { tone({ f: 120, f2: 38, dur: 1.1, vol: 0.9 }); tone({ type: 'triangle', f: 240, f2: 60, dur: 0.45, vol: 0.35 }); noise({ dur: 0.35, vol: 0.35, from: 600, to: 60 }); },
    // stadium air horn: short short looooong
    airhorn() {
      [[0, 0.16], [0.2, 0.16], [0.4, 0.75]].forEach(([d, len]) => {
        [440, 443, 554, 880].forEach((f, i) => tone({ type: 'sawtooth', f, dur: len, vol: i === 3 ? 0.05 : 0.12, delay: d, attack: 0.01, lp: 2600 }));
      });
    },
    bruh() { tone({ type: 'sawtooth', f: 170, f2: 95, dur: 0.55, vol: 0.3, lp: 700 }); tone({ type: 'square', f: 85, f2: 50, dur: 0.55, vol: 0.12, lp: 400 }); },
    sad() { [392, 370, 349].forEach((f, i) => tone({ type: 'sawtooth', f, dur: 0.38, vol: 0.18, delay: i * 0.4, lp: 1200 })); tone({ type: 'sawtooth', f: 330, dur: 1.2, vol: 0.18, delay: 1.2, lp: 1200, vib: { rate: 6, depth: 9 } }); },
    // Indian news channel siren + "dhan dhan" hits
    siren() {
      const c = ac(); if (!c) return;
      for (let i = 0; i < 4; i++) { tone({ type: 'triangle', f: 680, f2: 1350, dur: 0.38, vol: 0.22, delay: i * 0.5 }); tone({ type: 'triangle', f: 1350, f2: 680, dur: 0.12, vol: 0.2, delay: i * 0.5 + 0.38 }); }
      noise({ dur: 0.5, vol: 0.25, from: 300, to: 6000, type: 'bandpass', delay: 2.0 });
      SOUNDS.hit(2.45); SOUNDS.hit(2.75);
    },
    hit(delay = 0) { tone({ f: 150, f2: 45, dur: 0.5, vol: 0.85, delay }); noise({ dur: 0.18, vol: 0.4, from: 3000, to: 200, delay }); },
    // TV serial dramatic zoom: dhum. dhum. DHUMMM.
    serial() { SOUNDS.hit(0); SOUNDS.hit(0.42); tone({ f: 110, f2: 40, dur: 1.6, vol: 0.9, delay: 0.84 }); noise({ dur: 1.2, vol: 0.3, from: 5000, to: 100, delay: 0.84 }); tone({ type: 'sawtooth', f: 220, dur: 1.3, vol: 0.06, delay: 0.84, lp: 900, vib: { rate: 7, depth: 6 } }); },
    coin() { tone({ type: 'square', f: 988, dur: 0.08, vol: 0.12 }); tone({ type: 'square', f: 1319, dur: 0.35, vol: 0.12, delay: 0.08 }); },
    powerup() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: 'square', f, dur: 0.09, vol: 0.1, delay: i * 0.07 })); },
    quack() { [0, 0.18].forEach(d => { tone({ type: 'sawtooth', f: 950, f2: 480, dur: 0.14, vol: 0.22, delay: d, lp: 1800 }); }); },
    roar() { tone({ type: 'sawtooth', f: 140, f2: 70, dur: 0.9, vol: 0.25, lp: 600, vib: { rate: 22, depth: 18 } }); noise({ dur: 0.9, vol: 0.2, from: 900, to: 200 }); },
    dhamaka() { noise({ dur: 1.4, vol: 0.7, from: 2500, to: 40 }); tone({ f: 90, f2: 30, dur: 1.3, vol: 0.9 }); },
    pop() { tone({ f: 520 + Math.random() * 300, f2: 1300, dur: 0.07, vol: 0.12 }); },
    error() { tone({ type: 'square', f: 440, dur: 0.12, vol: 0.1 }); tone({ type: 'square', f: 330, dur: 0.25, vol: 0.1, delay: 0.13 }); },
    tada() { [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.6, vol: 0.12, delay: i * 0.03 })); tone({ type: 'triangle', f: 1047, dur: 0.9, vol: 0.12, delay: 0.25 }); }
  };

  window.SFX = {
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      if (out) out.gain.value = enabled ? 0.55 : 0;
      if (!enabled) uploadClip?.pause();
      if (!enabled) stopClip();
      try { localStorage.setItem('kalesh-sound', enabled ? 'on' : 'off'); } catch {}
      if (enabled) SOUNDS.coin();
      return enabled;
    },
    /** plays only if the user turned sound on */
    play(name) { if (enabled && SOUNDS[name]) try { SOUNDS[name](); } catch {} },
    clip: playClip,
    stopClip,
    upload() {
      if (!enabled) return;
      stopClip();
      uploadClip ||= new Audio('assets/sounds/huss-recreation.mp3');
      uploadClip.currentTime = 0;
      uploadClip.volume = 0.7;
      uploadClip.play().catch(() => window.SFX.play('coin'));
    },
    force(name) { window.SFX.play(name); },
    names: Object.keys(SOUNDS).filter(n => n !== 'hit')
  };
})();
