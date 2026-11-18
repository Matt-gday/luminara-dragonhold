// =====================================================================
//  GAME ENGINE — world, movement, dialogue bubbles, inventory, saving.
// =====================================================================
const G = (() => {
  const T = 16, VW = 320, VH = 180;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  const stage = document.getElementById('stage'), ui = document.getElementById('ui');
  const $ = id => document.getElementById(id);
  ctx.imageSmoothingEnabled = false;
  const lightC = GFX.cnv(VW, VH), lctx = lightC.getContext('2d');
  const shadowC = GFX.cnv(VW, VH), sctx = shadowC.getContext('2d');
  const SIL = new Map();
  function silhouette(img) {
    let s = SIL.get(img);
    if (!s) { s = GFX.cnv(img.width, img.height); const g = s.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, s.width, s.height); SIL.set(img, s); }
    return s;
  }
  const SAVE_KEY = 'luminara_lightbearer_save_v1';

  GFX.buildCharacters();

  let scale = 3, S = null, M = null, mode = 'title';
  let player = null, npcs = [], goblins = [], followers = [], particles = [], fx = [], creatures = [];
  let cam = { x: 0, y: 0 }, busy = 0, time = 0, shakeT = 0;
  let held = null;               // item id being "used"
  const keys = {}, pressed = {};
  let dialog = null;             // active bubble/choice
  let hoverTarget = null, promptTarget = null;
  let solid = null, low = null;  // collision grids
  let transitioning = false, fadeEl = $('fade');
  let trail = [];
  let flapGame = null;
  let lastSafe = null;
  let lightRegen = 0, heartRegen = 0;

  // =================================================================== STATE
  function newState() {
    return { map: 'cottage', x: 0, y: 0, dir: 'down', inv: [], flags: {}, q: {}, xp: 0, lvl: 1, hearts: 3, maxHearts: 3,
      light: 3, maxLight: 3, coins: 10, leaves: [], journal: [], time: 0, friendName: 'Gwendolyn', version: SAVE_VERSION, chapter: 1, party: [] };
  }
  const SAVE_VERSION = 2; // bump when the story changes so old saves can't break
  const LEVELS = [0, 30, 80, 150, 240, 350, 480, 640];

  // =================================================================== SIZING
  function resize() {
    const wcs = getComputedStyle(document.getElementById('wrap'));
    const w = window.innerWidth - parseFloat(wcs.paddingLeft) - parseFloat(wcs.paddingRight), h = window.innerHeight - parseFloat(wcs.paddingTop) - parseFloat(wcs.paddingBottom);
    let s = Math.min(w / VW, h / VH);
    if (s >= 2) s = Math.floor(s * 2) / 2;
    scale = Math.max(1, s);
    cv.style.width = Math.round(VW * scale) + 'px'; cv.style.height = Math.round(VH * scale) + 'px';
    stage.style.width = cv.style.width; stage.style.height = cv.style.height;
    document.documentElement.style.setProperty('--fs', Math.max(15, Math.min(28, scale * 6.8)) + 'px');
  }
  window.addEventListener('resize', resize); resize();

  // =================================================================== MAP LOADING
  function visible(o) { return !o.if || o.if(S); }
  function charFor(n) { return GFX.CHAR[n.char]; }
  function makeNPC(d) {
    const fw = d.fw || 1;
    return { id: d.id, def: d, x: (d.x + fw / 2) * T, y: (d.y + 1) * T - 3, dir: d.dir || 'down', frame: 0, t: Math.random() * 10,
      home: { x: d.x, y: d.y }, path: [], speed: 32, name: d.name, color: d.color, voice: d.voice || 1, fw, wanderT: 2 + Math.random() * 4,
      kind: d.horse ? 'horse' : d.dragon ? 'dragon' : d.char === 'owl' ? 'owl' : d.char === 'wisp' ? 'wisp' : d.char === 'deerUpright' ? 'tall' : (d.char === 'possum' || d.char === 'fox') ? 'critter' : 'human', z: 0 };
  }
  function loadMap(id, spawn) {
    M = MAPS.get(id);
    if (!M.groundCanvas) M.groundCanvas = GFX.renderGround(M);
    S.map = id;
    npcs = M.npcs.filter(visible).map(makeNPC);
    goblins = (M.goblins || []).map(([x, y]) => ({ x: x * T + 8, y: y * T + 12, home: { x: x * T + 8, y: y * T + 12 }, vx: 0, vy: 0, t: Math.random() * 5, state: 'idle', gone: 0, frame: 0 }));
    if (S.flags.goblinsCalm && id === 'deep_forest') goblins = [];
    creatures = [];
    M.objects.forEach(o => { if (o.butterflies) for (let i = 0; i < o.butterflies; i++) creatures.push({ kind: 'butterfly', o, a: Math.random() * 6, r: 10 + Math.random() * 12, c: Math.floor(Math.random() * 4), sp: 0.8 + Math.random() }); });
    particles = []; fx = [];
    let sx, sy, dir;
    if (typeof spawn === 'string') { const sp = M.spawns[spawn] || Object.values(M.spawns)[0]; [sx, sy, dir] = sp; sx = sx * T + 8; sy = sy * T + 12; }
    else { sx = spawn.x; sy = spawn.y; dir = spawn.dir; }
    player = player || { z: 0, vz: 0, frame: 0, t: 0, path: [], invuln: 0 };
    Object.assign(player, { x: sx, y: sy, dir: dir || 'down', z: 0, vz: 0, path: [], pendingAct: null, kb: null });
    lastSafe = { x: sx, y: sy };
    seedTrail();
    rebuildSolid();
    AUDIO.music(STORY.musicFor ? STORY.musicFor(id) || M.music : M.music);
    snapCam();
    hud();
    $('where').textContent = M.name; $('where').style.display = 'block';
  }
  function rebuildSolid() {
    solid = [...Array(M.h)].map(() => new Uint8Array(M.w));
    low = [...Array(M.h)].map(() => new Uint8Array(M.w));
    for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) {
      const t = M.ground[y][x];
      if (MAPS.SOLID_TILES.has(t)) solid[y][x] = 1;
      if (MAPS.LOW_TILES.has(t)) low[y][x] = 1;
    }
    for (const o of M.objects) {
      if (!o.solid || o.decal || !visible(o)) continue;
      for (let j = o.y; j < o.y + o.fh; j++) for (let i = o.x; i < o.x + o.fw; i++) if (j >= 0 && i >= 0 && j < M.h && i < M.w) { solid[j][i] = 1; if (o.low) low[j][i] = 1; }
    }
  }
  function refresh() { // re-evaluate visibility after story flags change
    if (!M) return;
    const keep = new Map(npcs.map(n => [n.id, n]));
    const dyn = npcs.filter(n => n.dynamic);
    npcs = M.npcs.filter(visible).map(d => keep.get(d.id) || makeNPC(d)).concat(dyn);
    rebuildSolid(); hud();
  }

  // =================================================================== COLLISION
  function tileAt(px, py) { return [Math.floor(px / T), Math.floor(py / T)]; }
  function solidTile(tx, ty, air) {
    if (tx < 0 || ty < 0 || tx >= M.w || ty >= M.h) return true;
    if (!solid[ty][tx]) return false;
    if (air && low[ty][tx]) return false;
    return true;
  }
  function boxBlocked(x, y, air, self, hw = 5, hh = 5) {
    const pts = [[x - hw, y - hh], [x + hw, y - hh], [x - hw, y], [x + hw, y]];
    for (const [px, py] of pts) { const [tx, ty] = tileAt(px, py); if (solidTile(tx, ty, air)) return { tile: [tx, ty] }; }
    for (const n of npcs) {
      if (n === self || n.def.fly || n.def.static && n.def.perch || n.hidden) continue;
      const w = n.fw * 8 - 2;
      if (Math.abs(n.x - x) < w + hw && Math.abs(n.y - y) < 6 + hh * 0.5) return { npc: n };
    }
    if (self && self !== player && Math.abs(player.x - x) < 10 && Math.abs(player.y - y) < 8) return { player: true };
    return null;
  }
  function inLowTile(x, y) {
    const [tx, ty] = tileAt(x, y - 2);
    return tx >= 0 && ty >= 0 && tx < M.w && ty < M.h && low[ty][tx] && solid[ty][tx];
  }

  // =================================================================== PATHFINDING
  function walkable(tx, ty, self) {
    if (solidTile(tx, ty, false)) return false;
    for (const n of npcs) { if (n === self || n.def.fly || n.hidden || (n.def.static && n.def.perch)) continue; const nx = Math.floor(n.x / T), ny = Math.floor((n.y - 2) / T); if (ny === ty && (nx === tx || (n.fw === 2 && nx - 1 === tx))) return false; }
    return true;
  }
  function findPath(sx, sy, tx, ty, self, maxN = 4000) {
    if (sx === tx && sy === ty) return [];
    const W = M.w, key = (x, y) => y * W + x;
    const open = [[sx, sy, 0, 0]], came = new Map(), g = new Map([[key(sx, sy), 0]]);
    let n = 0;
    while (open.length && n++ < maxN) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][3] < open[bi][3]) bi = i;
      const [x, y] = open.splice(bi, 1)[0];
      if (x === tx && y === ty) { const p = []; let k = key(x, y); while (k !== key(sx, sy)) { p.unshift([k % W, Math.floor(k / W)]); k = came.get(k); } return p; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!(nx === tx && ny === ty) && !walkable(nx, ny, self)) continue;
        if (nx === tx && ny === ty && solidTile(nx, ny)) continue;
        const k = key(nx, ny), ng = g.get(key(x, y)) + 1;
        if (!g.has(k) || ng < g.get(k)) { g.set(k, ng); came.set(k, key(x, y)); open.push([nx, ny, ng, ng + Math.abs(nx - tx) + Math.abs(ny - ty)]); }
      }
    }
    return null;
  }

  // =================================================================== INPUT
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', KeyE: 'act', Enter: 'act', KeyZ: 'act', KeyI: 'inv', KeyJ: 'quest', KeyQ: 'light', KeyX: 'light', Escape: 'esc', KeyM: 'mute', Tab: 'inv', KeyP: 'map' };
  window.addEventListener('keydown', e => {
    AUDIO.init();
    const k = KEYMAP[e.code]; if (!k) return;
    e.preventDefault();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
    if (tipActive) { if (k === 'act' || k === 'jump' || k === 'esc') tipActive(); return; }
    if (dialog) { dialogKey(k); return; }
    if (flapGame && (k === 'jump' || k === 'act')) { flapTap(); return; }
    if (mode !== 'play') return;
    if (k === 'mute') { AUDIO.setMuted(!AUDIO.muted); toast(AUDIO.muted ? 'Sound off' : 'Sound on', null, null, 3500); return; }
    if (panelOpen()) { if (k === 'esc' || k === 'inv' && curTab === 'inv' || k === 'quest' && curTab === 'quest') closePanel(); else if (k === 'inv') openPanel('inv'); else if (k === 'quest') openPanel('quest'); else if (k === 'map') { if (curTab === 'map') closePanel(); else openPanel('map'); } return; }
    if (k === 'esc') { if (held) setHeld(null); else pauseMenu(); return; }
    if (busy) return;
    if (k === 'inv' && S.flags.hasSatchel) openPanel('inv');
    else if (k === 'inv') toast('You have no satchel yet.', null, null, 3500);
    if (k === 'quest') openPanel('quest');
    if (k === 'map') { if (S.flags.sawMap) openPanel('map'); else toast("You don't have a map yet.", null, null, 3500); }
  });
  window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function toWorld(ev) {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * VW + cam.x, y: (ev.clientY - r.top) / r.height * VH + cam.y };
  }
  cv.addEventListener('mousemove', ev => {
    if (mode !== 'play' || !M) return;
    const w = toWorld(ev); hoverTarget = targetAtPoint(w.x, w.y);
    cv.style.cursor = hoverTarget ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerdown', ev => {
    AUDIO.init();
    if (dialog) { dialogKey('act'); return; }
    if (flapGame) { flapTap(); return; }
    if (mode !== 'play' || busy || panelOpen() || transitioning) return;
    const w = toWorld(ev);
    const tgt = targetAtPoint(w.x, w.y);
    if (tgt) walkToTarget(tgt);
    else {
      const [tx, ty] = tileAt(w.x, w.y); const [px, py] = tileAt(player.x, player.y - 2);
      const p = findPath(px, py, tx, ty, player);
      if (p && p.length) { player.path = p.map(([x, y]) => ({ x: x * T + 8, y: y * T + 12 })); player.pendingAct = null; }
      else if (p === null) { fx.push({ kind: 'x', x: w.x, y: w.y, t: 0.5 }); }
    }
  });
  // touch controls
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
  // on-screen D-pad can be hidden (tapping the screen to walk still works); remembered on this device
  function setDpad(show) { document.body.classList.toggle('nodpad', !show); try { localStorage.setItem('luminara_dpad', show ? '1' : '0'); } catch (e) { } }
  let dpadPref = '1'; try { dpadPref = localStorage.getItem('luminara_dpad') ?? '1'; } catch (e) { }
  setDpad(dpadPref !== '0');
  document.querySelectorAll('#dpad div').forEach(el => {
    const d = el.dataset.d;
    const on = e => { e.preventDefault(); AUDIO.init(); keys[d] = true; if (dialog) dialogKey(d === 'up' ? 'up' : d === 'down' ? 'down' : 'none'); };
    const off = e => { e.preventDefault(); keys[d] = false; };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
  });
  document.querySelectorAll('#tbtns div').forEach(el => {
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); AUDIO.init(); const b = el.dataset.b;
      if (dialog) { dialogKey('act'); return; }
      if (flapGame) { flapTap(); return; }
      if (b === 'act') pressed.act = true; if (b === 'jump') pressed.jump = true; if (b === 'light') pressed.light = true;
    });
  });

  // =================================================================== TARGETING
  function interactables() {
    const list = [];
    for (const o of M.objects) if (visible(o) && !o.noInteract && (o.act || o.look || o.pickup || o.door || o.enter)) list.push({ type: 'obj', o, x: o.x * T, y: o.y * T, w: o.fw * T, h: o.fh * T });
    for (const n of npcs) if (!n.hidden && n.def.act) { const w = n.fw * T; list.push({ type: 'npc', n, x: n.x - w / 2, y: n.y - (n.kind === 'horse' ? 20 : 14) + (n.def.perch || 0), w, h: n.kind === 'horse' ? 22 : 16 }); }
    return list;
  }
  function targetAtPoint(wx, wy) {
    // prefer sprite hits (npc bodies), then footprints
    let best = null, bd = 1e9;
    for (const it of interactables()) {
      let x = it.x, y = it.y, w = it.w, h = it.h;
      if (it.type === 'npc') { y -= 20; h += 20; }
      if (it.type === 'obj' && it.o.img && !it.o.invisible && !it.o.decal) { const ih = it.o.img.height; const top = (it.o.y + it.o.fh) * T - ih + (it.o.dy || 0); if (top < y) { h += y - top; y = top; } }
      if (wx >= x - 2 && wx <= x + w + 2 && wy >= y - 2 && wy <= y + h + 2) {
        const d = Math.abs(wx - (x + w / 2)) + Math.abs(wy - (y + h)) * 0.5 + (it.type === 'npc' ? -20 : 0) + (it.o && it.o.kind === 'house' && !it.o.door ? 30 : 0);
        if (d < bd) { bd = d; best = it; }
      }
    }
    return best;
  }
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function facingTarget() {
    const [dx, dy] = DIRV[player.dir];
    const fx0 = player.x + dx * 12, fy0 = player.y - 3 + dy * 12;
    let best = null, bd = 1e9;
    for (const it of interactables()) {
      if (it.type === 'obj' && it.o.kind === 'house') continue;
      const cx = Math.max(it.x, Math.min(fx0, it.x + it.w)), cy = Math.max(it.y, Math.min(fy0, it.y + it.h));
      const d = Math.hypot(cx - fx0, cy - fy0);
      const near = Math.hypot(Math.max(it.x, Math.min(player.x, it.x + it.w)) - player.x, Math.max(it.y, Math.min(player.y - 3, it.y + it.h)) - (player.y - 3));
      if (d < 7 && near < 18 && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  function walkToTarget(it) {
    const tx0 = Math.floor((it.x + it.w / 2) / T), ty0 = Math.floor((it.y + it.h - 1) / T);
    const [px, py] = tileAt(player.x, player.y - 2);
    // candidate standing tiles around the target footprint
    const fx0 = Math.floor(it.x / T), fy0 = Math.floor(it.y / T), fx1 = Math.floor((it.x + it.w - 1) / T), fy1 = Math.floor((it.y + it.h - 1) / T);
    const cands = [];
    for (let x = fx0; x <= fx1; x++) { cands.push([x, fy1 + 1, 'up']); cands.push([x, fy0 - 1, 'down']); }
    for (let y = fy0; y <= fy1; y++) { cands.push([fx0 - 1, y, 'right']); cands.push([fx1 + 1, y, 'left']); }
    if (it.type === 'obj' && !it.o.solid) cands.unshift([tx0, ty0, player.dir]);
    cands.sort((a, b) => (Math.abs(a[0] - px) + Math.abs(a[1] - py)) - (Math.abs(b[0] - px) + Math.abs(b[1] - py)));
    for (const [cx, cy, d] of cands) {
      if (!(cx === px && cy === py) && !walkable(cx, cy, player)) continue;
      const p = findPath(px, py, cx, cy, player);
      if (p) { player.path = p.map(([x, y]) => ({ x: x * T + 8, y: y * T + 12 })); player.pendingAct = { it, dir: d }; if (!p.length) arrive(); return; }
    }
    // couldn't path — just try to interact if close
    if (Math.hypot(it.x + it.w / 2 - player.x, it.y + it.h - player.y) < 30) doInteract(it);
  }
  function arrive() {
    const pa = player.pendingAct; player.pendingAct = null;
    if (!pa) return;
    if (pa.dir) player.dir = pa.dir;
    doInteract(pa.it);
  }

  // =================================================================== INTERACTION
  // who Luminara has actually talked to (shown as name tags on hover / when facing them)
  function npcName(n) { return n.def && n.def.nameFn ? S.friendName : n.name; }
  function meet(n) { if (!n || !n.name || !S) return; S.met = S.met || {}; S.met[n.def && n.def.nameFn ? '#friend' : n.name] = 1; }
  function hasMet(n) { return !!(S.met && S.met[n.def && n.def.nameFn ? '#friend' : n.name]); }
  function doInteract(it) {
    clearToasts();
    if (busy) return;
    if (it.type === 'npc') { const n = it.n; meet(n); faceTo(n, player); settleLater(n); faceTo(player, n); giveSpace(n); run(() => STORY.interact({ kind: 'npc', id: n.id, ent: n, act: n.def.act, def: n.def }, held)); }
    else {
      const o = it.o;
      run(() => STORY.interact({ kind: 'obj', id: o.id, o, act: o.act, look: o.look, pickup: o.pickup, enter: o.enter, door: o.door }, held));
    }
  }
  // An NPC who turned to talk keeps facing Luminara until she walks away, then turns back to the way they
  // normally face, so nobody is left with their back to the camera. Wanderers settle a moment after stopping.
  function settleLater(n, how = 'walkaway') { if (n && n.def) { n.settle = how; n.settleT = 0; } }
  // How far a sprite reaches out in front of its anchor when facing left or right (nose, hair, arms), measured once.
  const REACH = new Map();
  function reach(c, dir) {
    if (!c || !c.frames || !c.frames[dir]) return 9;
    const k = c.frames[dir][0]; if (REACH.has(k)) return REACH.get(k);
    let r = 0;
    for (const fr of c.frames[dir]) {
      const d = fr.getContext('2d').getImageData(0, 0, fr.width, fr.height).data;
      for (let y = 0; y < fr.height - 6; y++) for (let x = 0; x < fr.width; x++) if (d[(y * fr.width + x) * 4 + 3] > 0) r = Math.max(r, dir === 'right' ? x - c.ax : c.ax - x);
    }
    REACH.set(k, r); return r;
  }
  // Two people talking side-on keep at least one clear pixel between their faces: Luminara takes a small
  // step back (or, if she can't, the other person does).
  function giveSpace(n) {
    if (n.kind !== 'human' || Math.abs(n.y - player.y) > 10) return;
    const side = Math.sign(player.x - n.x) || (player.dir === 'left' ? 1 : -1);
    const need = reach(playerSprite(), side < 0 ? 'right' : 'left') + reach(charFor(n.def), side < 0 ? 'left' : 'right') + 2;
    const gap = Math.abs(player.x - n.x); if (gap >= need) return;
    const px = n.x + side * need;
    if (!boxBlocked(px, player.y, false, player)) { player.nudge = px; return; }
    const nx = player.x - side * need;
    if (!n.def.static && !boxBlocked(nx, n.y, false, n)) n.nudge = nx;
  }
  function faceTo(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (a.kind === 'dragon' || a.kind === 'horse') { a.dir = dx < 0 ? 'left' : 'right'; return; }
    a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  async function run(fn) {
    busy++;
    player.path = [];
    try { await fn(); await flushNotices(); await flushTips(); } catch (e) { console.error(e); }
    busy = Math.max(0, busy - 1);
    if (!busy) sceneLines = 0;
    hud();
    save();
  }

  // =================================================================== UPDATE
  let last = 0;
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; time += dt;
    if (mode === 'play') { update(dt); render(); }
    else if (mode === 'title') renderTitle(dt);
    else if (mode === 'credits') renderCredits(dt);
    for (const k in pressed) pressed[k] = false;
    try { const q = location.search; if (/[?&]preview\b/.test(q)) localStorage.setItem('luminara_preview', '1'); if (/[?&]nopreview\b/.test(q)) localStorage.removeItem('luminara_preview'); } catch (e) { }
  requestAnimationFrame(loop);
  }

  function update(dt) {
    if (paused) return;
    S.time += dt;
    if (dialog) updateDialog(dt);
    for (const e of [player, ...npcs]) if (e.nudge != null) { const d = e.nudge - e.x; if (Math.abs(d) < 0.6) { e.x = e.nudge; e.nudge = null; } else e.x += Math.sign(d) * Math.min(Math.abs(d), 45 * dt); }
    if (notices.length && !busy && !dialog && !tipActive && !transitioning && mode === 'play') run(async () => { });
    if (!busy && !dialog && !transitioning && !panelOpen() && !flapGame) {
      if (pressed.act) { const t = facingTarget(); if (t) doInteract(t); }
      if (pressed.jump) tryJump();
      if (pressed.light) raiseLight();
    }
    updatePlayer(dt);
    updateNPCs(dt);
    updateGoblins(dt);
    updateFollowers(dt);
    updateParticles(dt);
    if (flapGame) updateFlap(dt);
    // regen
    lightRegen += dt; if (lightRegen > (S.flags.sunstone ? 4.5 : 7)) { lightRegen = 0; if (S.light < S.maxLight) { S.light++; hud(); } }
    heartRegen += dt; if (heartRegen > 18) { heartRegen = 0; if (S.hearts < S.maxHearts && player.invuln <= 0) { S.hearts++; hud(); } }
    if (player.invuln > 0) player.invuln -= dt;
    autosaveT += dt; if (autosaveT > 3 && !busy && !dialog && !transitioning) { autosaveT = 0; save(); }
    // camera
    // the camera follows Luminara, or glides to a point of interest during a scene
    const tx = camOverride ? camOverride.x - VW / 2 : player.x - VW / 2, ty = camOverride ? camOverride.y - VH / 2 : player.y - 12 - VH / 2;
    if (camReturn > 0) camReturn -= dt;
    const rate = camOverride || camReturn > 0 ? 2.6 : 8;
    cam.x += (tx - cam.x) * Math.min(1, dt * rate); cam.y += (ty - cam.y) * Math.min(1, dt * rate);
    clampCam();
    if (shakeT > 0) shakeT -= dt;
    promptTarget = (!busy && !dialog) ? facingTarget() : null;
    const cine = busy > 0 && sceneLines > 0;
    if (cine !== cineOn) { cineOn = cine; document.body.classList.toggle('cine', cine); }
  }
  let camOverride = null, camReturn = 0, sceneLines = 0, cineOn = false;
  function clampCam() {
    const mw = M.w * T, mh = M.h * T;
    cam.x = mw <= VW ? (mw - VW) / 2 : Math.max(0, Math.min(mw - VW, cam.x));
    cam.y = mh <= VH ? (mh - VH) / 2 : Math.max(0, Math.min(mh - VH, cam.y));
  }
  function snapCam() { cam.x = player.x - VW / 2; cam.y = player.y - 12 - VH / 2; clampCam(); }

  let stepT = 0;
  function updatePlayer(dt) {
    const p = player;
    let mx = 0, my = 0;
    const canMove = !busy && !dialog && !transitioning && !panelOpen() && !flapGame;
    if (canMove) {
      if (keys.left) mx -= 1; if (keys.right) mx += 1; if (keys.up) my -= 1; if (keys.down) my += 1;
      if (mx || my) { p.path = []; p.pendingAct = null; }
    }
    if (!mx && !my && p.path.length && (canMove || p.scripted)) {
      const n = p.path[0]; const dx = n.x - p.x, dy = n.y - p.y; const d = Math.hypot(dx, dy);
      if (d < 2) { p.x = n.x; p.y = n.y; p.path.shift(); if (!p.path.length) { if (p.scripted) { const r = p.scripted; p.scripted = null; r(); } else arrive(); } }
      else { mx = dx / d; my = dy / d; }
    }
    const air = p.z > 3;
    const speed = (p.speedMul || 1) * 66;
    if (mx || my) {
      const l = Math.hypot(mx, my); mx /= l; my /= l;
      p.dir = Math.abs(mx) > Math.abs(my) + 0.01 ? (mx < 0 ? 'left' : 'right') : (my < 0 ? 'up' : 'down');
      const nx = p.x + mx * speed * dt, ny = p.y + my * speed * dt;
      const bx = boxBlocked(nx, p.y, air, player), by = boxBlocked(p.x, ny, air, player);
      if (!bx) p.x = nx; if (!by) p.y = ny;
      if ((bx || by) && !p.path.length) checkDoorBump(bx || by, mx, my);
      if ((bx && by) && p.path.length) { p.path = []; p.pendingAct = null; }
      p.t += dt * 8; p.frame = Math.floor(p.t) % 4;
      if (p.z === 0) { stepT += dt; if (stepT > 0.28) { stepT = 0; AUDIO.sfx(M.particles === 'leaves' && GFX.hash(Math.floor(p.x / 16), Math.floor(p.y / 16), 4) < 0.3 ? 'leaf' : 'step'); } }
      checkExits();
    } else { p.frame = 0; p.t = 0; }
    // jump physics
    if (p.z > 0 || p.vz > 0) {
      p.vz -= 640 * dt; p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0; p.vz = 0; AUDIO.sfx('land');
        if (inLowTile(p.x, p.y)) {
          const [tx, ty] = tileAt(p.x, p.y - 2);
          const water = M.ground[ty][tx] === 'water';
          AUDIO.sfx(water ? 'splash' : 'land');
          if (water) for (let i = 0; i < 14; i++) particles.push({ kind: 'drop', x: p.x, y: p.y - 2, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, t: 0.6 });
          p.x = lastSafe.x; p.y = lastSafe.y; toast(water ? 'Splash! Jump from closer to the edge.' : 'Oof! Not quite far enough.', null, null, 3500);
        }
      }
    } else if (!inLowTile(p.x, p.y) && !boxBlocked(p.x, p.y, false, player)) { lastSafe = { x: p.x, y: p.y }; }
    if (!trail.length || Math.hypot(p.x - trail[0].x, p.y - trail[0].y) >= 1) { trail.unshift({ x: p.x, y: p.y }); if (trail.length > 160) trail.pop(); }
    // knockback
    if (p.kb) { const nx = p.x + p.kb.x * dt, ny = p.y + p.kb.y * dt; if (!boxBlocked(nx, ny, false, player)) { p.x = nx; p.y = ny; } p.kb.t -= dt; if (p.kb.t <= 0) p.kb = null; }
  }
  function checkDoorBump(hit, mx, my) {
    if (!hit || !hit.tile || busy) return;
    const [tx, ty] = hit.tile;
    const d = M.objects.find(o => o.door && visible(o) && tx >= o.x && tx < o.x + o.fw && ty >= o.y && ty < o.y + o.fh);
    if (d && my < -0.5) doInteract({ type: 'obj', o: d });
  }
  function checkExits() {
    if (transitioning || busy) return;
    const [tx, ty] = tileAt(player.x, player.y - 2);
    for (const e of M.exits) {
      if (tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h) {
        if (e.blockMsg) { bounceBack(); run(() => say('luminara', e.blockMsg)); return; }
        if (e.gate) {
          const r = STORY.gate(e.gate);
          if (r !== true) { bounceBack(); if (typeof r === 'function') run(r); else if (r) run(() => say('luminara', r)); return; }
        }
        go(e.to, e.spawn); return;
      }
    }
    for (const z of M.zones || []) {
      if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h && !S.flags['zone_' + z.id] && (!z.if || z.if(S))) {
        S.flags['zone_' + z.id] = 1; run(() => STORY.zone(z.id)); return;
      }
    }
  }
  function bounceBack() { player.x = lastSafe.x; player.y = lastSafe.y; player.path = []; const [dx, dy] = DIRV[player.dir]; const nx = player.x - dx * 6, ny = player.y - dy * 6; if (!boxBlocked(nx, ny, false, player)) { player.x = nx; player.y = ny; } }

  async function go(mapId, spawn, opts = {}) {
    if (transitioning) return;
    transitioning = true;
    AUDIO.sfx(opts.silent ? null : 'door');
    await fade(true);
    loadMap(mapId, spawn);
    await wait(120);
    await fade(false);
    transitioning = false;
    save();
    if (STORY.onEnter) run(() => STORY.onEnter(mapId));
  }
  function fade(out, ms = 450) { return new Promise(r => { fadeEl.style.transition = `opacity ${ms}ms`; fadeEl.style.opacity = out ? 1 : 0; setTimeout(r, ms + 20); }); }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function tryJump() {
    const p = player; if (p.z > 0) return;
    p.vz = 165; p.z = 0.1; AUDIO.sfx('jump');
    // things that react to a jump
    for (const o of M.objects) if (o.jumpAct && visible(o) && Math.hypot(o.x * T + 8 - p.x, (o.y + 1) * T - p.y) < 22) { const it = o; setTimeout(() => run(() => STORY.interact({ kind: 'obj', id: it.id, o: it, act: it.jumpAct }, null)), 220); }
  }

  function raiseLight() {
    if (!S.flags.lanternLit) return;
    if (S.light < 1) { AUDIO.sfx('no'); toast('Your lantern needs a moment to brighten again.', null, null, 3500); return; }
    S.light--; lightRegen = 0; hud();
    AUDIO.sfx('flash'); fx.push({ kind: 'flash', x: player.x, y: player.y - 14, t: 0.6, r: 0 });
    const R = 70 + S.lvl * 4 + (S.flags.sunstone ? 30 : 0);
    for (const g of goblins) if (!g.gone && Math.hypot(g.x - player.x, g.y - player.y) < R) scareGoblin(g);
    if (STORY.onFlash) run(() => STORY.onFlash(R));
  }
  function scareGoblin(g) {
    g.state = 'flee'; g.fleeT = 0.7; const a = Math.atan2(g.y - player.y, g.x - player.x); g.vx = Math.cos(a) * 110; g.vy = Math.sin(a) * 110;
    AUDIO.sfx('eep'); setTimeout(() => { g.gone = 25; for (let i = 0; i < 10; i++) particles.push({ kind: 'puff', x: g.x, y: g.y - 6, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 30, t: 0.7 }); }, 600);
    addXP(4, true); S.flags.goblinsScared = (S.flags.goblinsScared || 0) + 1;
  }

  function updateNPCs(dt) {
    for (const n of npcs) {
      n.t += dt;
      if (n.path.length) {
        const nx = n.path[0]; const dx = nx.x - n.x, dy = nx.y - n.y, d = Math.hypot(dx, dy);
        if (d < 1.5) { n.x = nx.x; n.y = nx.y; n.path.shift(); if (!n.path.length && n.onArrive) { const r = n.onArrive; n.onArrive = null; r(); } else if (!n.path.length && n.def.wander && n.settle !== 'walkaway') settleLater(n, 'timer'); }
        else {
          const sp = n.speed * dt; const mx = dx / d * Math.min(sp, d), my = dy / d * Math.min(sp, d);
          if (!n.def.fly && !n.ghost && boxBlocked(n.x + mx, n.y + my, false, n)) { n.blockT = (n.blockT || 0) + dt; if (n.blockT > 1.2) { n.blockT = 0; if (!n.onArrive) n.path = []; else { n.x = nx.x; n.y = nx.y; } } }
          else { n.x += mx; n.y += my; n.blockT = 0; }
          faceTo(n, { x: n.x + dx, y: n.y + dy });
          n.frame = Math.floor(n.t * 7) % 4;
        }
      } else {
        n.frame = 0;
        if (n.settle && !busy && !dialog) {
          n.settleT += dt;
          const away = n.settle === 'walkaway' ? Math.hypot(player.x - n.x, player.y - n.y) > 44 : n.settleT > 1.1;
          if (away) { n.settle = false; const rest = n.def.dir || 'down'; if (n.dir !== rest) { n.dir = rest; if (n.kind === 'human') n.frame = 0; } }
        }
        if (n.def.wander && !busy && !dialog && n.settle !== 'walkaway') {
          n.wanderT -= dt;
          if (n.wanderT <= 0) {
            n.wanderT = 3 + Math.random() * 5;
            const tx = n.home.x + Math.round((Math.random() - 0.5) * 2 * n.def.wander), ty = n.home.y + Math.round((Math.random() - 0.5) * 2 * n.def.wander);
            if (walkable(tx, ty, n)) { const [sx, sy] = tileAt(n.x, n.y - 2); const p = findPath(sx, sy, tx, ty, n, 400); if (p && p.length < 10) n.path = p.map(([x, y]) => ({ x: x * T + 8, y: y * T + 13 })); }
          }
        }
      }
    }
  }

  function updateGoblins(dt) {
    if (!goblins.length) return;
    for (const g of goblins) {
      g.t += dt; g.frame = Math.floor(g.t * 6) % 2;
      if (g.gone) { g.gone -= dt; if (g.gone <= 0) { g.gone = 0; g.x = g.home.x; g.y = g.home.y; g.state = 'idle'; } continue; }
      const d = Math.hypot(player.x - g.x, player.y - g.y);
      if (g.state === 'flee') { g.fleeT -= dt; g.x += g.vx * dt; g.y += g.vy * dt; continue; }
      let vx = 0, vy = 0;
      const calm = busy || dialog || transitioning;
      if (!calm && d < 70 && player.invuln <= 0) { g.state = 'chase'; vx = (player.x - g.x) / d * 38; vy = (player.y - g.y) / d * 38; }
      else {
        g.state = 'idle';
        const hx = g.home.x + Math.cos(g.t * 0.7) * 20, hy = g.home.y + Math.sin(g.t * 0.9) * 12;
        vx = (hx - g.x) * 1.2; vy = (hy - g.y) * 1.2;
      }
      const nx = g.x + vx * dt, ny = g.y + vy * dt;
      const [tx, ty] = tileAt(nx, ny - 2);
      if (!solidTile(tx, ty)) { g.x = nx; g.y = ny; }
      if (!calm && d < 10 && player.invuln <= 0 && player.z < 6) hurtPlayer(g);
    }
  }
  function hurtPlayer(g) {
    S.hearts--; player.invuln = 1.6; heartRegen = 0; AUDIO.sfx('hurt'); shakeT = 0.25;
    const a = Math.atan2(player.y - g.y, player.x - g.x); player.kb = { x: Math.cos(a) * 140, y: Math.sin(a) * 140, t: 0.18 };
    g.gone = 6; for (let i = 0; i < 8; i++) particles.push({ kind: 'puff', x: g.x, y: g.y - 6, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 30, t: 0.6 });
    hud();
    if (S.hearts <= 0) run(async () => {
      await fade(true, 700);
      S.hearts = S.maxHearts; S.light = S.maxLight;
      const sp = M.spawns.south ? 'south' : Object.keys(M.spawns)[0];
      loadMap(M.id, sp); await fade(false, 700);
      await say('luminara', "Ooh... the goblinites caught me by surprise. I must raise my lantern high when they come near! (Press Q)");
    });
    else { tipLater('hearts'); if (!busy) run(() => flushTips()); }
  }

  function updateFollowers(dt) {
    let idx = 0;
    followers.forEach(f => {
      idx += f.gap || 16;
      const tp = trail[Math.min(trail.length - 1, idx)], ahead = trail[Math.max(0, idx - 4)];
      const ox = f.x, oy = f.y;
      f.x += (tp.x - f.x) * Math.min(1, dt * 6); f.y += (tp.y - f.y) * Math.min(1, dt * 6);
      const dx = ahead.x - tp.x, dy = ahead.y - tp.y, moving = Math.hypot(f.x - ox, f.y - oy) > 0.15;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) f.dir = f.kind === 'human' ? (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down')) : (dx < 0 ? 'left' : dx > 0 ? 'right' : f.dir);
      f.t = (f.t || 0) + dt; f.frame = moving ? Math.floor(f.t * 7) % 4 : 0;
    });
  }

  function updateParticles(dt) {
    const kind = (STORY.particlesFor && STORY.particlesFor(M.id)) || M.particles;
    if (kind === 'rain' || kind === 'drizzle') { let k = dt * (kind === 'rain' ? 150 : 45); while (k > 0) { if (Math.random() < k) particles.push({ kind: 'rain', x: cam.x + Math.random() * (VW + 40) - 10, y: cam.y - 6 - Math.random() * 20, vx: -14, vy: 170 + Math.random() * 50, t: 1.6 }); k -= 1; } }
    if (kind === 'leaves' && particles.filter(p => p.kind === 'leaf').length < 18 && Math.random() < dt * 6) particles.push({ kind: 'leaf', x: cam.x + Math.random() * (VW + 60) - 30, y: cam.y - 6, vx: -6 - Math.random() * 10, vy: 12 + Math.random() * 10, ph: Math.random() * 6, c: ['#e0902a', '#e8c040', '#c05030', '#a86a2a'][Math.floor(Math.random() * 4)], t: 12 });
    if ((kind === 'fireflies') && particles.filter(p => p.kind === 'fly').length < 26 && Math.random() < dt * 10) particles.push({ kind: 'fly', x: cam.x + Math.random() * VW, y: cam.y + Math.random() * VH, ph: Math.random() * 6, t: 6 + Math.random() * 6 });
    if (kind === 'sparks' && Math.random() < dt * 20) { const o = M.objects.find(o => o.portal); if (o) particles.push({ kind: 'spark', x: o.x * T + 14 + Math.random() * 36, y: (o.y + 1) * T - 8 - Math.random() * 40, vx: (Math.random() - 0.5) * 10, vy: -10 - Math.random() * 20, t: 1.5 }); }
    // chimney smoke
    for (const o of M.objects) if (o.smoke && Math.random() < dt * 1.5) { const [sx, sy] = o.smoke; if (sx > cam.x - 20 && sx < cam.x + VW + 20 && sy > cam.y - 40 && sy < cam.y + VH + 40) particles.push({ kind: 'smoke', x: sx, y: sy, vx: 4 + Math.random() * 4, vy: -10 - Math.random() * 5, t: 2.4, r: 2 }); }
    // fountain droplets
    const fo = M.objects.find(o => o.id === 'fountain'); if (fo && Math.random() < dt * 20) particles.push({ kind: 'drop', x: fo.x * T + 26 + (Math.random() - 0.5) * 3, y: (fo.y + 2) * T - 42, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 20, t: 0.8, g: 1 });
    for (const p of particles) {
      p.t -= dt;
      if (p.kind === 'leaf') { p.ph += dt * 3; p.x += (p.vx + Math.sin(p.ph) * 14) * dt; p.y += p.vy * dt; if (p.y > cam.y + VH + 10) p.t = 0; }
      else if (p.kind === 'fly') { p.ph += dt; p.x += Math.sin(p.ph * 1.3) * 8 * dt; p.y += Math.cos(p.ph * 0.9) * 6 * dt; }
      else if (p.kind === 'drop') { p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.kind === 'smoke') p.r += dt * 2; }
    }
    particles = particles.filter(p => p.t > 0);
    for (const f of fx) f.t -= dt;
    fx = fx.filter(f => f.t > 0);
    for (const c of creatures) c.a += dt * c.sp;
  }

  // =================================================================== RENDER
  function render() {
    const sx = Math.round(cam.x + (shakeT > 0 ? (Math.random() - 0.5) * 4 : 0)), sy = Math.round(cam.y + (shakeT > 0 ? (Math.random() - 0.5) * 4 : 0));
    ctx.fillStyle = M.interior ? '#120d16' : '#0b0810'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(-sx, -sy);
    ctx.drawImage(M.groundCanvas, 0, 0);
    drawWater(sx, sy);
    // decals and wall decorations first
    for (const o of M.objects) if (visible(o) && (o.decal || o.wallDecor) && o.img) drawObj(o);
    drawShadows(sx, sy);
    // y-sorted drawables
    const list = [];
    for (const o of M.objects) {
      if (!visible(o) || o.decal || o.wallDecor || o.invisible || !o.img) continue;
      const bx = o.x * T, by = (o.y + o.fh) * T;
      if (bx > sx + VW + 80 || bx + o.fw * T < sx - 80 || by < sy - 10 || by - (o.img.height) > sy + VH + 10) continue;
      list.push({ y: by + (o.sortOff || 0), d: () => drawObj(o) });
    }
    for (const n of npcs) if (!n.hidden) list.push({ y: n.y + (n.def.perch ? 40 : 0) + (n.def.inHole ? -6 : 0) + (n.def.fly ? 8 : 0), d: () => drawNPC(n) });
    for (const g of goblins) if (!g.gone) list.push({ y: g.y, d: () => drawGoblin(g) });
    for (const f of followers) list.push({ y: f.y, d: () => drawFollower(f) });
    list.push({ y: player.y, d: drawPlayer });
    for (const c of creatures) list.push({ y: (c.o.y + c.o.fh) * T + 30, d: () => drawCreature(c) });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.d();
    // portal swirl
    for (const o of M.objects) if (o.portal && visible(o)) drawPortal(o);
    drawParticles();
    // effects
    for (const f of fx) {
      if (f.kind === 'flash') { const k = 1 - f.t / 0.6; ctx.strokeStyle = `rgba(255,240,170,${f.t})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + k * 70, 0, 7); ctx.stroke(); }
      if (f.kind === 'x') { ctx.fillStyle = `rgba(255,80,80,${f.t * 2})`; ctx.fillRect(f.x - 3, f.y - 1, 7, 2); ctx.fillRect(f.x - 1, f.y - 3, 2, 7); }
      if (f.kind === 'emote') drawEmote(f);
      if (f.kind === 'ring') { ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, f.t)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); }
      if (f.kind === 'sparkle') { const a = f.t; ctx.fillStyle = `rgba(255,250,200,${a})`; for (let i = 0; i < 8; i++) { const an = i / 8 * 6.28 + time * 2, r = (1 - a) * 26 + 4; ctx.fillRect(f.x + Math.cos(an) * r, f.y + Math.sin(an) * r, 2, 2); } }
      if (f.kind === 'beam') { ctx.fillStyle = `rgba(255,255,240,${Math.min(0.8, f.t)})`; ctx.fillRect(f.x - f.w / 2, f.y, f.w, f.h); }
    }
    // interaction prompt
    updateNameTag();
    if (promptTarget && !held) drawPrompt(promptTarget);
    if (held && promptTarget) drawPrompt(promptTarget, true);
    ctx.restore();
    drawLighting(sx, sy);
    if (M.fog) drawFog(sx, sy);
    if (flapGame) drawFlap(sx, sy);
    if (S.flags.gotCompass && STORY.compass) drawCompass();
    if (player.invuln > 0 && Math.floor(time * 10) % 2) { /* blink handled in drawPlayer */ }
  }
  function drawObj(o) {
    let img = o.img;
    if (o.anim) img = o.anim[Math.floor(time * 2) % o.anim.length];
    if (o.id && o.id.startsWith('ws') && o.wsId) img = GFX.SPR.waystone[S.flags['ws' + o.wsId] ? 1 : 0];
    const x = o.x * T + (o.dx != null ? o.dx : Math.round((o.fw * T - img.width) / 2));
    const y = (o.y + o.fh) * T - img.height + (o.dy || 0);
    if (o.pickup || o.sparkle) { const b = Math.sin(time * 4 + o.x) * 1.5; ctx.drawImage(img, x, y + b - 2); if (Math.sin(time * 3 + o.y) > 0.6) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(x + 12, y - 2 + b, 2, 2); ctx.fillRect(x + 2, y + 10 + b, 1, 1); } return; }
    ctx.drawImage(img, x, y);
  }
  // Faux cast shadows: every sprite throws a soft silhouette towards the lower right (light from the upper left).
  function drawShadows(sx, sy) {
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, VW, VH);
    const k1 = M.interior ? 0.35 : 0.6, k2 = M.interior ? 0.22 : 0.34;
    const cast = (img, left, base) => {
      if (left > sx + VW + 40 || left + img.width + img.height < sx - 40 || base < sy - 10 || base - img.height > sy + VH + 40) return;
      sctx.setTransform(1, 0, -k1, -k2, Math.round(left - sx), Math.round(base - sy));
      sctx.drawImage(silhouette(img), 0, -img.height);
    };
    for (const o of M.objects) {
      if (!visible(o) || o.decal || o.wallDecor || o.invisible || !o.img || o.pickup || o.sparkle || o.noShadow || o.portal) continue;
      let img = o.img; if (o.anim) img = o.anim[0];
      const x = o.x * T + (o.dx != null ? o.dx : Math.round((o.fw * T - img.width) / 2));
      const y = (o.y + o.fh) * T - img.height + (o.dy || 0);
      cast(img, x, y + img.height - (o.kind === 'tree' ? 3 : 0));
    }
    const cs = playerSprite(); cast(cs.frames[player.dir][player.z > 0 ? 1 : player.frame], player.x - cs.ax, player.y - cs.ay + cs.h - 2);
    for (const n of npcs) {
      if (n.hidden || n.def.fly || n.flying || n.def.perch || n.def.inHole) continue;
      const c = charFor(n.def);
      if (n.kind === 'human') cast(c.frames[n.dir][n.frame], n.x - c.ax, n.y - c.ay + c.h - 2);
      else if (n.kind === 'horse') cast(c[n.dir === 'right' ? 'right' : 'left'][0], n.x - 18, n.y + 2);
      else if (n.kind === 'critter') cast(c[0], n.x - 9, n.y + 1);
    }
    for (const gb of goblins) if (!gb.gone) cast(GFX.CHAR.goblinite.frames[gb.frame], gb.x - 11, gb.y + 1);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    const dark = (STORY.darkFor && STORY.darkFor(M.id)) ?? M.dark ?? 0;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = M.interior ? 0.16 : dark > 0.5 ? 0.16 : 0.26;
    ctx.drawImage(shadowC, 0, 0); ctx.restore();
  }
  function shadow(x, y, w = 6, a = 0.3) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.4, 0, 0, 7); ctx.fill(); }
  function playerSprite() {
    if (S.flags.playerSprite) return GFX.CHAR[S.flags.playerSprite];
    if (!S.flags.cloak) return GFX.CHAR.luminaraNoCloak;
    if (!S.flags.hasLantern) return GFX.CHAR.luminaraCloak;
    return GFX.CHAR.luminara;
  }
  function drawPlayer() {
    const p = player; const c = playerSprite();
    shadow(p.x, p.y, 6 - Math.min(3, p.z / 6), 0.3);
    if (p.invuln > 0 && Math.floor(time * 12) % 2) return;
    const fr = c.frames[p.dir][p.z > 0 ? 1 : p.frame];
    ctx.drawImage(fr, Math.round(p.x - c.ax), Math.round(p.y - c.ay - p.z));
    if (S.flags.lanternLit && S.flags.cloak && !S.flags.playerSprite) { // lantern glow pixel
      const gl = 0.5 + Math.sin(time * 9) * 0.15; ctx.fillStyle = `rgba(255,230,140,${gl * 0.35})`;
      const off = p.dir === 'left' ? [-8, -9] : p.dir === 'right' ? [8, -9] : p.dir === 'down' ? [6, -8] : [6, -11];
      ctx.beginPath(); ctx.arc(p.x + off[0], p.y + off[1] - p.z, 4, 0, 7); ctx.fill();
    }
  }
  function drawNPC(n) {
    const c = charFor(n.def);
    if (n.kind === 'horse') {
      const fr = c[n.dir === 'right' ? 'right' : 'left'][Math.floor(n.t * 0.8) % 2 && Math.sin(n.t) > 0.7 ? 1 : 0];
      shadow(n.x, n.y, 14, 0.25); ctx.drawImage(fr, Math.round(n.x - 18), Math.round(n.y - 28)); return;
    }
    if (n.kind === 'dragon') {
      const fly = n.def.fly || n.flying; const bob = fly ? Math.sin(n.t * 5) * 2 - 10 : 0;
      const fr = c[n.dir === 'right' ? 'right' : 'left'][fly ? Math.floor(n.t * 8) % 3 : (Math.sin(n.t * 2) > 0.8 ? 1 : 2)];
      const inHole = n.def.inHole && !n.risen;
      if (!inHole) shadow(n.x, n.y, c.w / 4, 0.25);
      ctx.drawImage(fr, Math.round(n.x - c.w / 2), Math.round(n.y - c.h + bob - (n.z || 0) + (inHole ? 10 : 0)));
      return;
    }
    if (n.kind === 'wisp') { // a lumina: a small living green light, bobbing
      const x = Math.round(n.x), y = Math.round(n.y - 14 + Math.sin(n.t * 3) * 3), a = n.fade == null ? 1 : Math.max(0, n.fade);
      ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10); g.addColorStop(0, 'rgba(210,255,190,0.95)'); g.addColorStop(0.35, 'rgba(110,255,140,0.5)'); g.addColorStop(1, 'rgba(80,255,120,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 10, y - 10, 20, 20); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#f4fff0'; ctx.fillRect(x - 1, y - 1, 2, 2); ctx.restore(); return;
    }
    if (n.kind === 'tall') { // a tall silhouette (the deer that walks upright)
      const fr = c[n.path.length ? Math.floor(n.t * 4) % 2 : 0];
      ctx.save(); ctx.globalAlpha = n.fade == null ? 0.9 : Math.max(0, n.fade);
      if (n.dir === 'right') { ctx.translate(Math.round(n.x), 0); ctx.scale(-1, 1); ctx.drawImage(fr, -9, Math.round(n.y - 32)); } else ctx.drawImage(fr, Math.round(n.x - 9), Math.round(n.y - 32));
      ctx.restore(); return;
    }
    if (n.kind === 'critter') { const fr = c[Math.floor(n.t * (n.path.length ? 8 : 1.5)) % 2]; shadow(n.x, n.y, 6, 0.25); if (n.dir === 'right') { ctx.save(); ctx.translate(Math.round(n.x), 0); ctx.scale(-1, 1); ctx.drawImage(fr, -9, Math.round(n.y - 11)); ctx.restore(); } else ctx.drawImage(fr, Math.round(n.x - 9), Math.round(n.y - 11)); return; }
    if (n.kind === 'owl') { const fr = c[(Math.floor(n.t) % 5 === 0) ? 1 : 0]; ctx.drawImage(fr, Math.round(n.x - 8), Math.round(n.y - 18 + (n.def.perch || 0))); return; }
    shadow(n.x, n.y, 6, 0.28);
    const fr = c.frames[n.dir][n.frame];
    ctx.drawImage(fr, Math.round(n.x - c.ax), Math.round(n.y - c.ay - (n.z || 0)));
  }
  function drawFollower(f) {
    if (f.kind === 'sprite') { const img = GFX.SPR[f.sprite]; shadow(f.x, f.y, 20, 0.25); ctx.drawImage(img, Math.round(f.x - img.width / 2), Math.round(f.y - img.height + 4)); return; }
    const c = GFX.CHAR[f.char];
    if (f.kind === 'horse') { const fr = c[f.dir === 'right' ? 'right' : 'left'][f.frame % 2]; shadow(f.x, f.y, 14, 0.25); ctx.drawImage(fr, Math.round(f.x - 18), Math.round(f.y - 28)); return; }
    const fr = c.frames[f.dir === 'left' || f.dir === 'right' || f.dir === 'up' ? f.dir : 'down'][f.frame || 0];
    shadow(f.x, f.y, 6, 0.28); ctx.drawImage(fr, Math.round(f.x - c.ax), Math.round(f.y - c.ay));
  }
  function drawGoblin(g) {
    const c = GFX.CHAR.goblinite; shadow(g.x, g.y, 7, 0.3);
    ctx.drawImage(c.frames[g.frame], Math.round(g.x - c.ax), Math.round(g.y - c.ay));
    if (g.state === 'chase') { ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(g.x - 1), Math.round(g.y - 24), 2, 4); ctx.fillRect(Math.round(g.x - 1), Math.round(g.y - 19), 2, 2); }
  }
  function drawCreature(c) {
    const o = c.o; const cx = o.x * T + o.fw * 8, cy = (o.y + o.fh) * T - 22;
    const x = cx + Math.cos(c.a) * c.r, y = cy + Math.sin(c.a * 1.7) * 7 - 4;
    const fr = GFX.CHAR.butterflies[c.c][Math.floor(time * 10 + c.a) % 2];
    ctx.drawImage(fr, Math.round(x), Math.round(y));
  }
  function drawWater(sx, sy) {
    const x0 = Math.max(0, Math.floor(sx / T)), y0 = Math.max(0, Math.floor(sy / T)), x1 = Math.min(M.w - 1, Math.floor((sx + VW) / T)), y1 = Math.min(M.h - 1, Math.floor((sy + VH) / T));
    ctx.fillStyle = 'rgba(200,230,255,0.55)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (M.ground[y][x] !== 'water') continue;
      const ph = (time * 1.4 + x * 0.7 + y * 1.3);
      const ox = Math.floor((Math.sin(ph) * 0.5 + 0.5) * 10), oy = (x * 5 + y * 3) % 12 + 2;
      ctx.fillRect(x * T + ox, y * T + oy, 4, 1);
      if (Math.sin(ph * 1.7) > 0.7) ctx.fillRect(x * T + 12 - ox / 2, y * T + (oy + 6) % 14, 2, 1);
    }
  }
  function drawPortal(o) {
    const x = o.x * T, y = (o.y + o.fh) * T - 76; // frame inner: (10,14) size 44x58
    const ix = x + 10, iy = y + 14, iw = 44, ih = 58;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.fillStyle = '#4a0618'; ctx.fillRect(ix, iy, iw, ih);
    const cx = ix + iw / 2, cy = iy + ih / 2;
    for (let i = 0; i < 70; i++) {
      const a = i * 0.45 + time * (1.2 + (i % 3) * 0.3), r = (i * 0.55 + time * 6) % 34;
      ctx.fillStyle = i % 4 === 0 ? '#ffb0c8' : i % 2 ? '#ff2a5a' : '#c0103a';
      ctx.fillRect(Math.round(cx + Math.cos(a) * r * 0.75), Math.round(cy + Math.sin(a) * r), 2, 2);
    }
    if (S.flags.monsterShow) { const a = Math.min(1, S.flags.monsterShow); ctx.globalAlpha = a * (0.7 + Math.sin(time * 3) * 0.2); ctx.drawImage(GFX.CHAR.monster, Math.round(cx - 22), Math.round(cy - 22)); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.drawImage(o.img, x, y);
  }
  function drawParticles() {
    for (const p of particles) {
      if (p.kind === 'leaf') { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, Math.sin(p.ph) > 0 ? 2 : 1); }
      else if (p.kind === 'fly') { const a = (Math.sin(p.ph * 3) * 0.5 + 0.5) * Math.min(1, p.t); ctx.fillStyle = `rgba(220,255,120,${a})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      else if (p.kind === 'rain') { ctx.fillStyle = 'rgba(170,190,235,0.45)'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 3); }
      else if (p.kind === 'drop') { ctx.fillStyle = p.g ? 'rgba(190,225,255,0.85)' : '#a8d0f8'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2); }
      else if (p.kind === 'smoke') { ctx.fillStyle = `rgba(220,220,225,${Math.min(0.5, p.t / 3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else if (p.kind === 'puff') { ctx.fillStyle = `rgba(120,160,80,${p.t})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }
      else if (p.kind === 'spark') { ctx.fillStyle = `rgba(255,${80 + Math.floor(p.t * 80)},120,${Math.min(1, p.t)})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 2); }
      else if (p.kind === 'star') { ctx.fillStyle = `rgba(255,250,210,${Math.min(1, p.t)})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
    }
  }
  const EMOTES = {
    '!': ['..#..', '..#..', '..#..', '.....', '..#..'], '?': ['.###.', '...#.', '..#..', '.....', '..#..'],
    '♥': ['##.##', '#####', '#####', '.###.', '..#..'], '♪': ['..###', '..#.#', '..#..', '###..', '##...'], '…': ['.....', '.....', '.....', '.....', '#.#.#'],
  };
  function drawEmote(f) {
    const pat = EMOTES[f.e]; const x = Math.round(f.x - 5), y = Math.round(f.y - 12 + Math.sin(time * 6) * 1);
    ctx.fillStyle = '#1c1424'; ctx.fillRect(x - 1, y - 1, 11, 10); ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, 9, 8);
    ctx.fillStyle = f.e === '♥' ? '#e0406a' : f.e === '!' ? '#d07a10' : '#2a1c14';
    pat.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') ctx.fillRect(x + 2 + i, y + 1 + j, 1, 1); }));
    ctx.fillStyle = '#1c1424'; ctx.fillRect(x + 4, y + 8, 2, 2);
  }
  function updateNameTag() {
    const el = $('nameTag');
    const it = !dialog && !busy && !tipActive && !panelOpen() ? ((hoverTarget && hoverTarget.type === 'npc' && hoverTarget) || (promptTarget && promptTarget.type === 'npc' && promptTarget)) : null;
    if (!it || it.n.hidden) { el.style.display = 'none'; return; }
    const n = it.n, met = hasMet(n);
    const h = n.kind === 'horse' ? 34 : n.kind === 'critter' ? 16 : n.kind === 'owl' ? 20 : n.kind === 'dragon' ? 30 : 42;
    el.textContent = met ? npcName(n) : '?';
    el.style.background = met ? (n.color || (n.def && n.def.color) || '#7a5530') : '#6a6070';
    el.style.left = ((n.x - cam.x) * scale) + 'px'; el.style.top = ((n.y - h - cam.y + ((n.def && n.def.perch) || 0)) * scale) + 'px';
    el.style.display = 'block';
  }
  function drawPrompt(it, usingItem) {
    let x = it.x + it.w / 2, y = it.y - 6;
    if (it.type === 'npc') { const n = it.n; y = n.y - (n.kind === 'horse' ? 32 : n.kind === 'dragon' ? 26 : n.kind === 'critter' ? 14 : 38) + (n.def.perch || 0); x = n.x; }
    else if (it.o.img && !it.o.invisible) y = (it.o.y + it.o.fh) * T - it.o.img.height + (it.o.dy || 0) - 4;
    y += Math.sin(time * 5) * 1.5;
    ctx.fillStyle = '#1c1424'; ctx.fillRect(Math.round(x - 4), Math.round(y - 5), 9, 6);
    ctx.fillStyle = usingItem ? '#8ad0ff' : '#ffe070';
    ctx.fillRect(Math.round(x - 3), Math.round(y - 4), 7, 1); ctx.fillRect(Math.round(x - 2), Math.round(y - 3), 5, 1); ctx.fillRect(Math.round(x - 1), Math.round(y - 2), 3, 1); ctx.fillRect(Math.round(x), Math.round(y - 1), 1, 1);
  }
  function lightsList() {
    const L = [];
    if (S.flags.lanternLit && !S.flags.playerSprite) {
      const r = (S.flags.lanternFull ? 62 : 40) + S.lvl * 3 + Math.sin(time * 9) * 1.5;
      L.push({ x: player.x, y: player.y - 10 - player.z, r, c: '255,210,120' });
    } else L.push({ x: player.x, y: player.y - 10, r: 22, c: '200,200,255' });
    for (const o of M.objects) {
      if (!visible(o)) continue;
      let li = o.light;
      if (o.wsId && S.flags['ws' + o.wsId]) li = { r: 48, c: '255,220,120' };
      if (!li) continue;
      const x = o.x * T + o.fw * 8, y = (o.y + o.fh) * T - (o.img ? o.img.height * 0.6 : 8);
      L.push({ x, y, r: li.r + Math.sin(time * 3 + o.x) * 2, c: li.c });
    }
    for (const p of particles) if (p.kind === 'fly') L.push({ x: p.x, y: p.y, r: 6, c: '220,255,120', weak: true });
    for (const n of npcs) if (n.def.char === 'aurelina' || n.glow) L.push({ x: n.x, y: n.y - (n.kind === 'wisp' ? 14 : 20), r: (n.glow || 80) * (n.fade == null ? 1 : Math.max(0, n.fade)), c: n.glowC || '255,255,240' });
    for (const f of fx) if (f.kind === 'flash') L.push({ x: f.x, y: f.y, r: 40 + (1 - f.t / 0.6) * 80, c: '255,250,210' });
    for (const f of fx) if (f.kind === 'beam') L.push({ x: f.x, y: f.y + f.h / 2, r: 90, c: '255,255,240' });
    return L;
  }
  function drawLighting(sx, sy) {
    const tint = STORY.tintFor ? STORY.tintFor(M.id) : M.tint;
    let dark = M.dark || 0;
    if (STORY.darkFor) { const d = STORY.darkFor(M.id); if (d != null) dark = d; }
    if (dark > 0) {
      lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, VW, VH);
      lctx.fillStyle = `rgba(8,6,22,${dark})`; lctx.fillRect(0, 0, VW, VH);
      lctx.globalCompositeOperation = 'destination-out';
      const L = lightsList();
      for (const l of L) {
        const x = l.x - sx, y = l.y - sy; if (x < -l.r || x > VW + l.r || y < -l.r || y > VH + l.r) continue;
        const g = lctx.createRadialGradient(x, y, 0, x, y, l.r);
        g.addColorStop(0, `rgba(0,0,0,${l.weak ? 0.4 : 1})`); g.addColorStop(0.55, `rgba(0,0,0,${l.weak ? 0.2 : 0.75})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g; lctx.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
      }
      ctx.drawImage(lightC, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of L) {
        if (l.weak) continue; const x = l.x - sx, y = l.y - sy;
        const g = ctx.createRadialGradient(x, y, 0, x, y, l.r * 0.8);
        g.addColorStop(0, `rgba(${l.c},0.16)`); g.addColorStop(1, `rgba(${l.c},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (tint === 'dawn') { ctx.fillStyle = 'rgba(255,170,90,0.13)'; ctx.fillRect(0, 0, VW, VH); }
    if (tint === 'dusk') { ctx.fillStyle = 'rgba(120,60,140,0.18)'; ctx.fillRect(0, 0, VW, VH); }
    if (tint === 'gold') { ctx.fillStyle = 'rgba(255,200,120,0.1)'; ctx.fillRect(0, 0, VW, VH); }
  }
  function drawFog(sx, sy) {
    if (Array.isArray(M.fog)) { // thick banks of mist over part of a map (drawn above the darkness, so they glow pale)
      for (const f of M.fog) {
        if (f.if && !f.if(S)) continue;
        const x0 = f.x * T - sx, y0 = f.y * T - sy, w = f.w * T, h = f.h * T;
        if (x0 > VW || y0 > VH || x0 + w < 0 || y0 + h < 0) continue;
        for (let gy = 0; gy <= h; gy += 14) for (let gx = -20; gx <= w + 20; gx += 18) {
          const k = GFX.hash(gx, gy, 77), edge = Math.min(1, gy / 20, (h - gy) / 20 + 0.4);
          const x = x0 + gx + Math.sin(time * 0.4 + k * 9) * 8 + ((time * (3 + k * 4)) % 18), y = y0 + gy + Math.cos(time * 0.3 + k * 7) * 3;
          if (x < -40 || x > VW + 40 || y < -30 || y > VH + 30) continue;
          const r = 22 + k * 14, a = 0.16 * Math.max(0.2, edge);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(210,218,232,${a})`); g.addColorStop(1, 'rgba(210,218,232,0)');
          ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }
      return;
    }
    for (let i = 0; i < 7; i++) {
      const x = ((i * 97 + time * (6 + i)) % (VW + 160)) - 80, y = (i * 53 + Math.sin(time * 0.3 + i) * 10) % VH;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 70);
      g.addColorStop(0, 'rgba(190,200,230,0.10)'); g.addColorStop(1, 'rgba(190,200,230,0)');
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.35); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140); ctx.restore();
    }
  }
  function drawCompass() {
    const tgt = STORY.compass(M.id);
    const cx = VW - 18, cy = 32;
    ctx.fillStyle = '#1c1424'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#c09040'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a7a6a'; ctx.fillRect(cx - 0.5, cy - 9, 1, 2); ctx.fillRect(cx - 0.5, cy + 7, 1, 2); ctx.fillRect(cx - 9, cy - 0.5, 2, 1); ctx.fillRect(cx + 7, cy - 0.5, 2, 1);
    let a;
    if (tgt) a = Math.atan2(tgt.y * T + 8 - player.y, tgt.x * T + 8 - player.x);
    else a = -Math.PI / 2 + Math.sin(time * 2) * 0.6;
    const ex = Math.cos(a), ey = Math.sin(a);
    ctx.strokeStyle = '#c03030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ex * 7, cy + ey * 7); ctx.stroke();
    ctx.strokeStyle = '#3a3a44'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - ex * 5, cy - ey * 5); ctx.stroke();
    ctx.fillStyle = '#e0b04a'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }

  // =================================================================== DIALOGUE
  function entityById(id) {
    if (id === 'luminara' || id === 'player') return player;
    return npcs.find(n => n.id === id) || followers.find(f => f.id === id) || null;
  }
  function fmt(t) { return t.replace(/\{friend\}/g, S.friendName).replace(/\*(.+?)\*/g, '<i>$1</i>'); }
  function speakerInfo(who) {
    if (who === 'luminara') return { name: 'Luminara', color: '#2c3a78', voice: 1, ent: player };
    const e = entityById(who);
    if (e) return { name: e.def ? (e.def.nameFn ? S.friendName : e.name) : e.name, color: e.color || (e.def && e.def.color) || '#7a5530', voice: e.voice || 1, ent: e };
    const extra = STORY.SPEAKERS && STORY.SPEAKERS[who];
    if (extra) return Object.assign({ ent: null }, extra);
    return { name: who, color: '#7a5530', voice: 1, ent: null };
  }
  async function say(who, text, opts = {}) { await flushNotices(); return sayNow(who, text, opts); }
  function sayNow(who, text, opts = {}) {
    return new Promise(res => {
      const info = speakerInfo(who);
      if (info.ent && info.ent !== player && info.ent.def && Math.hypot(info.ent.x - player.x, info.ent.y - player.y) < 90) meet(info.ent);
      const el = document.createElement('div');
      el.className = 'bubble' + (opts.think ? ' think' : '');
      if (!opts.think) el.innerHTML = `<span class="who" style="--who:${info.color}">${info.name}</span>`;
      const body = document.createElement('div'); el.appendChild(body);
      const more = document.createElement('span'); more.className = 'more'; more.textContent = 'continue ▶'; more.style.display = 'none'; el.appendChild(more);
      ui.appendChild(el); sceneLines++;
      const full = fmt(text);
      const plain = full.replace(/<[^>]+>/g, '');
      dialog = { el, body, more, full, plain, shown: 0, res, info, choice: null, think: opts.think, ent: info.ent, kind: 'bubble' };
      positionBubble();
      el.addEventListener('pointerdown', e => { e.stopPropagation(); dialogKey('act'); });
    });
  }
  function think(text) { return say('luminara', text, { think: true }); }
  async function narrate(text, opts = {}) { await flushNotices(); return narrateNow(text, opts); }
  function narrateNow(text, opts = {}) {
    return new Promise(res => {
      const el = document.createElement('div'); el.className = 'narr' + (opts.big ? ' big' : '');
      const body = document.createElement('div'); el.appendChild(body);
      const more = document.createElement('span'); more.className = 'more'; more.textContent = 'continue ▶'; more.style.display = 'none'; el.appendChild(more);
      ui.appendChild(el); sceneLines++;
      const full = fmt(text);
      dialog = { el, body, more, full, plain: full.replace(/<[^>]+>/g, ''), shown: 0, res, kind: 'narr', info: { voice: 0.6 } };
      el.addEventListener('pointerdown', e => { e.stopPropagation(); dialogKey('act'); });
    });
  }
  async function choice(who, text, options) {
    await flushNotices();
    return new Promise(res => {
      sayNow(who, text).then(() => {});
      const d = dialog; d.choiceRes = res; d.options = options; d.sel = 0;
    });
  }
  function revealHTML(full, n) {
    // reveal n visible characters, keeping tags intact
    let out = '', cnt = 0;
    for (let i = 0; i < full.length; i++) {
      if (full[i] === '<') { const j = full.indexOf('>', i); out += full.slice(i, j + 1); i = j; continue; }
      if (cnt >= n) break; out += full[i]; cnt++;
    }
    return out;
  }
  let blipT = 0;
  let updateDialog = function (dt) {
    const d = dialog;
    if (d.shown < d.plain.length) {
      d.shown = Math.min(d.plain.length, d.shown + dt * (d.kind === 'narr' ? 55 : 48));
      d.body.innerHTML = revealHTML(d.full, Math.floor(d.shown));
      blipT += dt; if (blipT > 0.07 && d.kind !== 'narr') { blipT = 0; AUDIO.sfx('blip', d.info.voice); }
      if (d.shown >= d.plain.length) finishReveal();
    }
    if (d.kind === 'bubble') positionBubble();
  };
  function finishReveal() {
    const d = dialog; d.shown = d.plain.length; d.body.innerHTML = d.full;
    if (d.options) {
      const box = document.createElement('div'); box.className = 'choices';
      d.options.forEach((o, i) => { const b = document.createElement('button'); b.textContent = o; if (i === 0) b.classList.add('sel'); b.onpointerdown = e => { e.stopPropagation(); pickChoice(i); }; box.appendChild(b); });
      d.el.appendChild(box); d.box = box;
    } else d.more.style.display = 'block';
    if (d.kind === 'bubble') positionBubble();
  }
  function pickChoice(i) {
    const d = dialog; if (!d || !d.options) return;
    AUDIO.sfx('blip', 1.4);
    d.el.remove(); dialog = null; d.res(); d.choiceRes(i);
  }
  function dialogKey(k) {
    const d = dialog; if (!d) return;
    if (d.shown < d.plain.length) { finishReveal(); return; }
    if (d.options) {
      if (k === 'up' || k === 'down') { d.sel = (d.sel + (k === 'up' ? -1 : 1) + d.options.length) % d.options.length; [...d.box.children].forEach((b, i) => b.classList.toggle('sel', i === d.sel)); AUDIO.sfx('blip', 1.2); }
      if (k === 'act' || k === 'jump') pickChoice(d.sel);
      return;
    }
    if (k === 'act' || k === 'jump' || k === 'esc') { d.el.remove(); dialog = null; d.res(); }
  }
  function positionBubble() {
    const d = dialog; if (!d || d.kind !== 'bubble') return;
    const e = d.ent; let x = VW / 2, y = VH * 0.35;
    if (e) {
      const h = e === player ? 36 : e.kind === 'critter' ? 12 : e.kind === 'horse' ? 30 : e.kind === 'dragon' ? 26 : e.kind === 'owl' ? 18 : (e.char ? 26 : 38);
      x = e.x - cam.x; y = e.y - h - (e.z || 0) - cam.y + ((e.def && e.def.perch) || 0) - (e.char ? 10 : 0);
    }
    const W = stage.clientWidth, H = stage.clientHeight;
    let px = x * scale, py = y * scale;
    const bw = d.el.offsetWidth, bh = d.el.offsetHeight;
    // is the speaker (their head and feet) actually visible on screen?
    const feetY = e ? (e.y - cam.y) * scale : py;
    const offscreen = e && (px < 0 || px > W || feetY < 0 || py > H);
    d.el.classList.toggle('off', !!offscreen);
    let arrow = d.el.querySelector('.offarrow');
    if (offscreen) {
      // keep the whole bubble on screen, at the edge nearest the speaker, with an arrow pointing their way
      const barH = ($('bar').offsetHeight || 0) + 24, top = 40, M = 14;
      const cx = Math.max(bw / 2 + M + 20, Math.min(W - bw / 2 - M - 20, px));
      const cy = Math.max(top + bh / 2 + 20, Math.min(H - barH - bh / 2 - 20, py));
      d.el.classList.remove('below');
      d.el.style.left = cx + 'px'; d.el.style.top = (cy + bh / 2) + 'px';
      if (!arrow) { arrow = document.createElement('div'); arrow.className = 'offarrow'; arrow.textContent = '➤'; d.el.appendChild(arrow); }
      const dx = px - cx, dy = py - cy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const t = Math.min((bw / 2 + 4) / Math.max(0.001, Math.abs(ux)), (bh / 2 + 4) / Math.max(0.001, Math.abs(uy)));
      arrow.style.left = (bw / 2 + ux * t) + 'px'; arrow.style.top = (bh / 2 + uy * t) + 'px';
      arrow.style.setProperty('--rot', Math.atan2(uy, ux) + 'rad');
      return;
    }
    if (arrow) arrow.remove();
    let below = py - bh - 16 < 4;
    if (below) py = py + 40 * scale;
    const cx = Math.max(bw / 2 + 6, Math.min(W - bw / 2 - 6, px));
    d.el.classList.toggle('below', below);
    d.el.style.left = cx + 'px'; d.el.style.top = (below ? py : py - 6) + 'px';
    d.el.style.setProperty('--tail', Math.max(14, Math.min(bw - 14, bw / 2 + (px - cx))) + 'px');
  }

  // =================================================================== TUTORIAL TIPS
  // Each tip appears once per save, the first time the thing it explains matters.
  const isTouch = () => document.body.classList.contains('touch');
  const keyName = (k, btn) => isTouch() ? `the <b>${btn}</b> button` : `<b>${k}</b> (or the <b>${btn}</b> button)`;
  const TIPS = {
    move: () => ({ title: 'Welcome, Light-Bearer!', text: isTouch() ? 'Tap anywhere to walk there. Tap people and things to talk to them, look at them or pick them up.' : 'Walk with the <b>arrow keys</b> (or click where you want to go). Press <b>E</b> next to people and things — or click them — to talk, look or pick up.' }),
    goal: () => ({ target: '#objective', title: 'Your goal', text: 'This gold <b>Goal</b> line always tells you what to do next. Check it whenever you are not sure!' }),
    quests: () => ({ target: '#bar [data-k=quest]', title: 'Quests', text: `You just got your first quest, <i>A New Dawn</i>. It is a list of little jobs. Open ${keyName('J', 'Quests')} any time to see every quest and tick off what you have done.` }),
    menu: () => ({ target: '#bar [data-k=menu]', title: 'Menu', text: `${isTouch() ? 'The <b>Menu</b> button' : '<b>Esc</b> (or the <b>Menu</b> button)'} pauses the game. From there you can change options, read how to play, switch players, or go back to the title. Your progress saves by itself — no need to save.` }),
    satchel: () => ({ target: '#bar [data-k=inv]', title: 'Your Satchel', text: `Everything you pick up goes in your satchel. Open ${keyName('I', 'Satchel')} to look at an item, <b>Use</b> it on something, or <b>Combine</b> two items together.` }),
    use: () => ({ target: '#bar [data-k=inv]', title: 'Using an item', text: 'Open your <b>Satchel</b> → tap the item → press <b>Use…</b> → then tap the thing you want to use it on.' }),
    combine: () => ({ target: '#bar [data-k=inv]', title: 'Combining items', text: 'Some items work better together! Open your <b>Satchel</b> → tap one item → press <b>Combine…</b> → then tap the other item.' }),
    compass: () => ({ target: 'compass', title: "Father's compass", text: 'This compass is special — it does <b>not</b> point north. Its <b style="color:#c03030">red needle</b> always points the way to your <b>next goal</b>. Follow it through doors and paths, and when you are in the right place it points straight at it.' }),
    jump: () => ({ target: isTouch() ? '#tbtns [data-b=jump]' : null, title: 'Jumping', text: isTouch() ? 'Tap <b>Jump</b> to leap — over logs, across streams, or up at things that are just out of reach.' : 'Press <b>Space</b> to jump — over logs, across streams, or up at things that are just out of reach.' }),
    light: () => ({ target: '#hLightRow', title: 'Lantern light', text: `This bar shows your lantern's light. ${isTouch() ? 'Tap <b>Raise Light</b>' : 'Press <b>Q</b>'} to hold your lantern high and light up the darkness further. It uses a little light, and refills by itself.` }),
    hearts: () => ({ target: '#hHearts', title: 'Courage', text: `These hearts are Luminara's courage. Goblinites take one away if they catch her — keep them back with ${keyName('Q', 'Raise Light')}. Hearts come back slowly, and if they run out she just picks herself up again.` }),
    xp: () => ({ target: '#hLvlRow', title: 'Experience', text: 'Helping people earns <b>experience</b>. Fill the blue bar to reach a new <b>level</b> — Luminara gets braver (more hearts) and her lantern shines brighter.' }),
    coins: () => ({ target: '#hCoinRow', title: 'Copper coins', text: 'Your copper coins. Spend them at shops and stalls around Kraxenville.' }),
    journal: () => ({ target: '#bar [data-k=quest]', title: 'Your journal', text: 'Memories and discoveries are written in your <b>Journal</b>. Open <b>Quests</b> and choose the <b>Journal</b> tab to read it.' }),
    hint: () => ({ target: '#panelBody .qhint', title: 'Stuck?', text: `If you ever get stuck, ${isTouch() ? 'tap' : 'click'} <b>Hint</b> next to a quest for a small nudge with just the next step. Asking again gives a clearer hint.` }),
    map: () => ({ target: '#bar [data-k=map]', title: 'Your map', text: `You copied the map of the Kingdom of Krax! Open ${keyName('P', 'Map')} any time to see where you are.` }),
  };
  let tipQueue = [], tipActive = null;
  function tipSeen(id) { return S && S.flags['tip_' + id]; }
  function tipLater(id) { if (!S || tipSeen(id) || tipQueue.includes(id)) return; tipQueue.push(id); }
  async function flushTips() { while (tipQueue.length && mode === 'play') await tip(tipQueue.shift()); }
  function targetRect(t) {
    const sr = stage.getBoundingClientRect();
    if (t === 'compass') { const cr = cv.getBoundingClientRect(), k = cr.width / VW; return { x: (VW - 18 - 14) * k + cr.left - sr.left, y: (32 - 14) * k + cr.top - sr.top, w: 28 * k, h: 34 * k }; }
    const el = t && document.querySelector(t); if (!el || !el.offsetParent) return null;
    const r = el.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
  }
  async function tip(id) {
    if (!S || tipSeen(id) || !TIPS[id]) return;
    await flushNotices();
    if (tipSeen(id)) return;
    return tipNow(id);
  }
  function tipNow(id) {
    S.flags['tip_' + id] = 1; tipQueue = tipQueue.filter(t => t !== id);
    if (DBG.auto) return Promise.resolve();
    const d = TIPS[id](); hud();
    return new Promise(res => {
      const layer = document.createElement('div'); layer.className = 'tiplayer';
      const r = targetRect(d.target);
      const ring = document.createElement('div'); ring.className = 'tipring' + (r ? '' : ' none');
      if (r) { const pad = 6; Object.assign(ring.style, { left: (r.x - pad) + 'px', top: (r.y - pad) + 'px', width: (r.w + pad * 2) + 'px', height: (r.h + pad * 2) + 'px' }); }
      const box = document.createElement('div'); box.className = 'tipbox';
      box.innerHTML = `<h4>${d.title}</h4><p>${d.text}</p><div class="tipbtns"><button class="primary">Got it ▶</button></div>`;
      layer.appendChild(ring); layer.appendChild(box); ui.appendChild(layer);
      // place the note next to the highlighted thing
      const W = stage.clientWidth, H = stage.clientHeight, bw = box.offsetWidth, bh = box.offsetHeight;
      let bx = W / 2 - bw / 2, by = H / 2 - bh / 2;
      if (r) {
        const cx = r.x + r.w / 2;
        bx = Math.max(10, Math.min(W - bw - 10, cx - bw / 2));
        by = r.y + r.h / 2 > H / 2 ? r.y - bh - 22 : r.y + r.h + 22;
        by = Math.max(10, Math.min(H - bh - 10, by));
        box.classList.add(r.y + r.h / 2 > H / 2 ? 'up' : 'down');
        box.style.setProperty('--ax', Math.max(18, Math.min(bw - 18, cx - bx)) + 'px');
      }
      box.style.left = bx + 'px'; box.style.top = by + 'px';
      AUDIO.sfx('ding');
      const done = () => { layer.remove(); tipActive = null; res(); };
      tipActive = done;
      box.querySelector('button').onclick = e => { e.stopPropagation(); done(); };
      layer.addEventListener('pointerdown', e => { if (e.target === layer || e.target === ring) e.stopPropagation(); });
    });
  }
  function resetTips() { for (const k of Object.keys(S.flags)) if (k.startsWith('tip_')) delete S.flags[k]; }

  // =================================================================== HUD, TOASTS
  let lastGoal = '';
  function hud() {
    if (!S) return;
    const h = $('hHearts'); let s = '';
    for (let i = 0; i < S.maxHearts; i++) s += `<span style="color:${i < S.hearts ? '#ff5a7a' : '#5a4a6a'}">♥</span>`;
    h.innerHTML = s;
    $('hLight').style.width = (S.light / S.maxLight * 100) + '%';
    $('hLvl').textContent = S.lvl;
    const a = LEVELS[S.lvl - 1] || 0, b = LEVELS[S.lvl] || (a + 200);
    $('hXp').style.width = Math.min(100, (S.xp - a) / (b - a) * 100) + '%';
    $('hCoins').textContent = S.coins;
    const ob = STORY.objective ? STORY.objective() : '';
    $('objective').innerHTML = ob ? `<b>Goal:</b> ${ob}` : ''; $('objective').style.display = ob && mode === 'play' ? 'block' : 'none';
    if (ob && ob !== lastGoal) { if (lastGoal) { const o = $('objective'); o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); } lastGoal = ob; }
    const q = sel => document.querySelector(sel);
    q('#bar [data-k=inv]').style.display = S.flags.hasSatchel ? '' : 'none';
    q('#bar [data-k=map]').style.display = S.flags.sawMap ? '' : 'none';
    q('#bar [data-k=quest]').style.display = Object.keys(S.q).length ? '' : 'none';
    const ct = $('compassTag'); ct.style.display = S.flags.gotCompass && mode === 'play' ? 'block' : 'none';
    ct.style.left = ((VW - 18) * scale) + 'px'; ct.style.top = ((32 + 14) * scale) + 'px';
    $('hud').style.display = mode === 'play' ? 'flex' : 'none';
    document.body.classList.toggle('inplay', mode === 'play');
    $('bar').style.display = mode === 'play' ? 'flex' : 'none';
    $('hud').querySelectorAll('.row')[1].style.display = S.flags.lanternLit ? 'flex' : 'none';
    const lb = document.querySelector('#tbtns [data-b=light]'); if (lb) lb.style.display = S.flags.lanternLit ? '' : 'none';
  }
  // Small hints. They stay until tapped, or until the player's next action (or 20 seconds).
  function toast(text, iconName, cls, ms) {
    const el = document.createElement('div'); el.className = 'toast' + (cls ? ' ' + cls : '');
    if (iconName && GFX.ICONS[iconName]) { const c = GFX.cnv(16, 16); c.getContext('2d').drawImage(GFX.ICONS[iconName], 0, 0); el.appendChild(c); }
    const sp = document.createElement('span'); sp.innerHTML = fmt(text); el.appendChild(sp);
    const x = document.createElement('b'); x.className = 'tx'; x.textContent = '×'; el.appendChild(x);
    el.born = performance.now();
    el.addEventListener('pointerdown', e => { e.stopPropagation(); el.remove(); });
    const box = $('toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), ms || 20000);
  }
  function clearToasts(minAge = 1500) { const now = performance.now(); for (const el of [...$('toasts').children]) if (now - el.born > minAge) el.remove(); }

  // Important news (quests, items, levels, journal, coins): collected, then shown together on a card
  // that waits for the player to tap Continue, so nothing vanishes before it has been read.
  let notices = [];
  function notice(text, icon, o = {}) { notices.push(Object.assign({ text, icon }, o)); }
  function iconHTML(name) { return name && GFX.ICONS[name] ? `<img class="nic" src="${GFX.ICONS[name].toDataURL ? GFX.ICONS[name].toDataURL() : ''}">` : '<span class="nic"></span>'; }
  async function flushNotices() {
    if (!notices.length || mode !== 'play') return;
    const list = notices.splice(0);
    if (DBG.auto) return;
    while (tipActive) await wait(50);
    const order = { quest: 0, done: 1, lvl: 2 }, rank = n => order[n.kind] ?? 3;
    list.sort((a, b) => rank(a) - rank(b));
    const big = list.find(n => n.kind === 'quest' || n.kind === 'done' || n.kind === 'lvl');
    const title = big ? (big.kind === 'quest' ? (big.side ? 'New side story' : 'New quest') : big.kind === 'done' ? 'Quest complete!' : 'Level up!') : list.some(n => n.kind === 'item') ? 'In your satchel' : 'Good news';
    let h = '';
    for (const n of list) {
      h += `<div class="nrow ${n.kind || ''}">${iconHTML(n.icon)}<div><div class="nt">${fmt(n.text)}</div>${n.tag ? `<span class="ntag ${n.side ? 'side' : 'main'}">${n.tag}</span>` : ''}${n.desc ? `<div class="nd">${fmt(n.desc)}</div>` : ''}</div></div>`;
    }
    if (list.some(n => n.kind === 'quest')) h += `<p class="nfoot">Your goal is always at the top of the screen. Every step is in <b>Quests</b>${isTouch() ? '' : ' (J)'}.</p>`;
    return new Promise(res => {
      const layer = document.createElement('div'); layer.className = 'tiplayer ncard-bg';
      const box = document.createElement('div'); box.className = 'ncard';
      box.innerHTML = `<h4>${title}</h4><div class="nlist">${h}</div><div class="tipbtns"><button class="primary">Continue ▶</button></div>`;
      layer.appendChild(box); ui.appendChild(layer);
      const shown = performance.now();
      const done = () => { if (performance.now() - shown < 600) return; layer.remove(); tipActive = null; res(); };
      tipActive = done;
      box.querySelector('button').onclick = e => { e.stopPropagation(); done(); };
      layer.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target !== layer) return; done(); });
    });
  }

  // =================================================================== ITEMS, XP, QUESTS
  function has(id) { return S.inv.includes(id); }
  function give(id, quiet) {
    if (!S.inv.includes(id)) S.inv.push(id);
    if (!quiet) { AUDIO.sfx('pick'); const it = STORY.ITEMS[id]; notice(`Got <b>${it ? it.name : id}</b>`, it ? it.icon : null, { kind: 'item', desc: it && it.desc }); }
    hud();
  }
  function take(id) { S.inv = S.inv.filter(i => i !== id); if (held === id) setHeld(null); hud(); }
  function addXP(n, quiet) {
    S.xp += n; tipLater('xp');
    if (!quiet) notice(`+${n} experience`, 'star', { kind: 'xp' });
    while (S.lvl < LEVELS.length && S.xp >= LEVELS[S.lvl]) {
      S.lvl++; S.maxHearts = Math.min(8, S.maxHearts + 1); S.maxLight = Math.min(8, S.maxLight + 1); S.hearts = S.maxHearts; S.light = S.maxLight;
      AUDIO.sfx('level'); notice(`✦ Level ${S.lvl}!`, 'lantern', { kind: 'lvl', desc: 'Your courage grows: one more heart.' });
      fx.push({ kind: 'sparkle', x: player.x, y: player.y - 14, t: 1 });
    }
    hud();
  }
  function addCoins(n) { S.coins += n; tipLater('coins'); if (n > 0) { AUDIO.sfx('coin'); notice(`+${n} copper`, 'coin', { kind: 'coin' }); } hud(); }
  function questStart(id) {
    if (S.q[id]) return; S.q[id] = 'active'; AUDIO.sfx('quest');
    const q = STORY.QUESTS[id], first = q.steps && q.steps[0];
    notice(`<b>${q.title}</b>`, 'writ', { kind: 'quest', side: !!q.side, tag: q.side ? 'Side story · optional' : 'Main quest', desc: q.desc + (first ? `<br>First: ${first.t}.` : '') }); hud();
  }
  function questDone(id, xp) {
    if (S.q[id] === 'done') return; S.q[id] = 'done'; AUDIO.sfx('done');
    const q = STORY.QUESTS[id]; notice(`<b>${q.title}</b>`, 'sealedWrit', { kind: 'done', side: !!q.side, tag: q.side ? 'Side story complete' : 'Main quest complete' });
    if (xp || q.xp) addXP(xp || q.xp); hud();
  }
  function setHeld(id) {
    held = id; const el = $('held');
    if (!id) { el.style.display = 'none'; return; }
    const it = STORY.ITEMS[id]; el.style.display = 'flex';
    const c = el.querySelector('canvas'); const g = c.getContext('2d'); g.clearRect(0, 0, 16, 16); g.drawImage(GFX.ICONS[it.icon], 0, 0);
    el.querySelector('span').textContent = 'Using: ' + it.name;
  }
  function emote(who, e, dur = 1.2) { const ent = entityById(who) || player; fx.push({ kind: 'emote', e, t: dur, get x() { return ent.x; }, get y() { return ent.y - (ent === player ? 38 : ent.kind === 'dragon' ? 26 : ent.kind === 'critter' ? 14 : 40) + ((ent.def && ent.def.perch) || 0); } }); }

  // =================================================================== PANELS
  let curTab = null, selItem = null, combineFrom = null;
  function panelOpen() { return $('panel').classList.contains('open'); }
  function openPanel(tab) { curTab = tab; $('panel').classList.add('open'); document.body.classList.add('panelopen'); renderPanel(); AUDIO.sfx('blip', 0.8); }
  function closePanel() { $('panel').classList.remove('open'); document.body.classList.remove('panelopen'); combineFrom = null; curTab = null; }
  document.querySelectorAll('#panel header button').forEach(b => b.addEventListener('click', () => { const t = b.dataset.tab; if (t === 'close') closePanel(); else openPanel(t); }));
  document.querySelectorAll('#bar button').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); AUDIO.init(); if (busy || dialog) return; const k = b.dataset.k;
    if (k === 'inv') { if (S.flags.hasSatchel) openPanel('inv'); else toast('You have no satchel yet.', null, null, 3500); }
    if (k === 'quest') openPanel('quest'); if (k === 'map') openPanel('map'); if (k === 'menu') pauseMenu();
  }));
  function renderPanel() {
    document.querySelectorAll('#panel header button').forEach(b => b.classList.toggle('on', b.dataset.tab === curTab));
    const body = $('panelBody'); body.innerHTML = '';
    if (curTab === 'inv') renderInv(body);
    if (curTab === 'quest') renderQuests(body);
    if (curTab === 'journal') renderJournal(body);
    if (curTab === 'map') renderMap(body);
    if (curTab === 'opts') renderOpts(body);
  }
  function iconCanvas(name) { const c = GFX.cnv(16, 16); if (GFX.ICONS[name]) c.getContext('2d').drawImage(GFX.ICONS[name], 0, 0); return c; }
  function renderInv(body) {
    const grid = document.createElement('div'); grid.className = 'inv-grid';
    const det = document.createElement('div'); det.className = 'detail';
    if (!S.inv.length) grid.innerHTML = '<p>Your satchel is empty.</p>';
    S.inv.forEach(id => {
      const it = STORY.ITEMS[id]; const sl = document.createElement('div'); sl.className = 'slot' + (selItem === id ? ' sel' : '') + (combineFrom === id ? ' combine' : '');
      sl.appendChild(iconCanvas(it.icon)); sl.title = it.name;
      sl.onclick = () => {
        if (combineFrom && combineFrom !== id) { const a = combineFrom; combineFrom = null; closePanel(); run(() => STORY.combine(a, id)); return; }
        selItem = id; AUDIO.sfx('blip', 1.1); renderPanel();
      };
      grid.appendChild(sl);
    });
    if (selItem && S.inv.includes(selItem)) {
      const it = STORY.ITEMS[selItem];
      det.innerHTML = `<h3>${it.name}</h3><p>${fmt(it.desc)}</p>`;
      if (combineFrom) det.innerHTML += `<p><b>Choose another item to combine with ${STORY.ITEMS[combineFrom].name}…</b></p>`;
      const acts = document.createElement('div'); acts.className = 'acts';
      const mkb = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; acts.appendChild(b); };
      mkb('Use…', () => { setHeld(selItem); closePanel(); toast('Now walk up to something and press E (or click it) to use the ' + it.name + '.'); });
      mkb('Combine…', () => { combineFrom = selItem; renderPanel(); });
      if (it.self) mkb(it.selfLabel || 'Use now', () => { const id = selItem; closePanel(); run(() => STORY.useSelf(id)); });
      det.appendChild(acts);
    } else det.innerHTML = '<h3>Satchel</h3><p>Click an item to look at it, use it on something in the world, or combine it with another item.</p>';
    const st = document.createElement('div'); st.className = 'stats';
    st.innerHTML = `<span>Level</span><b>${S.lvl}</b><span>Experience</span><b>${S.xp}${LEVELS[S.lvl] ? ' / ' + LEVELS[S.lvl] : ''}</b><span>Courage</span><b>${S.hearts} / ${S.maxHearts} ♥</b><span>Lantern light</span><b>${S.light} / ${S.maxLight}</b><span>Copper</span><b>${S.coins}</b><span>Golden leaves</span><b>${S.leaves.length} / ${STORY.TOTAL_LEAVES}</b>`;
    det.appendChild(st);
    body.appendChild(grid); body.appendChild(det);
  }
  function renderQuests(body) {
    const wrap = document.createElement('div'); wrap.className = 'qlist';
    const tree = (id, depth) => {
      const q = STORY.QUESTS[id]; const stt = S.q[id]; if (!stt) return null;
      const el = document.createElement('div'); el.className = 'q' + (stt === 'done' ? ' done' : '') + (depth ? ' sub' : '');
      el.innerHTML = `<h4>${q.title}${depth === 0 ? (q.side ? '<span class="tag side">Side story · optional</span>' : '<span class="tag main">Main story</span>') : ''}</h4><div class="d">${fmt(q.desc)}${q.giver ? ' — <i>' + q.giver + '</i>' : ''}</div>`;
      if (stt !== 'done' && nextHints(id)) { const hb = document.createElement('button'); hb.className = 'qhint'; hb.textContent = 'Hint'; hb.title = 'Stuck? Get a small nudge'; hb.onclick = e => { e.stopPropagation(); showHint(id); }; el.querySelector('h4').appendChild(hb); }
      if (q.steps && stt !== 'done') { const ul = document.createElement('ul'); q.steps.forEach(s => { if (s.hide && s.hide(S)) return; const ok = s.done(S); const li = document.createElement('li'); li.className = ok ? 'ok' : ''; li.textContent = (ok ? '✓ ' : '◇ ') + s.t; ul.appendChild(li); }); el.appendChild(ul); }
      for (const cid of Object.keys(STORY.QUESTS)) if (STORY.QUESTS[cid].parent === id) { const c = tree(cid, depth + 1); if (c) el.appendChild(c); }
      return el;
    };
    const roots = Object.keys(STORY.QUESTS).filter(id => !STORY.QUESTS[id].parent);
    const sideLast = (a, b) => (STORY.QUESTS[a].side ? 1 : 0) - (STORY.QUESTS[b].side ? 1 : 0);
    const active = roots.filter(r => S.q[r] === 'active').sort(sideLast), done = roots.filter(r => S.q[r] === 'done').sort(sideLast);
    [...active, ...done].forEach(r => { const e = tree(r, 0); if (e) wrap.appendChild(e); });
    if (!wrap.children.length) wrap.innerHTML = '<p>No quests yet. Look around — someone will need your help soon.</p>';
    body.appendChild(wrap);
    if (wrap.querySelector('.qhint') && !tipSeen('hint')) setTimeout(() => { if (curTab === 'quest') tip('hint'); }, 350);
  }
  // ---------- hints: optional, one small nudge at a time for just the next step of a quest
  function nextHints(id) {
    const q = STORY.QUESTS[id]; if (!q || !q.steps) return null;
    for (let i = 0; i < q.steps.length; i++) {
      const st = q.steps[i]; if (st.hide && st.hide(S)) continue; if (st.done(S)) continue;
      let h = typeof st.hint === 'function' ? st.hint(S) : st.hint; if (!h) return null;
      h = Array.isArray(h) ? h : [h];
      return { st, hints: h, key: id + ':' + i + ':' + h[0].slice(0, 20) };
    }
    return null;
  }
  async function showHint(id) {
    const q = STORY.QUESTS[id], n = nextHints(id); if (!n) return;
    S.hints = S.hints || {};
    let lvl = S.hints[n.key] || 0;
    if (!lvl) {
      const ok = await modal({ title: 'Need a hint?', html: `<p>Working it out yourself is half the fun!</p><p>A hint gives you a small nudge for the next step of <b>${q.title}</b>, and nothing more.</p>`,
        buttons: [{ label: 'Keep trying', value: false }, { label: 'Show a hint', value: true, primary: true }], escValue: false });
      if (!ok) return;
      lvl = 1;
    }
    for (;;) {
      S.hints[n.key] = lvl; S.hintsUsed = Object.keys(S.hints).length;
      const more = lvl < n.hints.length;
      const html = `<p class="hstep">Next: ${fmt(n.st.t)}</p>` + n.hints.slice(0, lvl).map((h, i) => `<p class="hint${i === lvl - 1 ? ' new' : ''}">${fmt(h)}</p>`).join('');
      const v = await modal({ title: lvl > 1 ? 'A clearer hint' : 'Hint', html, buttons: [...(more ? [{ label: 'A clearer hint', value: 'more' }] : []), { label: 'Thanks!', value: true, primary: true }], escValue: true });
      if (v !== 'more') break;
      lvl++;
    }
    if (curTab === 'quest') renderPanel();
  }
  // ---------- the realm map (Kingdom of Krax & Vosmos)
  const MAP_SPOT = { cottage: [520, 78], hillside: [516, 92], town: [508, 108], guild: [508, 108], cauldron: [508, 108], road: [514, 150], brushwood: [520, 196] };
  function renderMap(body) {
    const W = 640, H = 400, c = GFX.cnv(W, H), g = c.getContext('2d');
    c.style.cssText = 'width:100%;height:auto;max-height:100%;object-fit:contain;border:3px solid #7a5530;border-radius:6px;background:#e8d4a4';
    const rnd = GFX.RNG(5);
    g.fillStyle = '#e8d4a4'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { g.fillStyle = rnd() < 0.5 ? '#dcc496' : '#f0dfb4'; g.fillRect(rnd() * W, rnd() * H, 2, 2); }
    // grassland
    g.fillStyle = '#b8c27a'; g.beginPath(); g.ellipse(400, 250, 300, 170, 0, 0, 7); g.fill();
    // river
    g.strokeStyle = '#5a8ad0'; g.lineWidth = 5; g.beginPath(); g.moveTo(60, 300); g.bezierCurveTo(180, 330, 300, 360, 380, 340); g.bezierCurveTo(460, 320, 540, 300, 640, 290); g.stroke();
    // dark forest
    for (let i = 0; i < 260; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()); const x = 290 + Math.cos(a) * r * 200, y = 185 + Math.sin(a) * r * 95; g.fillStyle = rnd() < 0.5 ? '#2e5a36' : '#1e3e26'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x - 5, y + 4); g.lineTo(x + 5, y + 4); g.fill(); }
    // the big southern forest between Wockville and Lesterfield
    for (let i = 0; i < 150; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()); const x = 422 + Math.cos(a) * r * 62, y = 300 + Math.sin(a) * r * 30; g.fillStyle = rnd() < 0.5 ? '#2e5a36' : '#1e3e26'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x - 5, y + 4); g.lineTo(x + 5, y + 4); g.fill(); }
    // mountains of Vosmos (north & far west)
    const mtn = (x, y, s) => { g.fillStyle = '#8a8478'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x - s * 0.9, y + s * 0.4); g.lineTo(x + s * 0.9, y + s * 0.4); g.fill(); g.fillStyle = '#f4f4f8'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x - s * 0.3, y - s * 0.55); g.lineTo(x + s * 0.3, y - s * 0.55); g.fill(); };
    for (let x = 20; x < 470; x += 26) mtn(x + rnd() * 10, 46 + rnd() * 14, 20 + rnd() * 8);
    for (let y = 80; y < 330; y += 26) mtn(28 + rnd() * 22, y + rnd() * 10, 20 + rnd() * 8);
    // the volcano — north, in the middle of the mountains of Vosmos
    const vx = 250, vy = 62;
    g.fillStyle = '#5a3a32'; g.beginPath(); g.moveTo(vx - 46, vy + 30); g.lineTo(vx - 9, vy - 22); g.lineTo(vx + 9, vy - 22); g.lineTo(vx + 46, vy + 30); g.fill();
    g.fillStyle = '#ff5a1a'; g.fillRect(vx - 9, vy - 24, 18, 4); g.fillStyle = '#ffb040'; g.fillRect(vx - 5, vy - 25, 10, 2);
    g.strokeStyle = '#e0501a'; g.lineWidth = 2; g.beginPath(); g.moveTo(vx - 4, vy - 20); g.lineTo(vx - 12, vy + 8); g.stroke(); g.beginPath(); g.moveTo(vx + 5, vy - 20); g.lineTo(vx + 14, vy + 2); g.stroke();
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(110,100,100,${0.5 - i * 0.07})`; g.beginPath(); g.arc(vx + 6 + i * 7, vy - 32 - i * 9, 6 + i * 2, 0, 7); g.fill(); }
    // places
    const town = (x, y, big) => { g.fillStyle = '#7a4a2a'; for (let i = 0; i < (big ? 5 : 3); i++) { const hx = x - 12 + i * 6, hy = y - (i % 2) * 4; g.fillRect(hx, hy, 6, 6); g.fillStyle = '#3a4f86'; g.beginPath(); g.moveTo(hx - 1, hy); g.lineTo(hx + 3, hy - 5); g.lineTo(hx + 7, hy); g.fill(); g.fillStyle = '#7a4a2a'; } };
    town(508, 102, true); town(520, 200); town(500, 262); town(370, 322, true);
    g.fillStyle = '#6e6862'; g.fillRect(340, 160, 22, 14); g.fillRect(338, 154, 6, 8); g.fillRect(356, 154, 6, 8);
    const gx = 176, gy = 132; g.fillStyle = '#c8ccd4'; g.fillRect(gx - 10, gy - 16, 20, 24); g.fillStyle = S.flags.sawGateway ? '#ff2a5a' : '#6a3a5a'; g.fillRect(gx - 6, gy - 12, 12, 20);
    // roads
    g.strokeStyle = '#8a6030'; g.setLineDash([5, 4]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(508, 110); g.lineTo(520, 195); g.lineTo(500, 255); g.lineTo(380, 315); g.stroke();
    g.beginPath(); g.moveTo(490, 110); g.lineTo(446, 124); g.lineTo(330, 150); g.lineTo(190, 140); g.stroke(); g.setLineDash([]);
    // labels
    g.font = '18px "Jersey 10", monospace'; g.textAlign = 'center';
    const lab = (t, x, y, col = '#3a2414') => { g.fillStyle = 'rgba(240,226,190,0.8)'; const w = g.measureText(t).width; g.fillRect(x - w / 2 - 3, y - 14, w + 6, 18); g.fillStyle = col; g.fillText(t, x, y); };
    lab('VOSMOS', 120, 22, '#4a3a5a'); lab('The Volcano', vx, vy + 46, '#8a2a10');
    lab('Kraxenville', 508, 130); lab('Brushwood', 520, 222); lab('Wockville', 500, 284); lab('Lesterfield', 370, 352);
    lab('The Dark Forest', 290, 210, '#1e3e26'); lab('The Ruined Keep', 351, 192); lab(S.flags.sawGateway ? 'The Gateway' : '?', gx, gy + 28, '#8a1a3a');
    lab('The Kingdom of Krax', 540, 30, '#5a3a1a');
    // compass rose
    g.fillStyle = '#7a5530'; g.beginPath(); g.moveTo(600, 330); g.lineTo(606, 360); g.lineTo(600, 354); g.lineTo(594, 360); g.fill(); g.fillText('N', 600, 326);
    // you are here
    const sp = MAP_SPOT[S.map];
    if (sp) { const [x, y] = sp; g.fillStyle = '#d02020'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); lab('You are here', x, y - 10, '#d02020'); }
    const wrap = document.createElement('div'); wrap.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;min-height:0';
    wrap.appendChild(c); body.appendChild(wrap);
  }
  function renderJournal(body) { const d = document.createElement('div'); d.className = 'journal qlist'; d.innerHTML = STORY.journal(S); body.appendChild(d); }
  function renderOpts(body) {
    const d = document.createElement('div'); d.className = 'qlist';
    d.innerHTML = `<h4>Controls</h4>
      <p>Move: <b>Arrow keys / WASD</b> — or click / tap where you want to go.<br>
      Talk / look / use: <b>E</b>, <b>Enter</b> — or click on a person or thing.<br>
      Jump: <b>Space</b> &nbsp; Raise lantern: <b>Q</b> &nbsp; Satchel: <b>I</b> &nbsp; Quests: <b>J</b> &nbsp; Map: <b>P</b> &nbsp; Menu: <b>Esc</b> &nbsp; Sound on/off: <b>M</b></p>
      <h4>Sound</h4>
      <p>Music <input type="range" id="oMus" min="0" max="0.7" step="0.05" value="${AUDIO.musicVol}"> &nbsp; Effects <input type="range" id="oSfx" min="0" max="1" step="0.05" value="${AUDIO.sfxVol}"><br>
      <label style="cursor:pointer"><input type="checkbox" id="oMute" ${AUDIO.muted ? 'checked' : ''} style="transform:scale(1.4);margin-right:8px">Turn all sound off</label></p>
      <div style="display:${isTouch() ? 'block' : 'none'}"><h4>Touch controls</h4>
      <p><label style="cursor:pointer"><input type="checkbox" id="oDpad" ${document.body.classList.contains('nodpad') ? '' : 'checked'} style="transform:scale(1.4);margin-right:8px">Show the arrow pad on screen</label><br>
      <span style="opacity:.75">Turn it off to just tap where you want Luminara to walk. The Jump, Talk and Raise Light buttons stay.</span></p></div>
      <h4>Tips</h4><p>New-player tips appear once each. You can see them all again from the start.</p>`;
    const acts = document.createElement('div'); acts.className = 'detail'; acts.style.border = 'none'; acts.style.padding = 0;
    const row = document.createElement('div'); row.className = 'acts';
    const mkb = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; row.appendChild(b); };
    mkb('Show tips again', () => { resetTips(); closePanel(); toast('Tips will appear again as you play.', null, null, 3500); run(() => tip('goal')); });
    acts.appendChild(row); d.appendChild(acts); body.appendChild(d);
    d.querySelector('#oMus').oninput = e => AUDIO.setVolumes(+e.target.value, null);
    d.querySelector('#oSfx').oninput = e => AUDIO.setVolumes(null, +e.target.value);
    d.querySelector('#oDpad').onchange = e => setDpad(e.target.checked);
    d.querySelector('#oMute').onchange = e => AUDIO.setMuted(e.target.checked);
  }

  // =================================================================== CHAPTER SUMMARY
  function chapterSummary(html, title) {
    title = title || ('Chapter ' + ['One', 'Two', 'Three', 'Four', 'Five'][(S.chapter || 1) - 1] + ' — Your Story');
    if (DBG.auto) { const pr = modal({ title, wide: true, html, buttons: [{ label: 'Continue ▶', value: true, primary: true }] }); setTimeout(() => { const b = document.querySelector('.modal.wide .primary'); if (b) b.click(); }, 30); return pr; }
    return modal({ title, wide: true, html, escValue: true, buttons: [{ label: 'Continue ▶', value: true, primary: true }] });
  }

  // =================================================================== CARGO PUZZLE (Chapter One: "I can make it fit!")
  // A 4 x 3 wagon bed. Every piece must fit: one big crate, two long casks and four small barrels.
  // Lighting the lantern with flint and steel (Chapter Two). As in Lisa's book, the first strike never catches:
  // "CLICK, CLACK! There was no fire, so she tried again." Then strike in the bright zone, and blow gently on the ember.
  function flintGame() {
    if (DBG.auto) return Promise.resolve();
    return new Promise(res => {
      const bg = document.createElement('div'); bg.className = 'modal-bg';
      const box = document.createElement('div'); box.className = 'modal flint'; bg.appendChild(box);
      box.innerHTML = `<h3>Light the lantern</h3><p class="dim fl-help">Strike the flint against the steel when the spark is in the bright zone.</p>
        <div class="fl-bar"><div class="fl-zone"></div><div class="fl-mark"></div></div>
        <div class="fl-ember"><div class="fl-glow"></div></div><p class="fl-msg"></p>
        <div class="modal-btns"><button class="primary fl-btn">Strike!</button></div>`;
      ui.appendChild(bg);
      const mark = box.querySelector('.fl-mark'), zone = box.querySelector('.fl-zone'), msg = box.querySelector('.fl-msg'), btn = box.querySelector('.fl-btn'), glow = box.querySelector('.fl-glow'), help = box.querySelector('.fl-help');
      let stage = 'strike', strikes = 0, pos = 0, dir = 1, blows = 0, raf = 0, last = performance.now(), cool = 0;
      const z0 = 0.58, z1 = 0.76; zone.style.left = z0 * 100 + '%'; zone.style.width = (z1 - z0) * 100 + '%';
      const tick = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (stage === 'strike') { pos += dir * dt * 0.9; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } mark.style.left = pos * 100 + '%'; } cool = Math.max(0, cool - dt); raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
      const finish = () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey, true); bg.remove(); res(); };
      const act = () => {
        if (cool > 0) return;
        if (stage === 'strike') {
          strikes++; cool = 0.35;
          if (strikes === 1 || pos < z0 || pos > z1) { AUDIO.sfx('crack'); msg.innerHTML = strikes === 1 ? '<b>CLICK, CLACK!</b> There was no fire, so she tried again.' : '<b>Click.</b> Not quite. Try again when the spark is in the bright zone.'; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); return; }
          AUDIO.sfx('crack'); AUDIO.sfx('pop');
          stage = 'blow'; msg.innerHTML = '<b>SCRAPE, CLICK!</b> A tiny ember appeared in the tinder.'; help.textContent = 'Blow on it gently until the flames grow.';
          btn.textContent = 'Blow gently'; box.classList.add('lit'); glow.style.transform = 'scale(.35)';
        } else if (stage === 'blow') {
          blows++; cool = 0.25; AUDIO.sfx('swish');
          glow.style.transform = `scale(${0.35 + blows * 0.22})`;
          if (blows >= 3) { stage = 'light'; msg.innerHTML = 'The flames grew.'; help.textContent = 'Now light the lantern from the burning tinder.'; btn.textContent = 'Light the lantern ▶'; }
        } else { AUDIO.sfx('magic'); finish(); }
      };
      const onKey = e => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); act(); } else if (e.code !== 'Escape') e.stopPropagation(); };
      document.addEventListener('keydown', onKey, true);
      btn.onclick = act;
    });
  }
  function cargoPuzzle() {
    if (DBG.auto) return Promise.resolve();
    return new Promise(res => {
      const W = 4, H = 3;
      const start = () => [
        { id: 'big', kind: 'bigcrate', w: 2, h: 2, x: 1, y: 1 },
        { id: 'c1', kind: 'cask', w: 2, h: 1, x: 1, y: 0 },
        { id: 'c2', kind: 'cask', w: 2, h: 1, x: null, y: null },
        { id: 'b1', kind: 'barrel', w: 1, h: 1, x: 0, y: 0 }, { id: 'b2', kind: 'barrel', w: 1, h: 1, x: 3, y: 0 },
        { id: 'b3', kind: 'barrel', w: 1, h: 1, x: 0, y: 2 }, { id: 'b4', kind: 'barrel', w: 1, h: 1, x: 3, y: 2 },
      ];
      let pieces = start(), sel = null, moves = 0;
      const bg = document.createElement('div'); bg.className = 'modal-bg';
      const box = document.createElement('div'); box.className = 'modal cargo'; bg.appendChild(box);
      box.innerHTML = `<h3>Make it fit!</h3><p class="dim">Tap a piece to pick it up, then tap where it should go on the wagon. Long casks can be turned with <b>↻ Turn</b>. Everything must fit — even the great cask on the ground!</p>
        <div class="cg-area"><div class="cg-grid"></div></div><div class="cg-tray"><span class="cg-label">On the ground:</span></div><p class="cg-msg"></p>
        <div class="modal-btns"><button class="cg-hint">Hint</button><button class="cg-reset">Start again</button><button class="cg-rot">↻ Turn</button></div>`;
      ui.appendChild(bg);
      const grid = box.querySelector('.cg-grid'), tray = box.querySelector('.cg-tray'), msg = box.querySelector('.cg-msg');
      const occupied = (except) => { const o = {}; for (const p of pieces) if (p !== except && p.x != null) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) o[(p.x + i) + ',' + (p.y + j)] = p; return o; };
      const fits = (p, x, y) => { if (x < 0 || y < 0 || x + p.w > W || y + p.h > H) return false; const o = occupied(p); for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) if (o[(x + i) + ',' + (y + j)]) return false; return true; };
      const pieceEl = p => { const e = document.createElement('div'); e.className = `cg-piece ${p.kind} ${p.w > p.h ? 'wide' : p.h > p.w ? 'tall' : ''} ${sel === p ? 'sel' : ''}`; e.style.setProperty('--w', p.w); e.style.setProperty('--h', p.h); e.onclick = ev => { ev.stopPropagation(); sel = sel === p ? null : p; AUDIO.sfx('blip', 1.1); draw(); }; return e; };
      function draw() {
        grid.innerHTML = ''; tray.querySelectorAll('.cg-piece').forEach(e => e.remove());
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = document.createElement('div'); c.className = 'cg-cell'; c.style.gridColumn = x + 1; c.style.gridRow = y + 1; c.onclick = () => placeAt(x, y); grid.appendChild(c); }
        for (const p of pieces) { const e = pieceEl(p); if (p.x != null) { e.style.gridColumn = `${p.x + 1} / span ${p.w}`; e.style.gridRow = `${p.y + 1} / span ${p.h}`; grid.appendChild(e); } else tray.appendChild(e); }
        box.querySelector('.cg-rot').disabled = !(sel && sel.kind === 'cask');
      }
      function placeAt(x, y) {
        if (!sel) { const o = occupied(null)[x + ',' + y]; if (o) { sel = o; draw(); } return; }
        for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
          if (fits(sel, x + dx, y + dy)) { sel.x = x + dx; sel.y = y + dy; sel = null; moves++; AUDIO.sfx('land'); draw(); check(); return; }
        }
        AUDIO.sfx('no'); msg.textContent = "That won't fit there — something is in the way.";
      }
      tray.onclick = () => { if (sel && sel.x != null) { sel.x = sel.y = null; sel = null; AUDIO.sfx('blip', 0.9); draw(); } };
      box.querySelector('.cg-rot').onclick = () => {
        if (!sel || sel.kind !== 'cask') return;
        [sel.w, sel.h] = [sel.h, sel.w];
        if (sel.x != null && !fits(sel, sel.x, sel.y)) { sel.x = sel.y = null; msg.textContent = 'No room to turn it there, so it went back on the ground.'; }
        AUDIO.sfx('swish'); draw();
      };
      box.querySelector('.cg-reset').onclick = () => { pieces = start(); sel = null; msg.textContent = ''; draw(); };
      box.querySelector('.cg-hint').onclick = () => { msg.innerHTML = moves < 3 ? 'Try putting the <b>big crate</b> into a corner first.' : 'Big crate in a corner, the two <b>long casks</b> side by side next to it, and the <b>little barrels</b> in a row along the other side.'; };
      function check() {
        if (pieces.every(p => p.x != null)) {
          msg.innerHTML = '<b>Everything fits!</b>'; AUDIO.sfx('combine');
          const b = document.createElement('button'); b.className = 'primary'; b.textContent = 'Rope it all down ▶';
          b.onclick = () => { bg.remove(); res(); };
          box.querySelector('.modal-btns').replaceChildren(b);
        } else msg.textContent = pieces.filter(p => p.x == null).length + ' still on the ground.';
      }
      draw(); check();
    });
  }

  // =================================================================== PAUSE MENU
  let paused = false;
  async function pauseMenu() {
    if (paused || mode !== 'play') return;
    if (panelOpen()) closePanel();
    paused = true; save(); AUDIO.sfx('blip', 0.8);
    const ago = Math.round((Date.now() - (S.savedAt || Date.now())) / 1000);
    const v = await modal({ title: 'Paused', stack: true, escValue: 'resume',
      html: `<p class="dim">Playing as <b>${esc(S.playerName || 'Player ' + slot)}</b> · Level ${S.lvl} · ${esc(M.name)}<br>✓ Your progress saves automatically${ago < 5 ? ' (just saved)' : ''}.</p>`,
      buttons: [{ label: 'Resume', value: 'resume', primary: true }, { label: 'Options', value: 'opts' }, { label: 'How to Play', value: 'how' }, { label: 'Players & Saves', value: 'slots' }, ...(S.flags.ch1Done ? [{ label: 'Chapter Summary', value: 'sum' }] : []), { label: 'Back to Title', value: 'title' }] });
    paused = false;
    if (v === 'opts') openPanel('opts');
    if (v === 'sum') { paused = true; await chapterSummary(STORY.summaryHTML(S, 1)); paused = false; }
    if (v === 'how') { paused = true; await modal({ title: 'How to Play', html: HOW, escValue: true, buttons: [{ label: 'Back to the game', value: true, primary: true }] }); paused = false; }
    if (v === 'slots') { save(); toTitle(); showSlots(); }
    if (v === 'title') { save(); toTitle(); }
  }

  // =================================================================== SAVE / LOAD
  // Three save slots, one per player. Everything is kept on this device (browser storage).
  const SLOTS = 3, SLOT_KEY = n => 'luminara_save_slot_' + n, LAST_KEY = 'luminara_last_slot';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } },
  };
  (function migrateOldSave() { const old = store.get(SAVE_KEY); if (old) { if (!store.get(SLOT_KEY(1))) { store.set(SLOT_KEY(1), old); store.set(LAST_KEY, '1'); } store.del(SAVE_KEY); } })();
  let slot = 1;
  function readSlot(n) { try { return JSON.parse(store.get(SLOT_KEY(n))); } catch (e) { return null; } }
  const compatible = d => d && d.version === SAVE_VERSION;
  function lastSlot() { const n = +store.get(LAST_KEY); if (n && readSlot(n)) return n; for (let i = 1; i <= SLOTS; i++) if (readSlot(i)) return i; return 0; }
  function deleteSlot(n) { store.del(SLOT_KEY(n)); if (+store.get(LAST_KEY) === n) store.del(LAST_KEY); }
  function save() {
    if (!S || mode !== 'play' || !player) return;
    S.x = player.x; S.y = player.y; S.dir = player.dir;
    S.savedAt = Date.now(); S.where = M ? M.name : ''; S.goal = STORY.objective ? STORY.objective() : '';
    store.set(SLOT_KEY(slot), JSON.stringify(S)); store.set(LAST_KEY, String(slot));
  }
  // save whenever it is safe: every few seconds, and the moment the app is hidden or closed
  function saveIfSafe() { if (mode === 'play' && !busy && !transitioning) save(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveIfSafe(); });
  window.addEventListener('pagehide', saveIfSafe);
  window.addEventListener('beforeunload', saveIfSafe);
  let autosaveT = 0;

  // =================================================================== FOLLOWERS (dragon sisters)
  function setParty(list) {
    S.party = list.map(p => Object.assign({}, p));
    followers = list.map(p => Object.assign({ x: player.x, y: player.y, dir: 'down', t: Math.random() * 3, frame: 0, color: '#7a5530', voice: 1 }, p));
    seedTrail();
  }
  // Lay the trail out behind the player (followers walk along it, one pixel per point), and put followers in place.
  function seedTrail() {
    const d = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[player.dir] || [0, -1];
    trail = []; for (let i = 0; i < 160; i++) trail.push({ x: player.x + d[0] * i, y: player.y + d[1] * i });
    let idx = 0; followers.forEach(f => { idx += f.gap || 16; const tp = trail[Math.min(trail.length - 1, idx)]; f.x = tp.x; f.y = tp.y; f.dir = player.dir; });
  }
  function setFollowers(list) { followers = list.map(ch => ({ id: ch, char: ch, x: player.x, y: player.y, dir: 'right', t: Math.random() * 3, name: GFX.CHAR[ch] ? ch[0].toUpperCase() + ch.slice(1) : ch, color: ch === 'sianna' ? '#1f8ea8' : ch === 'yennefer' ? '#b8901a' : '#a02a80', voice: 1.6, kind: 'dragon' })); }

  // =================================================================== SCRIPT HELPERS
  function npc(id) { return npcs.find(n => n.id === id); }
  function walkNPC(id, tx, ty, speed) {
    const n = typeof id === 'string' ? (id === 'luminara' ? null : npc(id)) : id;
    if (!n) { // player
      return new Promise(res => {
        const [sx, sy] = tileAt(player.x, player.y - 2);
        const p = findPath(sx, sy, tx, ty, player) || [[tx, ty]];
        if (!p.length) return res();
        player.path = p.map(([x, y]) => ({ x: x * T + 8, y: y * T + 12 })); player.scripted = res;
      });
    }
    return new Promise(res => {
      if (speed) n.speed = speed;
      const [sx, sy] = tileAt(n.x, n.y - 2);
      let p = n.def.fly || n.ghost ? null : findPath(sx, sy, tx, ty, n);
      if (!p) p = [[tx, ty]];
      if (!p.length) return res();
      n.path = p.map(([x, y]) => ({ x: x * T + (n.fw === 2 ? 16 : 8), y: y * T + 13 })); n.onArrive = res;
    });
  }
  function flyNPC(id, px, py, speed = 60) { const n = npc(id); return new Promise(res => { n.speed = speed; n.path = [{ x: px, y: py }]; n.onArrive = res; n.ghost = true; }); }
  function addNPC(d) { const n = makeNPC(d); n.dynamic = true; npcs.push(n); return n; }
  function removeNPC(id) { npcs = npcs.filter(n => n.id !== id); }
  function camTo(x, y) { if (x == null && camOverride) camReturn = 1.2; camOverride = x == null ? null : { x, y }; return wait(x == null ? 900 : 1100); }

  // =================================================================== FLAP MINI-GAME
  let flapMini = function (target = 4, opts = {}) {
    return new Promise(res => {
      flapGame = { t: 0, ring: 1, hits: 0, target, res, cool: 0, msg: '', opts };
      $('flapgame').style.display = 'block'; flapText();
    });
  };
  function flapText() { const o = flapGame.opts; $('flapgame').innerHTML = `${o.label || 'Press <b>Space</b> (or tap) when the ring turns <b style="color:#ffd860">gold</b>.'}<br>${(o.icon || '✦').repeat(flapGame.hits)}${'◇'.repeat(flapGame.target - flapGame.hits)} ${flapGame.msg}`; }
  function updateFlap(dt) { const f = flapGame; f.t += dt; f.ring -= dt * 0.75; if (f.ring < 0) f.ring = 1; f.cool -= dt; }
  function flapTap() {
    const f = flapGame; if (!f || f.cool > 0) return;
    f.cool = 0.25;
    const good = f.ring < 0.32 && f.ring > 0.08;
    if (good) {
      const msgs = f.opts.msgs || ['Good!', 'Again!', 'Nearly there!', 'Yes!'];
      f.hits++; f.msg = msgs[Math.min(msgs.length - 1, f.hits - 1)]; AUDIO.sfx('flash'); AUDIO.sfx('blip', 1 + f.hits * 0.2);
      const at = flapAt(); fx.push({ kind: 'ring', x: at.x, y: at.y, r: 30, t: 0.5 }); fx.push({ kind: 'flash', x: player.x, y: player.y - 14, t: 0.4 });
      f.ring = 1;
    } else { f.msg = 'Not quite — wait for the gold!'; AUDIO.sfx('no'); }
    flapText();
    if (f.hits >= f.target) { const r = f.res; flapGame = null; $('flapgame').style.display = 'none'; r(); }
  }
  function flapAt() { return flapGame.opts.at || { x: player.x, y: player.y - 20 }; }
  function drawFlap(sx, sy) {
    const at = flapAt();
    const x = at.x - sx, y = at.y - sy;
    const R = 8 + flapGame.ring * 40; const gold = flapGame.ring < 0.32 && flapGame.ring > 0.08;
    ctx.strokeStyle = gold ? '#ffd860' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = gold ? 3 : 2;
    ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,216,96,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 8 + 0.2 * 40, 0, 7); ctx.stroke();
  }

  // =================================================================== TITLE SCREEN
  const titleEl = $('title');
  let titleT = 0, titleDragons = [];
  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  // small pop-up dialog: modal({title, html, input, buttons:[{label, value, danger}]}) -> Promise(value)
  function modal(o) {
    return new Promise(res => {
      const bg = document.createElement('div'); bg.className = 'modal-bg';
      const box = document.createElement('div'); box.className = 'modal' + (o.stack ? ' stack' : '') + (o.wide ? ' wide' : ''); bg.appendChild(box);
      box.innerHTML = `<h3>${o.title}</h3>${o.html || ''}${o.input ? `<input class="modal-in" maxlength="16" value="${esc(o.input)}">` : ''}`;
      const row = document.createElement('div'); row.className = 'modal-btns'; box.appendChild(row);
      const inp = box.querySelector('.modal-in');
      const done = v => { bg.remove(); document.removeEventListener('keydown', onKey, true); res(v); };
      const onKey = e => { if (e.target === inp) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(o.escValue ?? false); } else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const pb = o.buttons.find(b => b.primary); if (pb) done(pb.value); } else e.stopPropagation(); };
      document.addEventListener('keydown', onKey, true);
      o.buttons.forEach(bt => { const b = document.createElement('button'); b.textContent = bt.label; if (bt.danger) b.classList.add('danger'); if (bt.primary) b.classList.add('primary'); b.onclick = () => done(inp && bt.value === true ? (inp.value.trim() || o.input) : bt.value); row.appendChild(b); });
      ui.appendChild(bg);
      if (inp) { inp.focus(); inp.select(); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(inp.value.trim() || o.input); if (e.key === 'Escape') done(false); }); }
    });
  }
  function fmtTime(sec) { sec = Math.floor(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60; return h ? `${h} h ${m} min` : `${Math.max(1, m)} min`; }
  function fmtDate(t) { if (!t) return ''; const d = new Date(t); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  const HOW = `<ul class="how">
    <li><b>Walk:</b> arrow keys / WASD, or click or tap where you want to go.</li>
    <li><b>Talk, look, pick up, open doors:</b> press E (or Enter), or click/tap on the person or thing.</li>
    <li><b>Jump:</b> Space — to reach things up high, and over logs and streams.</li>
    <li><b>Satchel (I):</b> look at items, <i>Use</i> them on things, or <i>Combine</i> two together.</li>
    <li><b>Quests (J):</b> every task, and the little tasks inside each big one. <b>Map (P)</b> shows the Kingdom of Krax.</li>
    <li><b>Raise your lantern (Q)</b> once it's lit, to light up the darkness further.</li>
    <li><b>Stuck?</b> Open Quests and press <b>Hint</b> next to a quest for a small nudge.</li>
    <li>Help people to earn experience — level up to grow braver and brighter.</li>
    <li>The game <b>saves by itself</b> every few seconds and when you close it. Each player has their own save slot.</li></ul>`;
  // The film bars are switched by the gameplay loop, which stops on the title and credits screens, so clear them here.
  function clearCine() { cineOn = false; document.body.classList.remove('cine'); }
  function toTitle() {
    if (mode === 'play') save();
    clearCine();
    mode = 'title'; AUDIO.music('title'); hud(); $('toasts').innerHTML = '';
    $('where').style.display = 'none'; $('objective').style.display = 'none'; $('held').style.display = 'none';
    const ls = lastSlot(), last0 = ls ? readSlot(ls) : null, last = compatible(last0) ? last0 : null;
    titleEl.style.display = 'flex'; titleEl.classList.add('home');
    titleEl.innerHTML = `
      <div class="ttl"><div class="rays"></div>
        <div class="tw">Luminara</div>
        <div class="tsub"><i></i>The Light-Bearer<i></i></div>
      </div>
      <div class="menu">
        <div class="chap">${chapterLine(last)}</div>
        ${!last && last0 ? `<div class="hint" style="font-size:calc(var(--fs)*.8)">The story has been rebuilt from Lisa's book — older saves need a fresh start.</div>` : ''}
        ${last ? `<button id="tCont">Continue<small>${esc(last.playerName || 'Player ' + ls)} · ${esc(last.where || '')} · Level ${last.lvl || 1}</small></button>` : '<button id="tNew">Begin the Story</button>'}
        <button id="tSlots">Players &amp; Saves</button>
        <button id="tHow">How to Play</button>
      </div>
      <div class="hint">A story by Lisa · Made with love by Dad</div>`;
    titleWisps = [];
    if (last) $('tCont').onclick = () => { AUDIO.init(); slot = ls; startGame(readSlot(ls)); };
    else $('tNew').onclick = () => { AUDIO.init(); newGameIn(1); };
    $('tSlots').onclick = () => { AUDIO.init(); showSlots(); };
    $('tHow').onclick = () => { AUDIO.init(); modal({ title: 'How to Play', html: HOW, buttons: [{ label: 'Got it!', value: true, primary: true }] }); };
    titleDragons = [
      { c: 'wyrmRed', x: -60, y: 20, s: 16 }, { c: 'wyrmGreen', x: -220, y: 34, s: 22 }, { c: 'wyrmBronze', x: -360, y: 12, s: 26 },
    ];
  }
  // "Chapter One", or "Chapter Two · The Dark Forest" (the first chapter shares the game's name, so it isn't repeated)
  function chapterLine(save) {
    let n = (save && save.chapter) || 1;
    if (save && save.flags && save.flags['ch' + n + 'Done'] && STORY.nextChapter(n)) n++;
    const c = STORY.CHAPTERS.find(c => c.n === n) || STORY.CHAPTERS[0];
    const [num, name] = c.subtitle.split(' · ');
    const done = save && save.flags && save.flags['ch' + n + 'Done'];
    return (name === 'The Light-Bearer' ? num : c.subtitle) + (done ? ' · complete' : '');
  }
  // tapping the night sky on the title screen releases a little lumina wisp
  titleEl.addEventListener('pointerdown', e => {
    if (mode !== 'title' || e.target !== titleEl) return;
    const r = cv.getBoundingClientRect(); addTitleWisp((e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH, true);
  });
  async function newGameIn(n) {
    const name = await modal({ title: "Who's playing?", html: '<p>Type a name for this save.</p>', input: 'Player ' + n, buttons: [{ label: 'Cancel', value: false }, { label: 'Begin the story', value: true, primary: true }] });
    if (!name) return;
    slot = n; startGame(null, name);
  }
  function showSlots() {
    titleEl.style.display = 'flex'; titleEl.classList.remove('home');
    const cards = [];
    for (let n = 1; n <= SLOTS; n++) {
      const d = readSlot(n);
      if (d && !compatible(d)) cards.push(`<div class="slotcard"><div class="sn">${esc(d.playerName || 'Player ' + n)}</div>
        <div class="si">This save is from an earlier version of the story, before it was rebuilt from Lisa's book.</div>
        <div class="si dim">Start fresh to play the new Chapter One.</div>
        <div class="sb"><button data-fresh="${n}" class="primary">Start fresh</button><button data-del="${n}" class="danger">Delete</button></div></div>`);
      else if (d) cards.push(`<div class="slotcard"><div class="sn">${esc(d.playerName || 'Player ' + n)}</div>
        <div class="si">Level ${d.lvl || 1} · ${esc(d.where || '')}</div>
        <div class="si">${d.flags && d.flags.chapter1 ? '<b>Chapter One complete!</b>' : 'Goal: ' + esc(d.goal || '')}</div>
        <div class="si dim">Played ${fmtTime(d.time)}${d.savedAt ? ' · last played ' + fmtDate(d.savedAt) : ''}</div>
        <div class="sb"><button data-play="${n}" class="primary">Play</button><button data-del="${n}" class="danger">Delete</button></div></div>`);
      else cards.push(`<div class="slotcard empty"><div class="sn">Empty slot ${n}</div><div class="si dim">Start a fresh adventure here. Other saves stay safe.</div>
        <div class="sb"><button data-new="${n}" class="primary">New game</button></div></div>`);
    }
    titleEl.innerHTML = `<div class="slots"><h2>Players &amp; Saves</h2><div class="slotgrid">${cards.join('')}</div><button id="sBack">Back</button></div>`;
    $('sBack').onclick = () => toTitle();
    titleEl.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { AUDIO.init(); slot = +b.dataset.play; startGame(readSlot(slot)); });
    titleEl.querySelectorAll('[data-fresh]').forEach(b => b.onclick = () => { AUDIO.init(); const n = +b.dataset.fresh, d = readSlot(n); slot = n; startGame(null, d.playerName || 'Player ' + n); });
    titleEl.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { AUDIO.init(); newGameIn(+b.dataset.new); });
    titleEl.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const n = +b.dataset.del, d = readSlot(n), name = esc(d.playerName || 'Player ' + n);
      const ok = await modal({ title: 'Delete this save?', html: `<p>This will delete <b>${name}</b>'s game — Level ${d.lvl || 1}, played ${fmtTime(d.time)}.</p><p>The other saves are not touched. <b>This can't be undone.</b></p>`, buttons: [{ label: 'Keep it', value: false }, { label: 'Yes, delete it', value: true, danger: true }] });
      if (ok) { deleteSlot(n); showSlots(); }
    });
  }
  // The title scene, after Lisa's pictures: Dragonhold (grey basalt castle with red dragon banners) on a hill above the
  // pines, snowy mountains behind, the volcano of Vosmos smoking to the right, and Luminara on the left with her lantern.
  const stars = [...Array(60)].map((_, i) => [GFX.hash(i, 1) * VW, GFX.hash(i, 2) * 48, GFX.hash(i, 3)]);
  let titleBg = null, titleWisps = [];
  function buildTitleBg() {
    const c = GFX.cnv(VW, VH), g = c.getContext('2d'), H = GFX.hash;
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    // dusk sky
    const sky = g.createLinearGradient(0, 0, 0, 130);
    sky.addColorStop(0, '#121a3a'); sky.addColorStop(0.35, '#33305e'); sky.addColorStop(0.62, '#8a4a62'); sky.addColorStop(0.82, '#e0844e'); sky.addColorStop(1, '#f6c272');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    // a few soft clouds catching the sunset
    for (const [cx, cy, w] of [[40, 62, 46], [120, 50, 38], [212, 70, 52], [300, 44, 30]]) {
      for (let i = 0; i < w; i += 3) { const h = 2 + Math.round(Math.sin(i / w * Math.PI) * 4); px(cx - w / 2 + i, cy - h, 3, h, 'rgba(240,170,150,0.28)'); px(cx - w / 2 + i, cy, 3, 1, 'rgba(255,214,170,0.35)'); }
    }
    // far snowy mountains
    const peaks = [];
    for (let x = -10; x <= VW + 10; x += 22 + Math.floor(H(x, 31) * 14)) peaks.push([x, 74 + H(x, 32) * 26]);
    g.fillStyle = '#5c5a82'; g.beginPath(); g.moveTo(-10, 130);
    for (let i = 0; i < peaks.length; i++) { const [x, y] = peaks[i]; g.lineTo(x, y); if (peaks[i + 1]) g.lineTo((x + peaks[i + 1][0]) / 2, Math.max(y, peaks[i + 1][1]) + 14); }
    g.lineTo(VW + 10, 130); g.fill();
    for (const [x, y] of peaks) { // snow caps, lit on the left, shadowed on the right
      g.fillStyle = '#e6e2f2'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 7, y + 8); g.lineTo(x - 2, y + 6); g.lineTo(x, y + 9); g.lineTo(x + 3, y + 6); g.lineTo(x + 7, y + 8); g.fill();
      g.fillStyle = '#a9a5c8'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y + 8); g.lineTo(x + 3, y + 6); g.lineTo(x, y + 9); g.fill();
    }
    // the volcano of Vosmos (right)
    g.fillStyle = '#4a3446'; g.beginPath(); g.moveTo(216, 132); g.lineTo(264, 60); g.lineTo(276, 60); g.lineTo(326, 132); g.fill();
    g.fillStyle = '#62445a'; g.beginPath(); g.moveTo(216, 132); g.lineTo(264, 60); g.lineTo(268, 60); g.lineTo(246, 132); g.fill();
    g.fillStyle = '#d8d0e4'; g.beginPath(); g.moveTo(264, 60); g.lineTo(258, 70); g.lineTo(263, 68); g.lineTo(267, 72); g.lineTo(271, 67); g.lineTo(279, 71); g.lineTo(276, 60); g.fill();
    px(264, 58, 12, 2, '#ff6a2a'); px(266, 57, 8, 1, '#ffb040');
    for (let i = 0; i < 3; i++) px(268 + i * 2, 61 + i * 4, 1, 3, 'rgba(255,120,50,0.8)');
    // hazy mid hills
    g.fillStyle = '#3a3e5e'; g.beginPath(); g.moveTo(0, 132);
    for (let x = 0; x <= VW; x += 8) g.lineTo(x, 118 + Math.sin(x * 0.02 + 1) * 6 + H(x, 33) * 3);
    g.lineTo(VW, 140); g.lineTo(0, 140); g.fill();
    // the castle hill and Dragonhold, shifted so the tallest tower sits right under the title (centre of the screen)
    g.save(); g.translate(8, 0);
    g.fillStyle = '#2c4434'; g.beginPath(); g.moveTo(70, 140); g.quadraticCurveTo(110, 112, 150, 111); g.quadraticCurveTo(196, 112, 236, 140); g.fill();
    // ---- Dragonhold
    const STONE = ['#9a98aa', '#7c7a8e', '#5e5c70', '#424052'];
    const tower = (x, top, w, base) => {
      px(x, top, w, base - top, STONE[1]); px(x, top, 1, base - top, STONE[0]); px(x + w - 2, top, 2, base - top, STONE[2]);
      for (let i = 0; i < w; i += 3) px(x + i, top - 2, 2, 2, STONE[1]);
      px(x, top - 2, 1, 2, STONE[0]);
      for (let y = top + 2; y < base; y += 3) for (let i = 1; i < w - 2; i += 2) if (H(x * 7 + i, y) < 0.18) px(x + i, y, 1, 1, STONE[2]);
    };
    const banner = (x, y) => { px(x, y, 3, 1, '#d8a840'); px(x, y + 1, 3, 6, '#b02a2a'); px(x + 1, y + 3, 1, 2, '#1a1010'); px(x, y + 7, 1, 1, '#b02a2a'); px(x + 2, y + 7, 1, 1, '#b02a2a'); };
    const windowLit = (x, y) => px(x, y, 1, 2, '#ffd27a');
    const flag = (x, y) => { px(x, y, 1, 6, '#2a2430'); px(x + 1, y, 4, 2, '#c42a2a'); px(x + 5, y + 1, 1, 1, '#c42a2a'); };
    // curtain wall and its towers
    px(104, 106, 98, 18, STONE[1]); px(104, 106, 98, 1, STONE[0]);
    for (let i = 0; i < 98; i += 3) px(104 + i, 104, 2, 2, STONE[1]);
    for (let y = 108; y < 124; y += 3) for (let i = 0; i < 98; i += 2) if (H(i, y) < 0.15) px(104 + i, y, 1, 1, STONE[2]);
    for (const x of [100, 126, 174, 200]) tower(x, 96, 8, 124);
    // gate with torches
    px(147, 113, 10, 11, '#2a2230'); px(148, 112, 8, 1, '#2a2230'); px(149, 111, 6, 1, '#2a2230');
    px(145, 113, 1, 2, '#ffb040'); px(158, 113, 1, 2, '#ffb040');
    // the keep and its tall towers
    px(134, 80, 36, 26, STONE[1]); px(134, 80, 1, 26, STONE[0]); px(167, 80, 3, 26, STONE[2]);
    for (let i = 0; i < 36; i += 3) px(134 + i, 78, 2, 2, STONE[1]);
    for (let y = 82; y < 106; y += 3) for (let i = 1; i < 34; i += 2) if (H(i + 50, y) < 0.15) px(134 + i, y, 1, 1, STONE[2]);
    tower(118, 82, 8, 106); tower(178, 84, 8, 106);
    tower(136, 66, 8, 80); tower(160, 68, 8, 80); tower(147, 54, 10, 80);
    // red banners with the black dragon, lit windows, flags
    for (const [x, y] of [[102, 99], [128, 99], [176, 99], [202, 99], [120, 86], [180, 88], [151, 60]]) banner(x, y);
    for (const [x, y] of [[140, 86], [146, 92], [158, 86], [164, 92], [152, 70], [139, 71], [163, 73], [111, 110], [190, 110]]) windowLit(x, y);
    flag(151, 47); flag(139, 59); flag(163, 61);
    // a few houses below the castle walls (as in Lisa's picture)
    for (const [x, y] of [[208, 124], [218, 128], [90, 128]]) { px(x, y, 9, 5, '#7a6a5a'); px(x - 1, y - 3, 11, 3, '#5a3a32'); px(x + 3, y + 2, 1, 2, '#ffd27a'); }
    g.restore();
    // pine forest: a far row on the hills, then the near forest
    // a pixel pine: stacked tiers, each wider than the one above, with a lighter edge on the sunset side
    const pine = (x, base, h, col, lit) => {
      x = Math.round(x); base = Math.round(base); h = Math.round(h);
      const top = base - h, tiers = 3, th = h / tiers;
      for (let y = top; y < base - 1; y++) {
        const k = (y - top) % th / th, t = Math.floor((y - top) / th), w = Math.round(1 + t * 1.6 + k * (2.4 + t * 0.8));
        px(x - w, y, w * 2 + 1, 1, col); if (lit) px(x + w, y, 1, 1, lit);
      }
      px(x, base - 2, 1, 3, '#1a1414');
    };
    for (let x = -4; x < VW + 6; x += 7) { const b = 136 + H(x, 41) * 6; if (x > 104 && x < 218) continue; pine(x, b, 12 + H(x, 42) * 8, '#22382e', '#2e4a3a'); }
    px(0, 138, VW, 14, '#1e3428');
    for (let x = 60; x < 250; x += 8) pine(x + H(x, 43) * 3, 146 + H(x, 44) * 4, 14 + H(x, 45) * 8, '#1c3026', '#2c4a38');
    g.fillStyle = '#152219'; g.fillRect(0, 150, VW, 30);
    for (let x = 84; x < VW + 8; x += 10) pine(x + H(x, 46) * 4, 170 + H(x, 47) * 8, 24 + H(x, 48) * 14, '#12201a', '#1e3426');
    // Luminara's hill on the left
    g.fillStyle = '#2a3c28'; g.beginPath(); g.moveTo(-4, 180); g.lineTo(-4, 150); g.quadraticCurveTo(40, 140, 96, 162); g.lineTo(112, 180); g.fill();
    for (let x = 0; x < 104; x += 2) { const y = 148 + Math.pow(Math.abs(x - 38) / 40, 2) * 12; if (H(x, 49) < 0.6) px(x, y - 1 - Math.floor(H(x, 50) * 2), 1, 2, '#3e5634'); }
    for (let i = 0; i < 26; i++) px(H(i, 51) * 100, 154 + H(i, 52) * 24, 1, 1, ['#c8783a', '#d8a840', '#a84a2a'][i % 3]);
    // evening mist over the forest
    const mist = g.createLinearGradient(0, 128, 0, 158); mist.addColorStop(0, 'rgba(200,150,190,0)'); mist.addColorStop(0.6, 'rgba(200,150,190,0.16)'); mist.addColorStop(1, 'rgba(200,150,190,0)');
    g.fillStyle = mist; g.fillRect(0, 128, VW, 30);
    return c;
  }
  function addTitleWisp(x, y, big) { titleWisps.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -(4 + Math.random() * 6), ph: Math.random() * 6, t: 0, life: big ? 7 : 5 + Math.random() * 4 }); }
  function renderTitle(dt) {
    titleT += dt;
    if (!titleBg) titleBg = buildTitleBg();
    ctx.drawImage(titleBg, 0, 0);
    for (const [x, y, b] of stars) { const a = (0.3 + Math.sin(titleT * 2 + b * 10) * 0.3) * (1 - y / 48); ctx.fillStyle = `rgba(255,250,230,${a})`; ctx.fillRect(x, y, 1, 1); }
    // smoke from the volcano
    for (let i = 0; i < 8; i++) { const k = (titleT * 0.12 + i / 8) % 1; ctx.fillStyle = `rgba(110,90,110,${0.45 * (1 - k)})`; ctx.beginPath(); ctx.arc(270 + k * 26, 55 - k * 40, 3 + k * 9, 0, 7); ctx.fill(); }
    // torches by the gate flicker
    ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.sin(titleT * 13) * 40)},60,0.9)`; ctx.fillRect(153, 112, 1, 1); ctx.fillRect(166, 112, 1, 1);
    // dragons flying overhead
    for (const d of titleDragons) {
      d.x += d.s * dt; if (d.x > VW + 80) { d.x = -80 - Math.random() * 160; d.y = 14 + Math.random() * 30; }
      const c = GFX.CHAR[d.c]; const fr = c.right[Math.floor(titleT * 7 + d.y) % 3];
      ctx.drawImage(fr, Math.round(d.x), Math.round(d.y + Math.sin(titleT * 2 + d.y) * 4));
    }
    // falling autumn leaves
    for (let i = 0; i < 12; i++) {
      const sp = 8 + GFX.hash(i, 61) * 8, y = ((titleT * sp + GFX.hash(i, 62) * 200) % 200) - 10, x = (GFX.hash(i, 63) * VW + Math.sin(titleT * 0.8 + i) * 12 - titleT * 4) % VW;
      ctx.fillStyle = ['#e0902a', '#e8c040', '#c05030'][i % 3]; ctx.fillRect(Math.round(x < 0 ? x + VW : x), Math.round(y), (titleT * 3 + i) % 2 < 1 ? 2 : 1, 1);
    }
    // Luminara on her hill, lantern glowing
    const L = GFX.CHAR.luminara, lx = 44, ly = 146;
    if (L && L.frames) {
      const fr = L.frames.right[0];
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(lx, ly, 8, 2, 0, 0, 7); ctx.fill();
      ctx.drawImage(fr, Math.round(lx - L.ax), Math.round(ly - L.ay));
      const gx = lx + 8, gy = ly - 9, r = 26 + Math.sin(titleT * 9) * 1.5 + Math.sin(titleT * 23) * 0.8;
      const grd = ctx.createRadialGradient(gx, gy, 1, gx, gy, r); grd.addColorStop(0, 'rgba(255,230,150,0.75)'); grd.addColorStop(0.25, 'rgba(255,200,100,0.35)'); grd.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = grd; ctx.fillRect(gx - r, gy - r, r * 2, r * 2); ctx.restore();
    }
    // lumina wisps drifting up out of the forest
    if (titleWisps.length < 7 && Math.random() < dt * 0.9) addTitleWisp(70 + Math.random() * 230, 150 + Math.random() * 20);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const w of titleWisps) {
      w.t += dt; w.ph += dt * 2; w.x += (w.vx + Math.sin(w.ph) * 6) * dt; w.y += (w.vy + Math.cos(w.ph * 1.3) * 3) * dt;
      const a = Math.min(1, w.t / 0.8, (w.life - w.t) / 1.2) * (0.75 + Math.sin(titleT * 6 + w.ph) * 0.25);
      if (a <= 0) continue;
      const grd = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 6); grd.addColorStop(0, `rgba(190,255,170,${0.7 * a})`); grd.addColorStop(1, 'rgba(120,255,140,0)');
      ctx.fillStyle = grd; ctx.fillRect(w.x - 6, w.y - 6, 12, 12);
      ctx.fillStyle = `rgba(235,255,225,${a})`; ctx.fillRect(Math.round(w.x), Math.round(w.y), 1, 1);
    }
    ctx.restore();
    titleWisps = titleWisps.filter(w => w.t < w.life);
  }

  // =================================================================== CREDITS
  let creditsT = 0, creditsText = [];
  function showCredits(lines) {
    mode = 'credits'; creditsT = 0; creditsText = lines; hud(); clearCine();
    $('where').style.display = 'none'; $('objective').style.display = 'none';
    AUDIO.music('wonder');
    titleEl.style.display = 'flex'; titleEl.classList.remove('home'); titleEl.innerHTML = '<div class="menu" style="margin-top:auto"><button id="cBack">Return to title</button></div>';
    $('cBack').onclick = () => toTitle();
  }
  function renderCredits(dt) {
    creditsT += dt; if (!titleBg) titleBg = buildTitleBg();
    ctx.drawImage(titleBg, 0, 0); ctx.fillStyle = 'rgba(10,6,20,0.55)'; ctx.fillRect(0, 0, VW, VH);
    for (const [x, y, b] of stars) { ctx.fillStyle = `rgba(255,250,230,${0.4 + Math.sin(creditsT * 2 + b * 10) * 0.4})`; ctx.fillRect(x, y, 1, 1); }
    const a = GFX.CHAR.wyrmRed; ctx.drawImage(a.right[Math.floor(creditsT * 6) % 3], Math.round(((creditsT * 20) % (VW + 120)) - 60), 26 + Math.sin(creditsT) * 6);
    ctx.textAlign = 'center'; ctx.font = '8px monospace';
    creditsText.forEach((l, i) => { const y = VH + 10 + i * 12 - creditsT * 14; if (y < -10 || y > VH + 10) return; ctx.fillStyle = l.startsWith('#') ? '#ffe08a' : '#f4e6c4'; ctx.fillText(l.replace(/^#/, ''), VW / 2, y); });
  }

  // =================================================================== START
  function startGame(saved, playerName) {
    titleEl.style.display = 'none';
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); } catch (e) { }
    autosaveT = 0;
    mode = 'play';
    MAPS.reset();
    held = null; setHeld(null); followers = [];
    if (saved) {
      S = Object.assign(newState(), saved);
      S.met = S.met || {};
      if (STORY.advance) STORY.advance(S);
      loadMap(S.map, { x: S.x, y: S.y, dir: S.dir });
      if (S.party && S.party.length) setParty(S.party);
      hud();
      run(async () => { if (STORY.onLoad) await STORY.onLoad(); if (STORY.onEnter) await STORY.onEnter(S.map); });
    } else {
      S = newState(); S.playerName = playerName || 'Player ' + slot;
      loadMap('cottage', 'start');
      save();
      hud();
      run(() => STORY.intro());
    }
  }

  // =================================================================== DEBUG / TEST HOOKS
  const DBG = {
    auto: false, choices: [],
    target(id) { return interactables().find(t => (t.type === 'npc' ? t.n.id : t.o.id) === id); },
    idle() { return new Promise(r => { let n = 0; const ch = () => { if (!busy && !transitioning && !dialog) { if (++n > 2) return r(); } else n = 0; setTimeout(ch, 30); }; setTimeout(ch, 30); }); },
    async act(id, item) { const it = DBG.target(id); if (!it) throw new Error('no target ' + id + ' on ' + M.id); if (item) setHeld(item); doInteract(it); await DBG.idle(); },
    canReach(id) {
      const it = DBG.target(id); if (!it) return 'missing';
      const [px, py] = tileAt(player.x, player.y - 2);
      const fx0 = Math.floor(it.x / T), fy0 = Math.floor(it.y / T), fx1 = Math.floor((it.x + it.w - 1) / T), fy1 = Math.floor((it.y + it.h - 1) / T);
      const c = [];
      for (let x = fx0; x <= fx1; x++) { c.push([x, fy1 + 1]); c.push([x, fy0 - 1]); }
      for (let y = fy0; y <= fy1; y++) { c.push([fx0 - 1, y]); c.push([fx1 + 1, y]); }
      if (it.type === 'obj' && !it.o.solid) c.push([fx0, fy0]);
      for (const [x, y] of c) { if (x === px && y === py) return true; if (!walkable(x, y, player)) continue; if (findPath(px, py, x, y, player, 20000)) return true; }
      return false;
    },
    async exit(to) {
      const e = M.exits.find(e => e.to === to); if (!e) throw new Error('no exit to ' + to + ' from ' + M.id);
      player.x = e.x * T + 8; player.y = e.y * T + 12; checkExits(); await wait(60); await DBG.idle();
    },
    place(tx, ty, dir) { player.x = tx * T + 8; player.y = ty * T + 12; if (dir) player.dir = dir; lastSafe = { x: player.x, y: player.y }; },
    jump() { tryJump(); }, keys, get busy() { return busy; }, get dialog() { return !!dialog; }, combine: (a, b) => run(() => STORY.combine(a, b)),
    cam: () => ({ x: cam.x, y: cam.y }), get player() { return player; }, get npcs() { return npcs; }, get mode() { return mode; }, walkable, findPath, tileAt,
  };
  // auto-advance dialogue during automated tests
  const _upd = updateDialog;
  updateDialog = function (dt) {
    if (DBG.auto && dialog) { finishReveal(); if (dialog.options) pickChoice(DBG.choices.length ? DBG.choices.shift() : 0); else dialogKey('act'); return; }
    _upd(dt);
  };
  const _flap = flapMini;
  flapMini = function (n) { if (DBG.auto) return Promise.resolve(); return _flap(n); };

  // public API (used by story.js)
  const API = {
    get S() { return S; }, get M() { return M; }, get player() { return player; }, get held() { return held; }, T,
    say, think, narrate, choice, wait, fade, go, toast, give, take, has, addXP, addCoins, questStart, questDone, setHeld, emote,
    npc, walk: walkNPC, fly: flyNPC, addNPC, removeNPC, refresh, camTo, faceTo, setParty, showCredits, cargoPuzzle: () => cargoPuzzle(), flintGame: () => flintGame(),
    notice, sfx: (n, a) => AUDIO.sfx(n, a), music: n => AUDIO.music(n), hud, shake: (t = 0.4) => { shakeT = t; },
    fx: f => fx.push(f), particles: p => particles.push(p), get followers() { return followers; }, loadMap, save,
    dbg: DBG, flapMini: (n, o) => flapMini(n, o), openPanel, tip, tipLater, chapterSummary,
    face(who, dir) { const e = entityById(who); if (e) e.dir = dir; }, entity: entityById, get time() { return time; },
  };

  requestAnimationFrame(loop);
  window.addEventListener('load', () => { toTitle(); });
  if (document.readyState === 'complete') setTimeout(toTitle, 0);
  return API;
})();
