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
      light: 3, maxLight: 3, coins: 10, leaves: [], journal: [], time: 0, friendName: 'Elowen', version: 1 };
  }
  const LEVELS = [0, 30, 80, 150, 240, 350, 480, 640];

  // =================================================================== SIZING
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
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
      kind: d.horse ? 'horse' : d.dragon ? 'dragon' : d.char === 'owl' ? 'owl' : d.char === 'possum' ? 'critter' : 'human', z: 0 };
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
    trail = []; for (let i = 0; i < 80; i++) trail.push({ x: sx, y: sy });
    followers.forEach((f, i) => { f.x = sx; f.y = sy; });
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
    if (dialog) { dialogKey(k); return; }
    if (flapGame && (k === 'jump' || k === 'act')) { flapTap(); return; }
    if (mode !== 'play') return;
    if (k === 'mute') { AUDIO.setMuted(!AUDIO.muted); toast(AUDIO.muted ? 'Sound off' : 'Sound on'); return; }
    if (panelOpen()) { if (k === 'esc' || k === 'inv' && curTab === 'inv' || k === 'quest' && curTab === 'quest') closePanel(); else if (k === 'inv') openPanel('inv'); else if (k === 'quest') openPanel('quest'); else if (k === 'map') { if (curTab === 'map') closePanel(); else openPanel('map'); } return; }
    if (k === 'esc') { if (held) setHeld(null); else openPanel('opts'); return; }
    if (busy) return;
    if (k === 'inv' && S.flags.hasSatchel) openPanel('inv');
    else if (k === 'inv') toast('You have no satchel yet.');
    if (k === 'quest') openPanel('quest');
    if (k === 'map') openPanel('map');
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
  function doInteract(it) {
    if (busy) return;
    if (it.type === 'npc') { const n = it.n; faceTo(n, player); run(() => STORY.interact({ kind: 'npc', id: n.id, ent: n, act: n.def.act, def: n.def }, held)); }
    else {
      const o = it.o;
      run(() => STORY.interact({ kind: 'obj', id: o.id, o, act: o.act, look: o.look, pickup: o.pickup, enter: o.enter, door: o.door }, held));
    }
  }
  function faceTo(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (a.kind === 'dragon' || a.kind === 'horse') { a.dir = dx < 0 ? 'left' : 'right'; return; }
    a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  async function run(fn) {
    busy++;
    player.path = [];
    try { await fn(); } catch (e) { console.error(e); }
    busy = Math.max(0, busy - 1);
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
    requestAnimationFrame(loop);
  }

  function update(dt) {
    S.time += dt;
    if (dialog) updateDialog(dt);
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
    lightRegen += dt; if (lightRegen > 7) { lightRegen = 0; if (S.light < S.maxLight) { S.light++; hud(); } }
    heartRegen += dt; if (heartRegen > 18) { heartRegen = 0; if (S.hearts < S.maxHearts && player.invuln <= 0) { S.hearts++; hud(); } }
    if (player.invuln > 0) player.invuln -= dt;
    // camera
    const tx = player.x - VW / 2, ty = player.y - 12 - VH / 2;
    cam.x += (tx - cam.x) * Math.min(1, dt * 8); cam.y += (ty - cam.y) * Math.min(1, dt * 8);
    if (camOverride) { cam.x += (camOverride.x - VW / 2 - cam.x) * Math.min(1, dt * 3); cam.y += (camOverride.y - VH / 2 - cam.y) * Math.min(1, dt * 3); }
    clampCam();
    if (shakeT > 0) shakeT -= dt;
    promptTarget = (!busy && !dialog) ? facingTarget() : null;
  }
  let camOverride = null;
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
          p.x = lastSafe.x; p.y = lastSafe.y; toast(water ? 'Splash! Jump from closer to the edge.' : 'Oof! Not quite far enough.');
        }
      }
    } else if (!inLowTile(p.x, p.y) && !boxBlocked(p.x, p.y, false, player)) { lastSafe = { x: p.x, y: p.y }; }
    trail.unshift({ x: p.x, y: p.y }); if (trail.length > 90) trail.pop();
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
  }
  function bounceBack() { player.x = lastSafe.x; player.y = lastSafe.y; player.path = []; const [dx, dy] = DIRV[player.dir]; const nx = player.x - dx * 6, ny = player.y - dy * 6; if (!boxBlocked(nx, ny, false, player)) { player.x = nx; player.y = ny; } }

  async function go(mapId, spawn, opts = {}) {
    if (transitioning) return;
    transitioning = true;
    AUDIO.sfx(opts.silent ? null : 'door');
    await fade(true);
    loadMap(mapId, spawn);
    if (followers.length) followers.forEach(f => { f.x = player.x; f.y = player.y; });
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
    if (!S.flags.hasLantern) return;
    if (S.light < 1) { AUDIO.sfx('no'); toast('Your lantern needs a moment to brighten again.'); return; }
    S.light--; lightRegen = 0; hud();
    AUDIO.sfx('flash'); fx.push({ kind: 'flash', x: player.x, y: player.y - 14, t: 0.6, r: 0 });
    const R = 70 + S.lvl * 4;
    for (const g of goblins) if (!g.gone && Math.hypot(g.x - player.x, g.y - player.y) < R) scareGoblin(g);
    if (STORY.onFlash) run(() => STORY.onFlash());
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
        if (d < 1.5) { n.x = nx.x; n.y = nx.y; n.path.shift(); if (!n.path.length && n.onArrive) { const r = n.onArrive; n.onArrive = null; r(); } }
        else {
          const sp = n.speed * dt; const mx = dx / d * Math.min(sp, d), my = dy / d * Math.min(sp, d);
          if (!n.def.fly && !n.ghost && boxBlocked(n.x + mx, n.y + my, false, n)) { n.blockT = (n.blockT || 0) + dt; if (n.blockT > 1.2) { n.blockT = 0; if (!n.onArrive) n.path = []; else { n.x = nx.x; n.y = nx.y; } } }
          else { n.x += mx; n.y += my; n.blockT = 0; }
          faceTo(n, { x: n.x + dx, y: n.y + dy });
          n.frame = Math.floor(n.t * 7) % 4;
        }
      } else {
        n.frame = 0;
        if (n.def.wander && !busy && !dialog) {
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
    else if (!S.flags.hurtTip) { S.flags.hurtTip = 1; toast('Raise your lantern (Q) to scare goblinites away!'); }
  }

  function updateFollowers(dt) {
    followers.forEach((f, i) => {
      const tp = trail[Math.min(trail.length - 1, 16 + i * 14)];
      const off = (i % 2 ? 1 : -1) * 8;
      f.x += ((tp.x + off) - f.x) * Math.min(1, dt * 6); f.y += (tp.y - 4 - f.y) * Math.min(1, dt * 6);
      f.dir = (player.x < f.x) ? 'left' : 'right'; f.t = (f.t || 0) + dt;
    });
  }

  function updateParticles(dt) {
    const kind = M.particles;
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
    for (const f of followers) list.push({ y: f.y + 10, d: () => drawFollower(f) });
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
    if (S.flags.hasLantern && S.flags.cloak && !S.flags.playerSprite) { // lantern glow pixel
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
    if (n.kind === 'critter') { const fr = c[Math.floor(n.t * (n.path.length ? 8 : 1.5)) % 2]; shadow(n.x, n.y, 6, 0.25); if (n.dir === 'right') { ctx.save(); ctx.translate(Math.round(n.x), 0); ctx.scale(-1, 1); ctx.drawImage(fr, -9, Math.round(n.y - 11)); ctx.restore(); } else ctx.drawImage(fr, Math.round(n.x - 9), Math.round(n.y - 11)); return; }
    if (n.kind === 'owl') { const fr = c[(Math.floor(n.t) % 5 === 0) ? 1 : 0]; ctx.drawImage(fr, Math.round(n.x - 8), Math.round(n.y - 18 + (n.def.perch || 0))); return; }
    shadow(n.x, n.y, 6, 0.28);
    const fr = c.frames[n.dir][n.frame];
    ctx.drawImage(fr, Math.round(n.x - c.ax), Math.round(n.y - c.ay - (n.z || 0)));
  }
  function drawFollower(f) {
    const c = GFX.CHAR[f.char]; const fr = c[f.dir][Math.floor(f.t * 8) % 3];
    shadow(f.x, f.y + 10, 5, 0.18);
    ctx.drawImage(fr, Math.round(f.x - c.w / 2), Math.round(f.y - c.h - 6 + Math.sin(f.t * 4) * 2));
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
    if (S.flags.hasLantern && !S.flags.playerSprite) {
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
    for (const n of npcs) if (n.def.char === 'aurelina' || n.glow) L.push({ x: n.x, y: n.y - 20, r: n.glow || 80, c: '255,255,240' });
    for (const f of fx) if (f.kind === 'flash') L.push({ x: f.x, y: f.y, r: 40 + (1 - f.t / 0.6) * 80, c: '255,250,210' });
    for (const f of followers) L.push({ x: f.x, y: f.y - 10, r: 16, c: f.char === 'sianna' ? '120,230,255' : f.char === 'yennefer' ? '255,230,120' : '255,140,220' });
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
  function say(who, text, opts = {}) {
    return new Promise(res => {
      const info = speakerInfo(who);
      const el = document.createElement('div');
      el.className = 'bubble' + (opts.think ? ' think' : '');
      if (!opts.think) el.innerHTML = `<span class="who" style="--who:${info.color}">${info.name}</span>`;
      const body = document.createElement('div'); el.appendChild(body);
      const more = document.createElement('span'); more.className = 'more'; more.textContent = '▼'; more.style.display = 'none'; el.appendChild(more);
      ui.appendChild(el);
      const full = fmt(text);
      const plain = full.replace(/<[^>]+>/g, '');
      dialog = { el, body, more, full, plain, shown: 0, res, info, choice: null, think: opts.think, ent: info.ent, kind: 'bubble' };
      positionBubble();
      el.addEventListener('pointerdown', e => { e.stopPropagation(); dialogKey('act'); });
    });
  }
  function think(text) { return say('luminara', text, { think: true }); }
  function narrate(text, opts = {}) {
    return new Promise(res => {
      const el = document.createElement('div'); el.className = 'narr' + (opts.big ? ' big' : '');
      const body = document.createElement('div'); el.appendChild(body);
      const more = document.createElement('span'); more.className = 'more'; more.textContent = '▼'; more.style.display = 'none'; el.appendChild(more);
      ui.appendChild(el);
      const full = fmt(text);
      dialog = { el, body, more, full, plain: full.replace(/<[^>]+>/g, ''), shown: 0, res, kind: 'narr', info: { voice: 0.6 } };
      el.addEventListener('pointerdown', e => { e.stopPropagation(); dialogKey('act'); });
    });
  }
  function choice(who, text, options) {
    return new Promise(res => {
      say(who, text).then(() => {});
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
      const h = e === player ? 36 : e.kind === 'critter' ? 12 : e.kind === 'horse' ? 30 : e.kind === 'dragon' ? (e.def && e.def.char === 'aurelina' ? 52 : 26) : e.kind === 'owl' ? 18 : (e.char ? 26 : 38);
      x = e.x - cam.x; y = e.y - h - (e.z || 0) - cam.y + ((e.def && e.def.perch) || 0) - (e.char ? 10 : 0);
    }
    const W = stage.clientWidth, H = stage.clientHeight;
    let px = x * scale, py = y * scale;
    const bw = d.el.offsetWidth, bh = d.el.offsetHeight;
    let below = py - bh - 16 < 4;
    if (below) py = py + (e === player || !e ? 40 : 40) * scale;
    const cx = Math.max(bw / 2 + 6, Math.min(W - bw / 2 - 6, px));
    d.el.classList.toggle('below', below);
    d.el.style.left = cx + 'px'; d.el.style.top = (below ? py : py - 6) + 'px';
    d.el.style.setProperty('--tail', Math.max(14, Math.min(bw - 14, bw / 2 + (px - cx))) + 'px');
    if (py > H) d.el.style.top = (H - 10) + 'px';
  }

  // =================================================================== HUD, TOASTS
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
    $('hud').style.display = mode === 'play' ? 'flex' : 'none';
    $('bar').style.display = mode === 'play' ? 'flex' : 'none';
    $('hud').querySelectorAll('.row')[1].style.display = S.flags.hasLantern ? 'flex' : 'none';
  }
  function toast(text, iconName, cls) {
    const el = document.createElement('div'); el.className = 'toast' + (cls ? ' ' + cls : '');
    if (iconName && GFX.ICONS[iconName]) { const c = GFX.cnv(16, 16); c.getContext('2d').drawImage(GFX.ICONS[iconName], 0, 0); el.appendChild(c); }
    const sp = document.createElement('span'); sp.innerHTML = fmt(text); el.appendChild(sp);
    $('toasts').appendChild(el); setTimeout(() => el.remove(), 3300);
  }

  // =================================================================== ITEMS, XP, QUESTS
  function has(id) { return S.inv.includes(id); }
  function give(id, quiet) {
    if (!S.inv.includes(id)) S.inv.push(id);
    if (!quiet) { AUDIO.sfx('pick'); const it = STORY.ITEMS[id]; toast(`Got <b>${it ? it.name : id}</b>`, it ? it.icon : null); }
    hud();
  }
  function take(id) { S.inv = S.inv.filter(i => i !== id); if (held === id) setHeld(null); hud(); }
  function addXP(n, quiet) {
    S.xp += n;
    if (!quiet) toast(`+${n} experience`);
    while (S.lvl < LEVELS.length && S.xp >= LEVELS[S.lvl]) {
      S.lvl++; S.maxHearts = Math.min(8, S.maxHearts + 1); S.maxLight = Math.min(8, S.maxLight + 1); S.hearts = S.maxHearts; S.light = S.maxLight;
      AUDIO.sfx('level'); toast(`✦ Level ${S.lvl}! Courage and lantern light grow stronger.`, 'lantern', 'lvl');
      fx.push({ kind: 'sparkle', x: player.x, y: player.y - 14, t: 1 });
    }
    hud();
  }
  function addCoins(n) { S.coins += n; if (n > 0) { AUDIO.sfx('coin'); toast(`+${n} copper`, 'coin'); } hud(); }
  function questStart(id) {
    if (S.q[id]) return; S.q[id] = 'active'; AUDIO.sfx('quest');
    const q = STORY.QUESTS[id]; toast(`New quest: <b>${q.title}</b>`, 'writ'); hud();
  }
  function questDone(id, xp) {
    if (S.q[id] === 'done') return; S.q[id] = 'done'; AUDIO.sfx('done');
    const q = STORY.QUESTS[id]; toast(`Quest complete: <b>${q.title}</b>`, 'sealedWrit');
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
  function openPanel(tab) { curTab = tab; $('panel').classList.add('open'); renderPanel(); AUDIO.sfx('blip', 0.8); }
  function closePanel() { $('panel').classList.remove('open'); combineFrom = null; curTab = null; }
  document.querySelectorAll('#panel header button').forEach(b => b.addEventListener('click', () => { const t = b.dataset.tab; if (t === 'close') closePanel(); else openPanel(t); }));
  document.querySelectorAll('#bar button').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); AUDIO.init(); if (busy || dialog) return; const k = b.dataset.k;
    if (k === 'inv') { if (S.flags.hasSatchel) openPanel('inv'); else toast('You have no satchel yet.'); }
    if (k === 'quest') openPanel('quest'); if (k === 'map') openPanel('map'); if (k === 'menu') openPanel('opts');
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
      el.innerHTML = `<h4>${q.title}${depth === 0 ? '<span class="tag">' + (q.tag || 'Main quest') + '</span>' : ''}</h4><div class="d">${fmt(q.desc)}${q.giver ? ' — <i>' + q.giver + '</i>' : ''}</div>`;
      if (q.steps && stt !== 'done') { const ul = document.createElement('ul'); q.steps.forEach(s => { if (s.hide && s.hide(S)) return; const ok = s.done(S); const li = document.createElement('li'); li.className = ok ? 'ok' : ''; li.textContent = (ok ? '✓ ' : '◇ ') + s.t; ul.appendChild(li); }); el.appendChild(ul); }
      for (const cid of Object.keys(STORY.QUESTS)) if (STORY.QUESTS[cid].parent === id) { const c = tree(cid, depth + 1); if (c) el.appendChild(c); }
      return el;
    };
    const roots = Object.keys(STORY.QUESTS).filter(id => !STORY.QUESTS[id].parent);
    const active = roots.filter(r => S.q[r] === 'active'), done = roots.filter(r => S.q[r] === 'done');
    [...active, ...done].forEach(r => { const e = tree(r, 0); if (e) wrap.appendChild(e); });
    if (!wrap.children.length) wrap.innerHTML = '<p>No quests yet. Look around — someone will need your help soon.</p>';
    body.appendChild(wrap);
  }
  // ---------- the realm map (Kingdom of Krax & Vosmos)
  const MAP_SPOT = { cottage: [520, 78], hillside: [516, 92], town: [508, 108], guild: [508, 108], cauldron: [508, 108], forest_edge: [446, 124], deep_forest: [330, 128], hollow: [372, 96], gateway: [176, 142] };
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
      Jump: <b>Space</b> &nbsp; Raise lantern: <b>Q</b> &nbsp; Satchel: <b>I</b> &nbsp; Quests: <b>J</b> &nbsp; Sound on/off: <b>M</b></p>
      <h4>Sound</h4>
      <p>Music <input type="range" id="oMus" min="0" max="0.7" step="0.05" value="${AUDIO.musicVol}"> &nbsp; Effects <input type="range" id="oSfx" min="0" max="1" step="0.05" value="${AUDIO.sfxVol}"></p>
      <h4>Game</h4><p>The game saves automatically.</p>`;
    const acts = document.createElement('div'); acts.className = 'detail'; acts.style.border = 'none'; acts.style.padding = 0;
    const row = document.createElement('div'); row.className = 'acts';
    const mkb = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; row.appendChild(b); };
    mkb('Save now', () => { save(); toast('Game saved'); });
    mkb('Back to title', () => { save(); closePanel(); toTitle(); });
    mkb('Start over', () => { if (confirm('Start a brand new game? Your current progress will be lost.')) { localStorage.removeItem(SAVE_KEY); closePanel(); toTitle(); } });
    acts.appendChild(row); d.appendChild(acts); body.appendChild(d);
    d.querySelector('#oMus').oninput = e => AUDIO.setVolumes(+e.target.value, null);
    d.querySelector('#oSfx').oninput = e => AUDIO.setVolumes(null, +e.target.value);
  }

  // =================================================================== SAVE / LOAD
  function save() {
    if (!S || mode !== 'play' || !player) return;
    S.x = player.x; S.y = player.y; S.dir = player.dir; S.followers = followers.map(f => f.char);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }

  // =================================================================== FOLLOWERS (dragon sisters)
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
  function camTo(x, y) { camOverride = x == null ? null : { x, y }; return wait(700); }

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
  function toTitle() {
    mode = 'title'; AUDIO.music('title'); hud();
    $('where').style.display = 'none'; $('objective').style.display = 'none'; $('held').style.display = 'none';
    const cont = hasSave();
    titleEl.style.display = 'flex';
    titleEl.innerHTML = `
      <div style="position:absolute;top:9%;left:0;right:0;text-align:center;pointer-events:none">
        <div style="font-size:calc(var(--fs)*2.6);color:#ffe08a;text-shadow:0 4px 0 #6a3a10,0 0 18px rgba(255,200,90,.6);letter-spacing:2px;font-weight:600">Luminara</div>
        <div style="font-size:calc(var(--fs)*1.2);color:#f4e6c4;text-shadow:0 2px 0 #000">the Light-Bearer</div>
        <div style="font-size:calc(var(--fs)*.8);color:#c8b8e8;margin-top:6px;text-shadow:0 2px 0 #000">Chapter One · The Dark Forest</div>
      </div>
      <div class="menu">
        ${cont ? '<button id="tCont">Continue</button>' : ''}
        <button id="tNew">${cont ? 'New Game' : 'Begin the Story'}</button>
        <button id="tHow">How to Play</button>
      </div>
      <div class="hint">A story by Lisa · Made with love by Dad</div>`;
    if (cont) $('tCont').onclick = () => { AUDIO.init(); startGame(loadSave()); };
    $('tNew').onclick = () => { AUDIO.init(); if (cont && !confirm('Start a new game? Your saved progress will be replaced.')) return; startGame(null); };
    $('tHow').onclick = () => { AUDIO.init(); alert('HOW TO PLAY\n\n• Move with the arrow keys or WASD — or click/tap where you want to walk.\n• Press E (or Enter, or click) to talk, look at things, pick them up and open doors.\n• Space makes Luminara jump — over logs, streams and more.\n• Open your Satchel (I) to look at items, USE them on things, or COMBINE two items together.\n• Your Quest log (J) shows every task, and the little tasks inside each big one.\n• In the Dark Forest, press Q to raise your lantern and scare away goblinites.\n• Earn experience by helping people — level up to grow braver and brighter.\n\nThe game saves automatically.'); };
    titleDragons = [
      { c: 'wyrmRed', x: -60, y: 30, s: 16 }, { c: 'wyrmGreen', x: -200, y: 60, s: 22 }, { c: 'wyrmBronze', x: -320, y: 82, s: 26 },
    ];
  }
  const stars = [...Array(70)].map((_, i) => [GFX.hash(i, 1) * VW, GFX.hash(i, 2) * 90, GFX.hash(i, 3)]);
  let titleBg = null;
  function buildTitleBg() {
    const c = GFX.cnv(VW, VH), g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, '#1a1236'); sky.addColorStop(0.45, '#5a2a5a'); sky.addColorStop(0.75, '#e0784a'); sky.addColorStop(1, '#f0b060');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    // far mountains
    const mtn = (col, base, amp, seed, step) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, VH); for (let x = 0; x <= VW; x += step) { g.lineTo(x, base - Math.abs(Math.sin(x * 0.03 + seed) * amp) - GFX.hash(x, seed) * amp * 0.4); } g.lineTo(VW, VH); g.fill(); };
    mtn('#6a4a7a', 118, 34, 1, 6);
    // snow caps
    // volcano
    g.fillStyle = '#4a2e4a'; g.beginPath(); g.moveTo(220, 130); g.lineTo(262, 70); g.lineTo(272, 70); g.lineTo(318, 130); g.fill();
    g.fillStyle = '#ff6a2a'; g.fillRect(262, 69, 10, 2); g.fillStyle = '#ffb040'; g.fillRect(264, 68, 6, 1);
    mtn('#3e2a4e', 136, 20, 4, 5);
    // castle silhouette (Dragonhold)
    g.fillStyle = '#20162e';
    const towers = [[70, 92, 10], [86, 80, 12], [104, 70, 14], [124, 84, 10], [140, 76, 12], [158, 90, 10], [96, 96, 8], [116, 96, 8]];
    g.fillRect(60, 100, 110, 50);
    for (const [x, y, w] of towers) { g.fillRect(x, y, w, 150 - y); for (let i = 0; i < w; i += 3) g.fillRect(x + i, y - 3, 2, 3); }
    g.fillRect(109, 54, 4, 18); // spire
    // red banners & windows
    for (const [x, y, w] of towers) { g.fillStyle = '#b02828'; g.fillRect(x + w / 2 - 1, y + 6, 3, 7); g.fillStyle = '#ffcf70'; g.fillRect(x + w / 2 - 1, y + 18, 2, 3); }
    g.fillStyle = '#c02a2a'; g.fillRect(113, 54, 6, 4);
    // forest
    for (let x = -6; x < VW + 10; x += 7) { const h = 18 + GFX.hash(x, 9) * 16; g.fillStyle = '#140e1e'; g.beginPath(); g.moveTo(x, VH); g.lineTo(x + 5, VH - h - 12); g.lineTo(x + 10, VH); g.fill(); }
    g.fillStyle = '#100a16'; g.fillRect(0, VH - 12, VW, 12);
    return c;
  }
  function renderTitle(dt) {
    titleT += dt;
    if (!titleBg) titleBg = buildTitleBg();
    ctx.drawImage(titleBg, 0, 0);
    for (const [x, y, b] of stars) { const a = 0.4 + Math.sin(titleT * 2 + b * 10) * 0.4; ctx.fillStyle = `rgba(255,250,230,${a})`; ctx.fillRect(x, y, 1, 1); }
    // smoke from volcano
    for (let i = 0; i < 8; i++) { const k = (titleT * 0.15 + i / 8) % 1; ctx.fillStyle = `rgba(90,70,90,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(267 + k * 30, 66 - k * 40, 3 + k * 9, 0, 7); ctx.fill(); }
    for (const d of titleDragons) {
      d.x += d.s * dt; if (d.x > VW + 80) { d.x = -80 - Math.random() * 120; d.y = 30 + Math.random() * 50; }
      const c = GFX.CHAR[d.c]; const fr = c.right[Math.floor(titleT * 7 + d.y) % 3];
      ctx.drawImage(fr, Math.round(d.x), Math.round(d.y + Math.sin(titleT * 2 + d.y) * 4));
    }
    // fireflies
    for (let i = 0; i < 20; i++) { const x = (GFX.hash(i, 5) * VW + Math.sin(titleT * 0.5 + i) * 10), y = VH - 10 - GFX.hash(i, 6) * 40 + Math.cos(titleT * 0.7 + i) * 5; ctx.fillStyle = `rgba(220,255,140,${0.5 + Math.sin(titleT * 3 + i) * 0.5})`; ctx.fillRect(x, y, 1, 1); }
  }

  // =================================================================== CREDITS
  let creditsT = 0, creditsText = [];
  function showCredits(lines) {
    mode = 'credits'; creditsT = 0; creditsText = lines; hud();
    $('where').style.display = 'none'; $('objective').style.display = 'none';
    AUDIO.music('wonder');
    titleEl.style.display = 'flex'; titleEl.innerHTML = '<div class="menu" style="margin-top:auto"><button id="cBack">Return to title</button></div>';
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
  function startGame(saved) {
    titleEl.style.display = 'none';
    mode = 'play';
    MAPS.reset();
    held = null; setHeld(null); followers = [];
    if (saved) {
      S = Object.assign(newState(), saved);
      loadMap(S.map, { x: S.x, y: S.y, dir: S.dir });
      if (S.followers && S.followers.length) setFollowers(S.followers);
      hud();
      if (STORY.onLoad) run(() => STORY.onLoad());
    } else {
      S = newState();
      loadMap('cottage', 'start');
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
    get player() { return player; }, get npcs() { return npcs; }, get mode() { return mode; }, walkable, findPath, tileAt,
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
    npc, walk: walkNPC, fly: flyNPC, addNPC, removeNPC, refresh, camTo, faceTo, setFollowers, showCredits,
    sfx: (n, a) => AUDIO.sfx(n, a), music: n => AUDIO.music(n), hud, shake: (t = 0.4) => { shakeT = t; },
    fx: f => fx.push(f), particles: p => particles.push(p), get followers() { return followers; }, loadMap, save,
    dbg: DBG, flapMini: (n, o) => flapMini(n, o), openPanel,
    face(who, dir) { const e = entityById(who); if (e) e.dir = dir; }, entity: entityById, get time() { return time; },
  };

  requestAnimationFrame(loop);
  window.addEventListener('load', () => { toTitle(); });
  if (document.readyState === 'complete') setTimeout(toTitle, 0);
  return API;
})();
