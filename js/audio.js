// =====================================================================
//  AUDIO — every sound and every tune is synthesised live (Web Audio).
// =====================================================================
const AUDIO = (() => {
  let ctx = null, master, musicBus, sfxBus, muted = false;
  let musicVol = 0.32, sfxVol = 0.55;
  let track = null, trackName = null, timer = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    // a little room reverb made from a feedback delay
    const delay = ctx.createDelay(); delay.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol; musicBus.connect(master); musicBus.connect(delay);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
    if (trackName) { const n = trackName; trackName = null; music(n); }
  }

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    if (!m) return 0;
    let midi = (parseInt(m[3]) + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function tone(f, t, dur, type = 'square', vol = 0.2, dest = sfxBus, o = {}) {
    if (!ctx || !f) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib; lg.gain.value = f * 0.03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1);
    }
    const a = o.a ?? 0.008, r = o.r ?? Math.min(0.12, dur * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(t, dur, vol = 0.2, fq = 3000, type = 'bandpass', dest = sfxBus, slide) {
    if (!ctx) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(fq, t); f.Q.value = 1.2;
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------- SFX
  const SFX = {
    step(t) { noise(t, 0.05, 0.05, 900 + Math.random() * 300, 'lowpass'); },
    leaf(t) { noise(t, 0.09, 0.07, 2500 + Math.random() * 1500, 'bandpass'); },
    jump(t) { tone(260, t, 0.16, 'square', 0.08, sfxBus, { slide: 620 }); },
    land(t) { noise(t, 0.08, 0.12, 500, 'lowpass'); },
    blip(t, p = 1) { tone(520 * p + Math.random() * 30, t, 0.035, 'square', 0.035); },
    pick(t) { [0, 4, 7, 12].forEach((s, i) => tone(523 * Math.pow(2, s / 12), t + i * 0.06, 0.12, 'square', 0.07)); },
    coin(t) { tone(988, t, 0.07, 'square', 0.06); tone(1319, t + 0.07, 0.18, 'square', 0.06); },
    combine(t) { [0, 7, 12, 16, 19, 24].forEach((s, i) => tone(392 * Math.pow(2, s / 12), t + i * 0.05, 0.16, 'triangle', 0.12)); },
    quest(t) { [[0, .12], [4, .12], [7, .12], [12, .4]].forEach(([s, d], i) => { tone(392 * Math.pow(2, s / 12), t + i * 0.12, d, 'square', 0.07); tone(196 * Math.pow(2, s / 12), t + i * 0.12, d, 'triangle', 0.1); }); },
    done(t) { [[0, .1], [4, .1], [7, .1], [12, .1], [7, .1], [12, .5]].forEach(([s, d], i) => { tone(523 * Math.pow(2, s / 12), t + i * 0.1, d + 0.05, 'square', 0.07); }); tone(262, t, 1.1, 'triangle', 0.12); },
    level(t) { [0, 4, 7, 11, 12, 16, 19, 24].forEach((s, i) => tone(330 * Math.pow(2, s / 12), t + i * 0.07, 0.25, 'square', 0.06)); tone(165, t, 0.9, 'triangle', 0.15); },
    door(t) { noise(t, 0.25, 0.15, 300, 'lowpass'); tone(110, t, 0.2, 'triangle', 0.1); },
    hoot(t) { tone(392, t, 0.28, 'sine', 0.22, sfxBus, { slide: 350, vib: 7 }); tone(392, t + 0.4, 0.45, 'sine', 0.22, sfxBus, { slide: 330, vib: 7 }); },
    tweet(t) { for (let i = 0; i < 4; i++) tone(2400 + (i % 2) * 400, t + i * 0.09, 0.07, 'sine', 0.08, sfxBus, { slide: 3200 }); },
    crack(t) { noise(t, 0.12, 0.35, 1800, 'highpass'); noise(t + 0.03, 0.2, 0.2, 700, 'bandpass'); },
    pop(t) { tone(500, t, 0.09, 'sine', 0.25, sfxBus, { slide: 1300 }); },
    roar(t) { noise(t, 1.0, 0.3, 300, 'lowpass', sfxBus, 120); tone(90, t, 0.9, 'sawtooth', 0.12, sfxBus, { slide: 60 }); },
    splash(t) { noise(t, 0.45, 0.3, 1200, 'bandpass', sfxBus, 300); },
    hurt(t) { tone(220, t, 0.2, 'square', 0.1, sfxBus, { slide: 90 }); },
    flash(t) { [0, 5, 9, 12, 17, 21].forEach((s, i) => tone(880 * Math.pow(2, s / 12), t + i * 0.025, 0.4, 'sine', 0.06)); noise(t, 0.4, 0.08, 6000, 'highpass'); },
    eep(t) { tone(900, t, 0.12, 'square', 0.06, sfxBus, { slide: 1600 }); },
    no(t) { tone(160, t, 0.12, 'square', 0.07); tone(130, t + 0.12, 0.18, 'square', 0.07); },
    flap(t) { noise(t, 0.18, 0.18, 600, 'bandpass', sfxBus, 250); },
    ding(t) { tone(1568, t, 0.5, 'sine', 0.12); tone(2093, t + 0.02, 0.6, 'sine', 0.06); },
    magic(t) { for (let i = 0; i < 10; i++) tone(600 + i * 110, t + i * 0.04, 0.3, 'sine', 0.05); },
    hum(t) { tone(55, t, 2.2, 'sawtooth', 0.05, sfxBus, { vib: 3 }); tone(82, t, 2.2, 'sine', 0.08); },
    sip(t) { noise(t, 0.3, 0.08, 1400, 'bandpass', sfxBus, 600); },
    howl(t) { tone(330, t, 0.7, 'sine', 0.11, sfxBus, { slide: 540 }); tone(540, t + 0.7, 1.6, 'sine', 0.09, sfxBus, { slide: 290 }); tone(165, t, 2.2, 'triangle', 0.03); },
    snort(t) { noise(t, 0.18, 0.28, 700, 'lowpass'); noise(t + 0.22, 0.3, 0.22, 500, 'lowpass'); },
    hammer(t) { noise(t, 0.05, 0.3, 2400, 'bandpass'); tone(220, t, 0.08, 'square', 0.08); },
    lute(t) { [0, 4, 7, 12].forEach((s, i) => tone(294 * Math.pow(2, s / 12), t + i * 0.09, 0.6, 'triangle', 0.1)); },
    snap(t) { [0, 4, 7].forEach((s, i) => tone(294 * Math.pow(2, s / 12), t + i * 0.09, 0.25, 'triangle', 0.1)); tone(1400, t + 0.3, 0.4, 'sawtooth', 0.07, sfxBus, { slide: 260 }); noise(t + 0.3, 0.05, 0.25, 3200, 'highpass'); },
    munch(t) { for (let i = 0; i < 3; i++) noise(t + i * 0.13, 0.08, 0.15, 800, 'lowpass'); },
    swish(t) { noise(t, 0.25, 0.12, 2000, 'bandpass', sfxBus, 500); },
  };
  function sfx(name, arg) { if (!ctx || muted) return; const f = SFX[name]; if (f) f(ctx.currentTime + 0.005, arg); }

  // ------------------------------------------------------------- MUSIC
  // Notation: "NOTE:steps" separated by spaces; '-' is a rest. One step = an eighth note.
  const TRACKS = {
    title: { bpm: 84, parts: [
      { w: 'triangle', v: 0.55, n: 'D5:3 E5:1 F5:2 A5:2 G5:4 F5:2 E5:2 D5:3 E5:1 F5:2 C5:2 D5:8 F5:3 G5:1 A5:2 C6:2 Bb5:4 A5:2 G5:2 F5:2 E5:2 C5:2 E5:2 D5:8' },
      { w: 'sine', v: 0.6, n: 'D3:8 Bb2:8 F3:8 A2:8 D3:8 Bb2:8 C3:8 D3:8' },
      { w: 'square', v: 0.07, n: 'A4:2 D5:2 F5:2 D5:2 F4:2 Bb4:2 D5:2 Bb4:2 F4:2 A4:2 C5:2 A4:2 E4:2 A4:2 C#5:2 A4:2 A4:2 D5:2 F5:2 D5:2 F4:2 Bb4:2 D5:2 Bb4:2 G4:2 C5:2 E5:2 C5:2 F4:2 A4:2 D5:2 A4:2' },
    ] },
    dawn: { bpm: 76, parts: [
      { w: 'triangle', v: 0.5, n: 'B4:2 D5:2 G5:4 F#5:2 E5:2 D5:4 C5:2 E5:2 A5:4 G5:2 F#5:2 G5:4 - :4 B4:2 D5:2 G5:4 A5:2 B5:2 C6:4 B5:2 A5:2 G5:2 E5:2 F#5:2 D5:2 G5:8' },
      { w: 'sine', v: 0.55, n: 'G3:8 C3:8 A2:8 D3:8 G3:8 C3:8 D3:8 G2:8' },
      { w: 'square', v: 0.05, n: 'G4:2 B4:2 D5:2 B4:2 C4:2 E4:2 G4:2 E4:2 A3:2 C4:2 E4:2 C4:2 D4:2 F#4:2 A4:2 F#4:2 G4:2 B4:2 D5:2 B4:2 C4:2 E4:2 G4:2 E4:2 D4:2 F#4:2 A4:2 F#4:2 G4:2 B4:2 D5:2 G5:2' },
    ] },
    town: { bpm: 118, parts: [
      { w: 'square', v: 0.11, n: 'G4:1 A4:1 B4:2 D5:2 B4:1 A4:1 G4:2 E4:2 D4:2 G4:2 A4:2 B4:2 A4:4 G4:1 A4:1 B4:2 D5:2 E5:1 D5:1 B4:2 A4:2 G4:2 A4:2 B4:2 A4:2 G4:4 D5:2 E5:2 G5:2 E5:2 D5:2 B4:2 A4:2 G4:2 C5:2 B4:2 A4:2 G4:2 A4:4 D5:2 E5:2 G5:2 E5:2 D5:2 B4:2 A4:2 B4:2 A4:2 F#4:2 G4:8' },
      { w: 'triangle', v: 0.5, n: 'G2:2 D3:2 G2:2 D3:2 C3:2 G3:2 D3:2 A3:2 G2:2 D3:2 E3:2 B3:2 D3:2 A3:2 G2:2 D3:2 G2:2 D3:2 G2:2 D3:2 C3:2 G3:2 C3:2 G3:2 D3:2 A3:2 D3:2 A3:2 G2:2 D3:2 G2:2 D3:2' },
      { w: 'noise', v: 0.04, n: 'x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2 x:2' },
    ] },
    forest: { bpm: 70, parts: [
      { w: 'triangle', v: 0.45, n: 'A4:4 C5:2 B4:2 E4:8 - :4 A4:2 G4:2 F4:4 E4:4 D4:4 E4:2 F4:2 E4:8 - :8 C5:4 D5:2 E5:2 B4:8 A4:4 G4:2 F4:2 E4:4 D#4:4 E4:16' },
      { w: 'sine', v: 0.6, n: 'A2:16 F2:16 D2:16 E2:16 A2:16 F2:16 E2:16 A2:16' },
      { w: 'square', v: 0.03, n: '- :6 E5:1 - :9 - :6 C5:1 - :9 - :6 A5:1 - :9 - :6 B4:1 - :9 - :6 E5:1 - :9 - :6 F5:1 - :9 - :6 B4:1 - :9 - :16' },
    ] },
    wonder: { bpm: 92, parts: [
      { w: 'triangle', v: 0.55, n: 'C5:2 F5:2 A5:2 C6:2 Bb5:4 A5:2 G5:2 A5:4 F5:2 G5:2 A5:4 - :4 D5:2 G5:2 Bb5:2 D6:2 C6:4 Bb5:2 A5:2 G5:2 F5:2 E5:2 G5:2 F5:8' },
      { w: 'sine', v: 0.55, n: 'F3:8 D3:8 F3:8 F3:8 Bb2:8 C3:8 C3:8 F3:8' },
      { w: 'square', v: 0.05, n: 'F4:2 A4:2 C5:2 A4:2 D4:2 F4:2 A4:2 F4:2 F4:2 A4:2 C5:2 A4:2 F4:2 A4:2 C5:2 F5:2 Bb3:2 D4:2 F4:2 D4:2 C4:2 E4:2 G4:2 E4:2 C4:2 E4:2 G4:2 Bb4:2 F4:2 A4:2 C5:2 F5:2' },
    ] },
    tension: { bpm: 96, parts: [
      { w: 'square', v: 0.06, n: 'E4:2 F4:2 E4:2 - :2 E4:2 F4:2 G#4:2 - :2 A4:2 G#4:2 F4:2 - :2 E4:4 - :4' },
      { w: 'sawtooth', v: 0.12, n: 'E2:4 E2:4 E2:4 E2:4 F2:4 F2:4 E2:4 E2:4' },
      { w: 'noise', v: 0.05, n: 'x:4 x:4 x:4 x:2 x:2 x:4 x:4 x:4 x:2 x:2' },
    ] },
  };

  function music(name) {
    if (name === trackName) return;
    trackName = name;
    if (!ctx) return;
    if (track) { const old = track; old.stop = true; old.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); setTimeout(() => old.g.disconnect(), 2500); }
    track = null;
    if (!name || !TRACKS[name]) return;
    const def = TRACKS[name];
    const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(1, ctx.currentTime, 0.5); g.connect(musicBus);
    const stepDur = 60 / def.bpm / 2;
    const parts = def.parts.map(p => {
      const ev = p.n.trim().split(/\s+/).reduce((acc, tok) => {
        if (tok === '-') return acc; // tolerate "- :4" spacing
        const [nn, ss] = tok.split(':');
        acc.push({ n: nn === '' ? '-' : nn, s: parseFloat(ss || '1') });
        return acc;
      }, []);
      return { ...p, ev, i: 0, t: ctx.currentTime + 0.1 };
    });
    track = { g, parts, stepDur, stop: false };
  }
  function schedule() {
    if (!ctx || !track || track.stop) return;
    const ahead = ctx.currentTime + 0.25;
    for (const p of track.parts) {
      while (p.t < ahead) {
        const e = p.ev[p.i]; const d = e.s * track.stepDur;
        if (e.n !== '-' && e.n !== '') {
          if (p.w === 'noise') noise(p.t, 0.04, p.v, 7000, 'highpass', track.g);
          else tone(freq(e.n), p.t, d * 0.92, p.w, p.v * 0.5, track.g, { a: 0.012, r: Math.min(0.2, d * 0.5) });
        }
        p.t += d; p.i = (p.i + 1) % p.ev.length;
      }
    }
  }
  timer = setInterval(schedule, 60);

  // pause all sound while the tab / app is in the background, and carry on when it comes back
  let hiddenPause = false;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') { hiddenPause = true; ctx.suspend().catch(() => { }); }
    else if (hiddenPause) { hiddenPause = false; ctx.resume().catch(() => { }); }
  });
  function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05); }
  function setVolumes(mv, sv) {
    if (mv != null) musicVol = mv; if (sv != null) sfxVol = sv;
    if (musicBus) { musicBus.gain.value = musicVol; sfxBus.gain.value = sfxVol; }
  }
  return { init, sfx, music, setMuted, setVolumes, get muted() { return muted; }, get musicVol() { return musicVol; }, get sfxVol() { return sfxVol; }, get current() { return trackName; }, get state() { return ctx ? ctx.state : 'none'; } };
})();
