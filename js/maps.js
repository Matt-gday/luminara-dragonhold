// =====================================================================
//  MAPS — every location, built from code.
// =====================================================================
const MAPS = (() => {
  const T = GFX.T, S = GFX.SPR;
  const SOLID_TILES = new Set(['wallTop', 'wallPlaster', 'wallStone', 'wallWood', 'dark', 'water']);
  const LOW_TILES = new Set(['water']); // can be jumped over (but not landed in)

  function B(id, w, h, base = 'grass', seed = 1) {
    const m = { id, w, h, seed, ground: [...Array(h)].map(() => Array(w).fill(base)), objects: [], npcs: [], exits: [], spawns: {}, zones: [], clear: [], occ: [...Array(h)].map(() => Array(w).fill(false)) };
    const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    m.set = (x, y, t) => { if (inb(x, y)) m.ground[y][x] = t; };
    m.get = (x, y) => inb(x, y) ? m.ground[y][x] : null;
    m.fill = (x, y, ww, hh, t) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) m.set(i, j, t); };
    m.path = (pts, t, wd = 2) => {
      for (let k = 0; k + 1 < pts.length; k++) {
        let [x0, y0] = pts[k]; const [x1, y1] = pts[k + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= steps; s++) {
          const x = Math.round(x0 + (x1 - x0) * s / (steps || 1)), y = Math.round(y0 + (y1 - y0) * s / (steps || 1));
          m.fill(x, y, wd, wd, t);
        }
      }
    };
    m.occupy = (x, y, ww, hh) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (inb(i, j)) m.occ[j][i] = true; };
    m.obj = (o) => {
      o.fw = o.fw || 1; o.fh = o.fh || 1; if (o.solid === undefined) o.solid = true;
      if (o.solid && !o.decal) m.occupy(o.x, o.y, o.fw, o.fh);
      if (o.reserve) m.occupy(o.x, o.y, o.fw, o.fh);
      m.objects.push(o); return o;
    };
    m.spr = (img, x, y, o = {}) => m.obj(Object.assign({ img, x, y }, o));
    m.tree = (x, y, col = 'orange', o = {}) => m.obj(Object.assign({ img: GFX.treeSprite(col, x * 7 + y * 13), x, y, dx: -11, dy: 2, kind: 'tree' }, o));
    m.pine = (x, y, o = {}) => m.obj(Object.assign({ img: (m.darkPines ? GFX.pineDark : GFX.pineSprite)(x * 5 + y * 3), x, y, dx: -8, dy: 2, kind: 'tree' }, o));
    m.dead = (x, y) => m.obj({ img: GFX.deadSprite(x + y), x, y, dx: -7, dy: 2, kind: 'tree' });
    m.house = (key, x, y, o) => {
      const fh = (o.roofH ?? 2) + (o.wallH ?? 2);
      const img = GFX.houseSprite(key, o);
      const h = m.obj({ img, x, y, fw: o.w, fh, dx: 0, dy: 0, id: key, name: o.name, look: o.look, kind: 'house' });
      if (o.chimney != null) h.smoke = [x * T + o.chimney * T + 8, (y + fh) * T - img.height + 2];
      if (o.door != null) {
        const d = m.obj({ x: x + o.door, y: y + fh - 1, fw: o.doorW || 1, fh: 1, solid: false, door: true, id: key + '_door', name: o.doorName || o.name, act: o.act, look: o.look, invisible: true, enter: o.enter });
        h.doorObj = d;
      }
      return h;
    };
    m.npc = (o) => { m.npcs.push(o); return o; };
    m.zone = (x, y, ww, hh, id, cond) => m.zones.push({ x, y, w: ww, h: hh, id, if: cond });
    m.exit = (x, y, ww, hh, to, spawn, o = {}) => m.exits.push(Object.assign({ x, y, w: ww, h: hh, to, spawn }, o));
    m.spawn = (name, x, y, dir = 'down') => { m.spawns[name] = [x, y, dir]; };
    m.keep = (x, y, ww, hh) => m.clear.push([x, y, ww, hh]);
    // keep trees off a road (and far enough away that their canopies don't hide the walker)
    m.keepRoad = (tile = 'path') => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m.ground[y][x] === tile) m.keep(x - 2, y - 1, 5, 4); };
    m.isClear = (x, y) => m.clear.some(([cx, cy, cw, ch]) => x >= cx && y >= cy && x < cx + cw && y < cy + ch);
    m.scatter = (fn, n, region, okTiles, seed = 5, spacing = 2) => {
      const rnd = GFX.RNG(seed); const [rx, ry, rw, rh] = region || [0, 0, w, h];
      let tries = 0, placed = 0;
      while (placed < n && tries < n * 30) {
        tries++;
        const x = rx + Math.floor(rnd() * rw), y = ry + Math.floor(rnd() * rh);
        if (!inb(x, y) || !okTiles.has(m.ground[y][x]) || m.isClear(x, y)) continue;
        let bad = false;
        for (let j = -spacing + 1; j < spacing && !bad; j++) for (let i = -spacing + 1; i < spacing; i++) if (inb(x + i, y + j) && m.occ[y + j][x + i]) { bad = true; break; }
        if (bad) continue;
        fn(x, y, rnd); placed++;
      }
    };
    return m;
  }
  const GRASS = new Set(['grass', 'leafy', 'flowers']);
  const FOREST = new Set(['forest']);
  const icon = n => GFX.ICONS[n];
  const leafPickup = (m, id, x, y) => m.obj({ img: icon('goldLeaf'), x, y, solid: false, id: 'leaf_' + id, name: 'Golden Leaf', pickup: 'leaf', leafId: id, sparkle: true, if: s => !s.leaves.includes(id) });
  const TREES = ['orange', 'yellow', 'red', 'orange', 'yellow', 'green'];

  const build = {};

  // =============================================================== COTTAGE
  build.cottage = () => {
    const m = B('cottage', 12, 10, 'wood', 3);
    m.name = "Luminara's Cottage"; m.music = 'dawn'; m.interior = true;
    m.fill(0, 0, 12, 1, 'wallTop'); m.fill(1, 1, 10, 2, 'wallWood'); m.fill(0, 0, 1, 10, 'wallTop'); m.fill(11, 0, 1, 10, 'wallTop'); m.fill(0, 9, 12, 1, 'wallTop'); m.set(6, 9, 'wood');
    m.spr(S.window, 5, 1, { solid: false, dy: -2, wallDecor: true });
    m.spr(S.window, 9, 1, { solid: false, dy: -2, wallDecor: true });
    m.spr(S.rugBlue, 4, 5, { fw: 2, fh: 2, solid: false, decal: true, dy: 4 });
    m.spr(S.bed, 1, 3, { fh: 2, dx: -2, id: 'bed', name: 'Bed', act: 'bed' });
    m.spr(S.chest, 2, 4, { id: 'box', name: 'Safekeeping Box', act: 'box', dy: -2 });
    m.spr(S.wardrobe, 3, 3, { id: 'wardrobe', name: 'Wardrobe', act: 'wardrobe', dy: 0 });
    m.spr(S.shelf, 6, 3, { fw: 2, id: 'shelf', name: 'Shelf', act: 'shelf', dy: 0 });
    m.spr(S.stove, 8, 3, { fw: 2, id: 'stove', name: 'Stove', act: 'stove', light: { r: 46, c: '255,150,70' } });
    m.spr(S.kettle, 9, 3, { solid: false, dy: -22, dx: -2, id: 'kettle_vis', sortOff: 2, invisible: false, noInteract: true });
    m.spr(S.cupboard, 10, 3, { id: 'cupboard', name: 'Cupboard', act: 'cupboard', dx: -4 });
    m.spr(S.tableSmall, 5, 6, { dx: 6, id: 'table', name: 'Table', act: 'table' });
    m.spr(S.chairFront, 4, 6, { solid: true, dx: 6, dy: -2, noInteract: true });
    m.spr(icon('lanternDim'), 5, 6, { solid: false, dx: 9, dy: -14, sortOff: 1, id: 'lantern_pick', name: 'Lantern', act: 'lanternPick', if: s => !s.flags.hasLantern });
    m.spr(icon('satchel'), 8, 7, { solid: false, id: 'satchel_pick', name: 'Satchel', act: 'satchelPick', if: s => !s.flags.hasSatchel, sparkle: true });
    m.spr(S.plant, 10, 8, { dx: 1 });
    m.spr(S.barrel, 1, 8, { dx: 1, id: 'pantry', name: 'Pantry Barrel', act: 'pantry' });
    m.exit(6, 9, 1, 1, 'hillside', 'door', { gate: 'cottageDoor' });
    m.spawn('start', 2, 6, 'down'); m.spawn('door', 6, 8, 'up');
    return m;
  };

  // =============================================================== HILLSIDE
  build.hillside = () => {
    const m = B('hillside', 30, 34, 'grass', 11);
    m.name = 'The Leafy Lane'; m.music = 'dawn'; m.particles = 'leaves';
    // lane
    m.path([[14, 7], [14, 11], [9, 11], [9, 18], [18, 18], [18, 25], [14, 25], [14, 33]], 'path', 2);
    m.fill(11, 7, 8, 2, 'path');
    // garden flowers
    m.fill(10, 3, 2, 4, 'flowers'); m.fill(19, 3, 2, 4, 'flowers');
    for (let y = 0; y < 34; y++) for (let x = 0; x < 30; x++) if (m.get(x, y) === 'grass' && GFX.hash(x, y, 4) < 0.18) m.set(x, y, 'leafy');
    m.house('cottage', 12, 3, { w: 6, roofH: 2, wallH: 2, wall: 'wood', door: 2, windows: [0, 4, 5], chimney: 4, flowers: true, name: "Luminara's Cottage", look: 'Home. A tiny wooden cottage with a crooked chimney.', enter: ['cottage', 'door'] });
    m.spr(S.chair, 17, 7, { id: 'chair', name: 'Chair', act: 'chair', dy: -1 });
    m.spr(S.barrel, 11, 6, { dy: 0 });
    // little fence round the garden
    for (let x = 9; x <= 20; x++) if (x < 13 || x > 16) m.spr(S.fenceH, x, 9, { dy: 0 });
    m.spr(S.fenceV, 9, 2, { dy: 0 }); m.spr(S.fenceV, 9, 3); m.spr(S.fenceV, 9, 4); m.spr(S.fenceV, 9, 5); m.spr(S.fenceV, 9, 6); m.spr(S.fenceV, 9, 7); m.spr(S.fenceV, 9, 8);
    m.spr(S.fenceV, 20, 2); m.spr(S.fenceV, 20, 3); m.spr(S.fenceV, 20, 4); m.spr(S.fenceV, 20, 5); m.spr(S.fenceV, 20, 6); m.spr(S.fenceV, 20, 7); m.spr(S.fenceV, 20, 8);
    // rocks where butterflies rest
    m.spr(S.bigRock, 5, 14, { fw: 2, id: 'rock1', name: 'Mossy Rock', act: 'butterflyRock', butterflies: 2 });
    m.spr(S.bigRock, 21, 21, { fw: 2, id: 'rock2', name: 'Big Rock', act: 'butterflyRock', butterflies: 3 });
    m.spr(S.bigRock, 10, 28, { fw: 2, id: 'rock3', name: 'Sunny Rock', act: 'butterflyRock', butterflies: 2 });
    m.spr(S.bush, 7, 15, { dy: 0 }); m.spr(S.bush, 23, 22); m.spr(S.bush, 12, 29);
    m.spr(S.sign, 16, 31, { id: 'sign_kv', name: 'Signpost', look: 'The signpost reads: "KRAXENVILLE — just down the lane."' });
    leafPickup(m, 'hill1', 25, 6); leafPickup(m, 'hill2', 3, 27);
    m.keep(10, 2, 11, 8); m.keep(24, 5, 3, 3); m.keep(2, 26, 3, 3);
    m.scatter((x, y, r) => m.tree(x, y, TREES[Math.floor(r() * TREES.length)]), 140, [0, 0, 30, 34], GRASS, 21, 2);
    m.exit(13, 33, 4, 1, 'town', 'north', { gate: 'laneSouth' });
    m.spawn('door', 14, 8, 'down'); m.spawn('south', 14, 31, 'up'); m.spawn('chair', 17, 8, 'down');
    return m;
  };

  // =============================================================== KRAXENVILLE
  build.town = () => {
    const m = B('town', 52, 42, 'grass', 23);
    m.name = 'Kraxenville'; m.music = 'town'; m.particles = 'leaves';
    for (let y = 0; y < 42; y++) for (let x = 0; x < 52; x++) if (GFX.hash(x, y, 8) < 0.16) m.set(x, y, 'leafy');
    // roads
    m.path([[19, 0], [19, 16]], 'path', 2); m.fill(19, 15, 6, 2, 'path');
    m.fill(18, 17, 16, 11, 'cobble');                    // market square
    m.fill(23, 14, 4, 3, 'cobble');                      // guild steps
    m.path([[34, 21], [44, 21], [44, 18]], 'cobble', 2);  // to coach house
    m.path([[38, 17], [41, 17]], 'cobble', 2);
    m.path([[17, 21], [3, 21]], 'cobble', 2);            // west road
    m.fill(0, 20, 4, 4, 'path');
    m.path([[9, 21], [9, 18]], 'cobble', 2);             // tavern
    m.path([[18, 26], [10, 26], [10, 31]], 'cobble', 2); // iron cauldron
    m.path([[34, 27], [34, 32], [40, 32]], 'cobble', 2); // merchant's hall
    m.fill(24, 28, 3, 10, 'cobble');                     // alley to cookshop
    m.fill(20, 37, 14, 2, 'cobble');
    m.path([[32, 16], [32, 12], [41, 12], [41, 11]], 'path', 2); // to manor gate
    // fields & river
    m.fill(1, 8, 8, 5, 'wheat');
    for (let x = 0; x < 52; x++) { const yc = Math.round(39.5 - Math.max(0, x - 30) * 0.32); m.fill(x, yc, 1, 3, 'water'); m.fill(x, yc + 3, 1, 42, 'grass'); }
    for (let y = 37; y < 42; y++) for (let x = 12; x < 14; x++) if (m.get(x, y) === 'water') m.set(x, y, 'bridge');
    m.path([[12, 33], [12, 38]], 'path', 2);
    m.path([[12, 33], [20, 33], [20, 37]], 'path', 2);
    // ---- manor garden
    m.fill(36, 1, 13, 9, 'grass'); m.fill(37, 7, 10, 2, 'flowers'); m.fill(41, 7, 1, 3, 'path');
    for (let x = 35; x <= 49; x++) { if (x === 41) continue; m.spr(S.wallH, x, 10); }
    for (let y = 1; y < 10; y++) { m.spr(S.wallV, 35, y); m.spr(S.wallV, 49, y); }
    for (let x = 35; x <= 49; x++) m.spr(S.wallH, x, 0, { dy: 0 });
    m.house('manor', 38, 2, { w: 9, roofH: 2, wallH: 3, wall: 'stone', door: 4, doorW: 1, windows: [0, 1, 2, 6, 7, 8], chimney: 7, roof: 'slate', sign: 'manor', signAt: 5, name: "Lord Aldermere's Manor", look: "Lord Aldermere's grand manor. Polished windows, prim hedges.", act: 'manorDoor' });
    m.tree(37, 8, 'green'); m.tree(47, 8, 'green');
    m.spr(S.flowerpot, 39, 9, { solid: false }); m.spr(S.flowerpot, 44, 9, { solid: false });
    leafPickup(m, 'manor', 47, 3);
    // ---- buildings
    m.house('guild', 21, 10, { w: 7, roofH: 2, wallH: 2, door: 3, windows: [0, 1, 5, 6], chimney: 5, sign: 'guild', signAt: 4, name: 'Kraxenville Guild', look: "The Merchants' Guild — a green shield with crossed axes and a compass star hangs above the door.", enter: ['guild', 'door'] });
    m.spr(S.noticeBoard, 28, 15, { fw: 2, id: 'board', name: 'Notice Board', act: 'noticeBoard' });
    m.house('tavern', 6, 14, { w: 6, roofH: 2, wallH: 2, door: 3, windows: [0, 1, 4, 5], chimney: 1, sign: 'tavern', signAt: 2, roof: 'red', name: 'Kraxenville Tavern', look: 'Laughter and the clink of mugs spill out of the tavern.', act: 'tavernDoor' });
    m.house('coach', 36, 13, { w: 7, roofH: 2, wallH: 2, wall: 'wood', door: 2, doorW: 2, windows: [0, 5, 6], sign: 'coach', signAt: 4, roof: 'slate', name: 'Kraxenville Coach House', look: 'The Coach House. It smells of hay and horses.', act: 'coachDoor' });
    m.house('cauldron', 7, 27, { w: 7, roofH: 2, wallH: 2, door: 3, windows: [0, 1, 5, 6], chimney: 5, sign: 'cauldron', signAt: 4, flowers: true, name: 'The Iron Cauldron', look: 'The Iron Cauldron — the best stew in Kraxenville.', enter: ['cauldron', 'door'] });
    m.house('hall', 36, 27, { w: 7, roofH: 2, wallH: 2, wall: 'stone', door: 3, windows: [0, 1, 5, 6], sign: 'scales', signAt: 4, roof: 'slate', name: "Merchant's Hall", look: "The Merchant's Hall, where coin is counted and deals are struck.", act: 'hallDoor' });
    m.house('cookshop', 27, 33, { w: 7, roofH: 2, wallH: 2, door: 1, windows: [3, 4, 5], chimney: 5, sign: 'cook', signAt: 2, name: 'The Cookshop', look: 'The Cookshop bakery. The smell of pastry makes your tummy rumble.', act: 'cookDoor' });
    m.house('houseA', 15, 29, { w: 5, roofH: 2, wallH: 2, door: 2, windows: [0, 4], chimney: 3, flowers: true, name: 'A cottage', look: 'Somebody\'s home. Better not barge in.' });
    m.house('houseB', 29, 28, { w: 5, roofH: 2, wallH: 2, wall: 'wood', door: 2, windows: [0, 4], chimney: 1, name: 'A cottage', look: 'A neat little house with a herb box in the window.' });
    m.house('houseC', 13, 11, { w: 5, roofH: 2, wallH: 2, door: 2, windows: [0, 4], chimney: 0, roof: 'red', name: 'A cottage', look: 'The weaver\'s house. A loom clacks inside.' });
    m.house('houseD', 44, 23, { w: 5, roofH: 2, wallH: 2, wall: 'wood', door: 2, windows: [0, 4], chimney: 4, name: 'A cottage', look: 'The cooper\'s house. Barrels are stacked all around.' });
    // ---- market square
    m.spr(S.fountain, 24, 20, { fw: 3, fh: 2, id: 'fountain', name: 'Fountain', act: 'fountain', light: null });
    m.spr(S.stallFruit, 19, 17, { fw: 3, id: 'stallFruit', name: 'Fruit Stall', act: 'marigold', dx: -1 });
    m.spr(S.stallSpice, 30, 17, { fw: 3, id: 'stallSpice', name: 'Lesterfield Goods', act: 'osric', dx: -1 });
    m.spr(S.stallCloth, 19, 25, { fw: 3, id: 'stallCloth', name: 'Cloth Stall', look: 'Bolts of bright cloth from distant Wockville.', dx: -1 });
    m.spr(S.stallBread, 30, 25, { fw: 3, id: 'stallBread', name: 'Bread Stall', look: 'The bread stall is sold out today. Only crumbs remain.', dx: -1 });
    m.spr(S.bench, 21, 22, { fw: 2, solid: true, id: 'bench', name: 'Bench', act: 'benchSquare' });
    [[18, 17], [33, 17], [18, 27], [33, 27], [23, 14], [27, 14]].forEach(([x, y]) => m.spr(S.lamp, x, y, { light: { r: 40, c: '255,220,140' }, dy: 1 }));
    m.spr(S.barrel, 34, 19); m.spr(S.crate, 35, 19); m.spr(S.sack, 18, 19, { solid: false });
    // ---- coach yard
    m.spr(S.trough, 41, 18, { fw: 2, id: 'trough', name: 'Water Trough', look: 'A long trough of cool water for the horses.' });
    m.spr(S.hay, 43, 17, { dy: 0 }); m.spr(S.hay, 35, 16, { dy: 0 });
    m.spr(icon('bentNail'), 45, 19, { solid: false, id: 'nail_pick', name: 'Bent Nail', act: 'nailPick', if: s => !s.flags.gotNail, sparkle: true });
    m.spr(S.cart, 46, 15, { fw: 2, dy: 0 });
    m.spr(S.anvil, 34, 17, { solid: true });
    // ---- the green by the north entrance
    m.tree(13, 4, 'orange', { id: 'ballTree', name: 'Big Oak', act: 'ballTree', jumpAct: 'ballTreeJump' });
    m.spr(icon('ball'), 13, 4, { solid: false, dx: -2, dy: -30, sortOff: 30, id: 'stuckBall', noInteract: true, if: s => !s.flags.ballDown });
    m.spr(S.sign, 22, 6, { id: 'sign_n', name: 'Signpost', look: '"Welcome to KRAXENVILLE. Please mind the geese."' });
    // ---- west gate
    m.spr(S.wallV, 2, 18, { dy: 0 }); m.spr(S.wallV, 2, 19); m.spr(S.wallV, 2, 24); m.spr(S.wallV, 2, 25);
    m.spr(S.sign, 4, 19, { id: 'sign_w', name: 'Signpost', look: '"WEST ROAD — The Dark Forest. Travel with a guide!"' });
    // ---- the caravan yard outside the Merchants' Guild
    m.spr(S.wagon, 29, 11, { fw: 3, id: 'wagonY1', name: 'Caravan Wagon', act: 'cargo' });
    m.spr(S.wagon, 29, 13, { fw: 3, id: 'wagonY2', name: 'Caravan Wagon', act: 'cargo' });
    m.spr(S.barrel, 34, 14); m.spr(S.crate, 34, 15); m.spr(S.barrel, 27, 11, { solid: true });
    m.keep(27, 10, 6, 6);
    m.zone(26, 10, 9, 7, 'guildYard');
    // ---- a bench outside the pie shop
    m.spr(S.bench, 24, 38, { fw: 2, solid: true, id: 'benchPie', name: 'Bench', act: 'bench' });
    // south bridge sign
    m.spr(S.sign, 14, 35, { id: 'sign_s', name: 'Signpost', look: '"SOUTH — Brushwood, Wockville and Lesterfield."' });
    leafPickup(m, 'town1', 3, 36); leafPickup(m, 'town2', 50, 6);
    // ---- trees
    m.keep(18, 0, 10, 9); m.keep(10, 3, 9, 7); m.keep(34, 17, 13, 5); m.keep(30, 11, 6, 4); m.keep(36, 1, 13, 9); m.keep(19, 33, 15, 6); m.keep(2, 34, 4, 4); m.keep(48, 4, 3, 3); m.keep(0, 19, 5, 6); m.keep(33, 10, 3, 4);
    m.scatter((x, y, r) => m.tree(x, y, TREES[Math.floor(r() * TREES.length)]), 160, [0, 0, 52, 42], GRASS, 77, 2);
    // ---- exits & spawns
    m.exit(19, 0, 2, 1, 'hillside', 'south');
    m.exit(0, 20, 1, 4, null, null, { gate: 'westGate' });
    m.exit(12, 41, 2, 1, 'road', 'north', { gate: 'southRoad' });
    m.spawn('south', 12, 38, 'up');
    m.spawn('north', 19, 2, 'down'); m.spawn('guild', 24, 15, 'down'); m.spawn('cauldron', 10, 32, 'down'); m.spawn('west', 2, 21, 'right');
    m.spawn('bench', 22, 23, 'down');
    // ---- people
    m.npc({ id: 'fredrick', char: 'fredrick', x: 27, y: 23, dir: 'down', name: 'Fredrick', act: 'fredrick', color: '#2a7a4a', voice: 0.8 });
    m.npc({ id: 'marigold', char: 'marigold', x: 22, y: 18, dir: 'down', name: 'Marigold', act: 'marigold', color: '#c8603a', voice: 1.3 });
    m.npc({ id: 'osric', char: 'osric', x: 29, y: 18, dir: 'down', name: 'Osric', act: 'osric', color: '#6a3a8a', voice: 0.7 });
    m.npc({ id: 'baker', char: 'baker', x: 30, y: 37, dir: 'down', name: 'Mistress Pell', act: 'baker', color: '#a87440', voice: 1.1 });
    m.npc({ id: 'bertram', char: 'bertram', x: 40, y: 20, dir: 'down', name: 'Bertram', act: 'bertram', color: '#8a6a3a', voice: 0.65 });
    m.npc({ id: 'clover', char: 'horse', x: 38, y: 19, dir: 'left', name: 'Clover', act: 'clover', horse: true, voice: 0.5, fw: 2 });
    m.npc({ id: 'pemberton', char: 'pemberton', x: 43, y: 11, dir: 'left', name: 'Pemberton', act: 'pemberton', color: '#3a3a4a', voice: 0.9 });
    m.npc({ id: 'kid1', char: 'kid1', x: 12, y: 7, dir: 'right', name: 'Pip', act: 'kids', color: '#c84a3a', voice: 1.7 });
    m.npc({ id: 'kid2', char: 'kid2', x: 15, y: 7, dir: 'left', name: 'Nell', act: 'kids', color: '#3e7a32', voice: 1.8 });
    m.npc({ id: 'vA', char: 'villagerA', x: 29, y: 24, dir: 'left', name: 'Farmer Joss', act: 'villagerA', color: '#4a4a7a', wander: 3, voice: 0.85 });
    m.npc({ id: 'vB', char: 'villagerB', x: 12, y: 22, dir: 'down', name: 'Old Maud', act: 'villagerB', color: '#a04a6a', wander: 2, voice: 1.2 });
    m.npc({ id: 'vC', char: 'villagerC', x: 15, y: 23, dir: 'down', name: 'Hamish', act: 'villagerC', color: '#345a5a', wander: 2, voice: 0.75 });
    m.npc({ id: 'tilda', char: 'tilda', x: 22, y: 25, dir: 'left', name: 'Tilda', act: 'tilda', color: '#7a4aa0', voice: 1.2 });
    m.npc({ id: 'gerald', char: 'gerald', x: 31, y: 15, dir: 'left', name: 'Gerald', act: 'crew', color: '#a83a2a', voice: 0.8, if: s => !s.flags.departed });
    m.npc({ id: 'aldric', char: 'aldric', x: 28, y: 11, dir: 'right', name: 'Aldric', act: 'crew', color: '#3a6a9a', voice: 1.05, if: s => !s.flags.departed });
    m.npc({ id: 'ronald', char: 'ronald', x: 28, y: 13, dir: 'right', name: 'Ronald', act: 'crew', color: '#7a5a3a', voice: 0.7, if: s => !s.flags.departed });
    return m;
  };

  // =============================================================== GUILD (interior)
  build.guild = () => {
    const m = B('guild', 16, 11, 'stone', 5);
    m.name = 'Kraxenville Guild'; m.music = 'town'; m.interior = true;
    m.fill(0, 0, 16, 1, 'wallTop'); m.fill(1, 1, 14, 2, 'wallStone'); m.fill(0, 0, 1, 11, 'wallTop'); m.fill(15, 0, 1, 11, 'wallTop'); m.fill(0, 10, 16, 1, 'wallTop'); m.set(7, 10, 'stone'); m.set(8, 10, 'stone');
    m.spr(S.banner, 3, 1, { solid: false, dy: 4, wallDecor: true }); m.spr(S.banner, 12, 1, { solid: false, dy: 4, wallDecor: true });
    m.spr(S.window, 6, 1, { solid: false, dy: -2, wallDecor: true }); m.spr(S.window, 9, 1, { solid: false, dy: -2, wallDecor: true });
    m.spr(S.rug, 5, 5, { fw: 3, fh: 2, solid: false, decal: true });
    m.spr(S.counter, 5, 4, { fw: 4, id: 'gcounter', name: 'Guild Counter', look: 'Ledgers, inkpots and a brass bell.' });
    m.spr(S.shelf, 1, 3, { fw: 2 }); m.spr(S.shelf, 13, 3, { fw: 2 });
    m.spr(S.crate, 1, 8); m.spr(S.crate, 2, 8); m.spr(S.barrel, 1, 7); m.spr(S.barrel, 14, 8); m.spr(S.sack, 13, 8);
    m.spr(S.table, 11, 6, { fw: 2, id: 'mapTable', name: 'Map Table', act: 'mapTable' });
    m.spr(S.noticeBoard, 2, 5, { fw: 2, id: 'gboard', name: 'Job Board', act: 'noticeBoard' });
    m.exit(7, 10, 2, 1, 'town', 'guild');
    m.spawn('door', 7, 9, 'up');
    m.npc({ id: 'henry', char: 'henry', x: 7, y: 3, dir: 'down', name: 'Guild Master Henry', act: 'henry', color: '#2c6a3a', voice: 0.75 });
    return m;
  };

  // =============================================================== IRON CAULDRON (interior)
  build.cauldron = () => {
    const m = B('cauldron', 16, 11, 'wood', 9);
    m.name = 'The Iron Cauldron'; m.music = 'dawn'; m.interior = true;
    m.fill(0, 0, 16, 1, 'wallTop'); m.fill(1, 1, 14, 2, 'wallPlaster'); m.fill(0, 0, 1, 11, 'wallTop'); m.fill(15, 0, 1, 11, 'wallTop'); m.fill(0, 10, 16, 1, 'wallTop'); m.set(7, 10, 'wood'); m.set(8, 10, 'wood');
    m.spr(S.fireplace, 2, 2, { fw: 2, dy: 6, id: 'fire', name: 'Fireplace', look: 'A crackling fire. Warm as a hug.', light: { r: 50, c: '255,170,80' } });
    m.spr(S.window, 6, 1, { solid: false, dy: -2, wallDecor: true }); m.spr(S.window, 13, 1, { solid: false, dy: -2, wallDecor: true });
    m.spr(S.counter, 9, 3, { fw: 4, id: 'bar', name: 'Counter', look: 'A great iron cauldron of stew bubbles behind the counter.' });
    m.spr(S.cauldron, 13, 3, { id: 'bigpot', name: 'The Iron Cauldron', look: 'The famous iron cauldron. Beef, carrots, potatoes and a secret herb.' });
    m.spr(S.table, 3, 6, { fw: 2, id: 'ftable', name: 'Table', look: 'A sturdy table, worn smooth by many elbows.' });
    m.spr(S.stewBowl, 3, 6, { solid: false, dx: 6, dy: -12, sortOff: 1 }); m.spr(S.stewBowl, 4, 6, { solid: false, dx: 6, dy: -12, sortOff: 1 });
    m.spr(S.candle, 4, 6, { solid: false, dx: 2, dy: -14, sortOff: 1, light: { r: 26, c: '255,200,120' } });
    m.spr(S.table, 10, 7, { fw: 2 }); m.spr(S.mug, 10, 7, { solid: false, dx: 8, dy: -13, sortOff: 1 });
    m.spr(S.chairFront, 2, 6, { dx: 2 }); m.spr(S.chairFront, 9, 7, { dx: 2 });
    m.spr(S.barrel, 1, 9); m.spr(S.plant, 14, 9);
    m.exit(7, 10, 2, 1, 'town', 'cauldron');
    m.spawn('door', 7, 9, 'up');
    m.npc({ id: 'innkeeper', char: 'innkeeper', x: 13, y: 4, dir: 'left', name: 'Brenna', act: 'innkeeper', color: '#7a3a2a', voice: 1.05 });
    m.npc({ id: 'patron', char: 'tobias', x: 5, y: 6, dir: 'left', name: 'Old Tom', act: 'patron', color: '#7a5a3a', voice: 0.7 });
    return m;
  };

  // =============================================================== THE BRUSHWOOD ROAD
  build.road = () => {
    const m = B('road', 30, 46, 'grass', 71);
    m.name = 'The Brushwood Road'; m.music = 'town'; m.particles = 'leaves';
    for (let y = 0; y < 46; y++) for (let x = 0; x < 30; x++) if (GFX.hash(x, y, 12) < 0.2) m.set(x, y, 'leafy');
    m.path([[14, 0], [14, 8], [10, 14], [10, 20], [16, 26], [18, 32], [14, 38], [14, 45]], 'path', 2);
    m.fill(20, 5, 8, 6, 'wheat'); m.fill(2, 30, 7, 6, 'wheat'); m.fill(22, 36, 6, 5, 'flowers');
    m.spr(S.bigRock, 4, 10, { fw: 2, id: 'rockR1', name: 'Large Rock', look: 'A large rock surrounded by overgrown shrubbery.' });
    m.spr(S.bigRock, 22, 17, { fw: 2, id: 'rockR2', name: 'Large Rock', look: 'Moss grows on the shady side of the rock.' });
    m.spr(S.bigRock, 6, 39, { fw: 2, id: 'rockR3', name: 'Large Rock', look: 'A smooth, sun-warmed rock.' });
    m.spr(S.bush, 7, 11); m.spr(S.bush, 24, 18); m.spr(S.rock, 19, 28); m.spr(S.rock, 11, 33);
    m.spr(S.sign, 17, 3, { id: 'signR', name: 'Signpost', look: '"KRAXENVILLE — north. BRUSHWOOD — south."' });
    m.spr(S.fenceH, 20, 11); m.spr(S.fenceH, 21, 11); m.spr(S.fenceH, 22, 11); m.spr(S.fenceH, 23, 11);
    m.keep(6, 18, 18, 5); m.keep(12, 0, 6, 4); m.keep(12, 42, 6, 4); m.keepRoad();
    m.scatter((x, y, r) => m.tree(x, y, TREES[Math.floor(r() * TREES.length)]), 130, [0, 0, 30, 46], GRASS, 31, 2);
    m.zone(7, 18, 11, 3, 'foxCrossing');
    m.exit(13, 0, 4, 1, 'town', 'south', { gate: 'roadNorth' });
    m.exit(13, 45, 4, 1, 'brushwood', 'north');
    m.spawn('north', 14, 2, 'down'); m.spawn('south', 14, 43, 'up');
    return m;
  };

  // =============================================================== BRUSHWOOD
  build.brushwood = () => {
    const m = B('brushwood', 34, 26, 'grass', 81);
    m.name = 'Brushwood'; m.music = 'dawn'; m.particles = 'leaves';
    for (let y = 0; y < 26; y++) for (let x = 0; x < 34; x++) if (GFX.hash(x, y, 14) < 0.18) m.set(x, y, 'leafy');
    m.path([[16, 0], [16, 7]], 'path', 2);
    m.fill(6, 7, 21, 8, 'path');
    m.path([[8, 14], [4, 20], [4, 25]], 'path', 2);
    m.fill(22, 17, 10, 7, 'wheat'); m.fill(10, 17, 8, 3, 'flowers');
    m.house('brushTavern', 12, 3, { w: 8, roofH: 2, wallH: 2, door: 3, windows: [0, 1, 5, 6, 7], chimney: 6, sign: 'tavern', signAt: 4, roof: 'red', flowers: true, name: 'Brushwood Tavern', look: 'The Brushwood Tavern. It smells of fresh bread and woodsmoke.', act: 'brushTavern' });
    m.house('bwA', 2, 2, { w: 5, roofH: 2, wallH: 2, wall: 'wood', door: 2, windows: [0, 4], chimney: 3, name: 'A cottage', look: "A farmer's cottage with muddy boots by the door." });
    m.house('bwB', 25, 2, { w: 6, roofH: 2, wallH: 2, door: 2, windows: [0, 4, 5], chimney: 1, roof: 'slate', name: 'A cottage', look: 'Herbs hang drying in the window.' });
    m.spr(S.wagon, 7, 9, { fw: 3, id: 'wagonB1', name: 'Wagon', act: 'lastBarrel' });
    m.spr(S.wagon, 12, 9, { fw: 3, id: 'wagonB2', name: 'Wagon', act: 'lastBarrel' });
    m.spr(S.wagon, 18, 9, { fw: 3, id: 'wagonB3', name: 'Wagon', act: 'lastBarrel' });
    m.spr(S.well, 24, 12, { fw: 2, id: 'well', name: 'Well', act: 'well' });
    m.spr(S.barrel, 20, 6); m.spr(S.barrel, 21, 6); m.spr(S.hay, 4, 8); m.spr(S.trough, 1, 12, { fw: 2 });
    m.spr(S.sign, 18, 1, { id: 'signB', name: 'Signpost', look: '"BRUSHWOOD. Lesterfield — south-west, by way of the Dark Forest."' });
    m.keep(5, 6, 23, 10); m.keep(14, 0, 5, 3); m.keep(2, 15, 5, 11); m.keepRoad();
    m.scatter((x, y, r) => m.tree(x, y, TREES[Math.floor(r() * TREES.length)]), 70, [0, 0, 34, 26], GRASS, 41, 2);
    m.exit(15, 0, 3, 1, 'road', 'south', { gate: 'roadNorth' });
    m.exit(3, 25, 3, 1, null, null, { gate: 'brushSouth' });
    m.spawn('north', 16, 2, 'down');
    m.npc({ id: 'horseL', char: 'horse', x: 7, y: 11, dir: 'left', name: 'Clover', act: 'horseB', horse: true, fw: 2, voice: 0.5, if: s => s.flags.shod });
    m.npc({ id: 'horseL', char: 'horseCream', x: 7, y: 11, dir: 'left', name: 'Biscuit', act: 'horseB', horse: true, fw: 2, voice: 0.5, if: s => !s.flags.shod });
    m.npc({ id: 'juniper', char: 'horseDark', x: 12, y: 11, dir: 'left', name: 'Juniper', act: 'horseB', horse: true, fw: 2, voice: 0.5 });
    m.npc({ id: 'bramble', char: 'horseGrey', x: 18, y: 11, dir: 'left', name: 'Bramble', act: 'horseB', horse: true, fw: 2, voice: 0.5 });
    m.npc({ id: 'kalen', char: 'kalen', x: 16, y: 8, dir: 'down', name: 'Kalen', act: 'kalen', color: '#5a8a3a', voice: 1.0 });
    m.npc({ id: 'winston', char: 'winston', x: 19, y: 13, dir: 'left', name: 'Winston', act: 'winston', color: '#8a6a3a', voice: 0.8 });
    m.npc({ id: 'aldric', char: 'aldric', x: 15, y: 13, dir: 'down', name: 'Aldric', act: 'aldricB', color: '#3a6a9a', voice: 1.05 });
    m.npc({ id: 'ronald', char: 'ronald', x: 22, y: 10, dir: 'left', name: 'Ronald', act: 'ronaldB', color: '#7a5a3a', voice: 0.7 });
    return m;
  };

  // =============================================================== CHAPTER TWO: THE DARK FOREST
  build.forest_path = () => {
    const m = B('forest_path', 28, 48, 'forest', 201);
    m.name = 'The Dark Forest'; m.music = 'forest'; m.darkPines = true;
    for (let y = 0; y < 48; y++) for (let x = 0; x < 28; x++) if (GFX.hash(x, y, 21) < 0.12) m.set(x, y, 'mud');
    m.path([[14, 0], [14, 9], [12, 13], [11, 20], [13, 26], [16, 31], [16, 38], [14, 47]], 'fpath', 2);
    m.fill(15, 40, 4, 3, 'mud'); m.fill(8, 22, 3, 3, 'mud');
    // decorations: moss, white mushrooms, fallen logs
    for (const [x, y] of [[9, 4], [20, 14], [6, 18], [19, 24], [8, 30], [21, 36], [10, 42], [18, 44]]) m.spr(S.mushroomsWhite, x, y, { solid: false, decal: true });
    m.spr(S.log, 4, 13, { fw: 2, id: 'logF1', name: 'Fallen Log', look: 'A fallen spruce, soft with moss.' });
    m.spr(S.log, 20, 28, { fw: 2, id: 'logF2', name: 'Fallen Log', look: 'White mushrooms grow along the rotting bark.' });
    m.spr(S.stump, 22, 19, { id: 'stumpF', name: 'Old Stump', look: 'An old stump, damp and dark.' });
    // a flat rock (it can prop up a wagon), half hidden behind a pine like the round ones that can't
    m.spr(S.flatRock, 19, 5, { dx: 10, solid: false, id: 'flatRock', name: 'Flat Rock', act: 'flatRock', if: s => !s.flags.gotFlatRock });
    m.spr(S.rock, 7, 9, { id: 'roundRock1', name: 'Round Rock', look: 'A round, mossy rock. It would roll right out from under anything.' });
    m.spr(S.rock, 22, 8, { id: 'roundRock2', name: 'Round Rock', look: 'Smooth and round. Not much use for propping anything up.' });
    // While Ronald's wheel is mended, the three wagons stand in a line on the path facing south, horses still hitched:
    // Luminara's at the front, Aldric's behind it, and Ronald's at the back (the barrels beside it once unloaded).
    const stopped = s => s.flags.wheelStopped && !s.flags.wheelFixed;
    const parked = (horse, gy, o) => { const r = GFX.rig(horse, null, 'down'); // gy: the ground line below the bench, in pixels
      return m.spr(r.c, 14, gy / T - 2, Object.assign({ fw: 2, fh: 2, dx: 232 - r.ax - 14 * T, dy: r.c.height - r.ay }, o)); };
    parked('horse', 176, { id: 'myWagonC', name: 'Your Wagon', act: 'myWagon', if: s => stopped(s) && s.flags.shod });
    parked('horseCream', 176, { id: 'myWagonB', name: 'Your Wagon', act: 'myWagon', if: s => stopped(s) && !s.flags.shod });
    parked('horseDark', 112, { id: 'aldWagon', name: "Aldric's Wagon", act: 'aldWagon', if: stopped });
    parked('horseGrey', 64, { id: 'ronWagon', name: "Ronald's Wagon", act: 'ronWagon', if: stopped });
    m.spr(S.flatRock, 13, 3, { solid: false, noShadow: true, dx: 6, dy: 3, sortOff: 1, id: 'rockUnder', if: s => stopped(s) && s.flags.rockPlaced });
    for (const [x, y] of [[17, 2], [18, 2], [17, 3]]) m.spr(S.barrel, x, y, { if: s => stopped(s) && s.flags.barrelsOff && !s.flags.barrelsBack });
    m.npc({ id: 'ronaldF', char: 'ronald', x: 12, y: 4, dir: 'right', name: 'Ronald', act: 'ronaldF', color: '#7a5a3a', voice: 0.7, if: stopped });
    m.npc({ id: 'aldricF', char: 'aldric', x: 17, y: 6, dir: 'left', name: 'Aldric', act: 'aldricF', color: '#3a6a9a', voice: 1.05, if: stopped });
    m.keep(9, 0, 10, 14); m.keepRoad('fpath');
    m.scatter((x, y) => m.pine(x, y), 150, [0, 0, 28, 48], new Set(['forest', 'mud']), 211, 2);
    m.zone(0, 7, 28, 2, 'wheelStop', s => !s.flags.wheelStopped);
    m.zone(0, 30, 28, 2, 'luminaWisp', s => s.flags.lanternLit && !s.flags.wispSeen);
    m.exit(13, 47, 4, 1, 'forest_bog', 'north', { gate: 'toBog' });
    m.spawn('north', 14, 2, 'down'); m.spawn('south', 14, 45, 'up');
    m.spawn('wheel', 12, 9, 'up'); m.spawn('drive', 14, 10, 'down');   // climbing down from her wagon, and back up
    return m;
  };

  build.forest_bog = () => {
    const m = B('forest_bog', 30, 44, 'forest', 233);
    m.name = 'The Misty Bog'; m.music = 'forest'; m.darkPines = true;
    for (let y = 0; y < 44; y++) for (let x = 0; x < 30; x++) if (GFX.hash(x, y, 23) < 0.3) m.set(x, y, 'mud');
    m.fill(6, 17, 18, 8, 'mud');
    m.path([[14, 0], [14, 8], [10, 13], [12, 16]], 'fpath', 2);
    m.path([[17, 25], [19, 30], [20, 35], [16, 40], [15, 43]], 'fpath', 2);
    for (const [x, y] of [[8, 6], [21, 12], [4, 30], [24, 33], [9, 38]]) m.spr(S.mushroomsWhite, x, y, { solid: false, decal: true });
    // the owls, perched on a dead tree on the left
    m.dead(5, 11);
    m.npc({ id: 'owl1', char: 'owl', x: 4, y: 10, dir: 'down', name: 'Owl', act: 'owls', static: true, perch: -24, voice: 1.4 });
    m.npc({ id: 'owl2', char: 'owl', x: 6, y: 10, dir: 'down', name: 'Owl', act: 'owls', static: true, perch: -20, voice: 1.6 });
    // the old waymarker at the edge of the mist; the mist itself; the glowing trail it hides
    m.spr(S.waystone[0], 12, 17, { id: 'marker', name: 'Old Waymarker', act: 'marker' });
    const misty = s => !s.flags.trailFound;
    m.fog = [{ x: 0, y: 19, w: 30, h: 7, if: misty }];
    m.obj({ x: 0, y: 21, fw: 30, fh: 1, invisible: true, if: misty });
    for (const [x, y] of [[13, 19], [14, 21], [15, 22], [16, 24]]) m.spr(S.trailStone, x, y, { solid: false, decal: true, noShadow: true, light: { r: 16, c: '170,255,190' }, if: s => s.flags.trailFound });
    m.keep(9, 0, 10, 10); m.keep(10, 16, 10, 10); m.keepRoad('fpath');
    m.scatter((x, y) => m.pine(x, y), 120, [0, 0, 30, 44], new Set(['forest', 'mud']), 241, 2);
    m.zone(0, 19, 30, 2, 'mistEdge', s => !s.flags.trailFound);
    m.zone(0, 27, 30, 2, 'awoo', s => s.flags.trailFound && !s.flags.deerSeen);
    m.zone(0, 35, 30, 2, 'sunShower', s => s.flags.deerSeen && !s.flags.sunShower);
    m.exit(14, 43, 4, 1, null, null, { gate: 'toLesterfield' });
    m.spawn('north', 14, 2, 'down');
    return m;
  };

  const cache = {};
  function get(id) { return cache[id] || (cache[id] = build[id]()); }
  function reset() { for (const k in cache) delete cache[k]; }
  return { get, reset, SOLID_TILES, LOW_TILES, ids: Object.keys(build) };
})();
