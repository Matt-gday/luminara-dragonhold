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
    m.exit = (x, y, ww, hh, to, spawn, o = {}) => m.exits.push(Object.assign({ x, y, w: ww, h: hh, to, spawn }, o));
    m.spawn = (name, x, y, dir = 'down') => { m.spawns[name] = [x, y, dir]; };
    m.keep = (x, y, ww, hh) => m.clear.push([x, y, ww, hh]);
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
    m.spr(S.barrel, 1, 8, { dx: 1 });
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
    m.spr(S.bench, 21, 22, { fw: 2, solid: true, id: 'bench', name: 'Bench', act: 'bench' });
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
    // south bridge sign
    m.spr(S.sign, 14, 35, { id: 'sign_s', name: 'Signpost', look: '"SOUTH — Ferry road to Wockville (washed out)."' });
    leafPickup(m, 'town1', 3, 36); leafPickup(m, 'town2', 50, 6);
    // ---- trees
    m.keep(18, 0, 10, 9); m.keep(10, 3, 9, 7); m.keep(34, 17, 13, 5); m.keep(30, 11, 6, 4); m.keep(36, 1, 13, 9); m.keep(19, 33, 15, 6); m.keep(2, 34, 4, 4); m.keep(48, 4, 3, 3); m.keep(0, 19, 5, 6); m.keep(33, 10, 3, 4);
    m.scatter((x, y, r) => m.tree(x, y, TREES[Math.floor(r() * TREES.length)]), 160, [0, 0, 52, 42], GRASS, 77, 2);
    // ---- exits & spawns
    m.exit(19, 0, 2, 1, 'hillside', 'south');
    m.exit(0, 20, 1, 4, 'forest_edge', 'east', { gate: 'westGate' });
    m.exit(12, 41, 2, 1, null, null, { blockMsg: 'The ferry road to Wockville has washed away in the autumn rains. Not that way today.' });
    m.spawn('north', 19, 2, 'down'); m.spawn('guild', 24, 15, 'down'); m.spawn('cauldron', 10, 32, 'down'); m.spawn('west', 2, 21, 'right');
    m.spawn('bench', 22, 23, 'down');
    // ---- people
    m.npc({ id: 'fredrick', char: 'fredrick', x: 27, y: 23, dir: 'down', name: 'Fredrick', act: 'fredrick', color: '#2a7a4a', voice: 0.8 });
    m.npc({ id: 'marigold', char: 'marigold', x: 22, y: 18, dir: 'down', name: 'Marigold', act: 'marigold', color: '#c8603a', voice: 1.3 });
    m.npc({ id: 'osric', char: 'osric', x: 29, y: 18, dir: 'down', name: 'Osric', act: 'osric', color: '#6a3a8a', voice: 0.7 });
    m.npc({ id: 'baker', char: 'baker', x: 30, y: 37, dir: 'down', name: 'Mistress Pell', act: 'baker', color: '#a87440', voice: 1.1 });
    m.npc({ id: 'bertram', char: 'bertram', x: 40, y: 20, dir: 'down', name: 'Bertram', act: 'bertram', color: '#8a6a3a', voice: 0.65 });
    m.npc({ id: 'clover', char: 'horse', x: 38, y: 19, dir: 'left', name: 'Clover', act: 'clover', horse: true, voice: 0.5, fw: 2 });
    m.npc({ id: 'pemberton', char: 'pemberton', x: 41, y: 11, dir: 'down', name: 'Pemberton', act: 'pemberton', color: '#3a3a4a', voice: 0.9, if: s => !s.flags.gateOpen });
    m.npc({ id: 'kid1', char: 'kid1', x: 12, y: 7, dir: 'right', name: 'Pip', act: 'kids', color: '#c84a3a', voice: 1.7 });
    m.npc({ id: 'kid2', char: 'kid2', x: 15, y: 7, dir: 'left', name: 'Nell', act: 'kids', color: '#3e7a32', voice: 1.8 });
    m.npc({ id: 'vA', char: 'villagerA', x: 29, y: 24, dir: 'left', name: 'Farmer Joss', act: 'villagerA', color: '#4a4a7a', wander: 3, voice: 0.85 });
    m.npc({ id: 'vB', char: 'villagerB', x: 12, y: 22, dir: 'down', name: 'Old Maud', act: 'villagerB', color: '#a04a6a', wander: 2, voice: 1.2 });
    m.npc({ id: 'vC', char: 'villagerC', x: 32, y: 13, dir: 'down', name: 'Hamish', act: 'villagerC', color: '#345a5a', wander: 2, voice: 0.75 });
    m.npc({ id: 'tobias', char: 'tobias', x: 6, y: 22, dir: 'right', name: 'Tobias', act: 'tobias', color: '#7a5a3a', voice: 0.7, if: s => !s.flags.caravanLeft });
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
    m.npc({ id: 'hollis', char: 'guildmaster', x: 7, y: 3, dir: 'down', name: 'Guildmaster Hollis', act: 'hollis', color: '#2c6a3a', voice: 0.75 });
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
    m.npc({ id: 'friend', char: 'friend', x: 5, y: 6, dir: 'left', name: 'Friend', act: 'friend', color: '#2c4a8a', voice: 1.25, nameFn: true });
    m.npc({ id: 'innkeeper', char: 'innkeeper', x: 13, y: 4, dir: 'left', name: 'Brenna', act: 'innkeeper', color: '#7a3a2a', voice: 1.05 });
    m.npc({ id: 'patron', char: 'villagerC', x: 12, y: 7, dir: 'left', name: 'Hamish', act: 'patron', color: '#345a5a', voice: 0.75, if: s => false });
    return m;
  };

  // =============================================================== FOREST EDGE
  build.forest_edge = () => {
    const m = B('forest_edge', 34, 24, 'forest', 31);
    m.name = 'Edge of the Dark Forest'; m.music = 'forest'; m.dark = 0.55; m.tint = 'dusk'; m.particles = 'fireflies'; m.darkPines = false;
    m.path([[33, 11], [6, 11]], 'fpath', 2);
    m.path([[0, 11], [6, 11]], 'fpath', 2);
    m.path([[15, 11], [15, 0]], 'fpath', 2);
    m.fill(17, 8, 8, 6, 'fpath');
    m.spr(S.wagon, 19, 9, { fw: 3, fh: 1, dx: 0, id: 'wagon', name: 'Caravan Wagon', look: 'The guild wagon, piled with crates for Lesterfield.', if: s => !s.flags.caravanGone });
    m.npc({ id: 'cloverF', char: 'horse', x: 22, y: 9, dir: 'left', name: 'Clover', act: 'clover', horse: true, fw: 2, if: s => !s.flags.caravanGone });
    m.npc({ id: 'tobias', char: 'tobias', x: 20, y: 12, dir: 'left', name: 'Tobias', act: 'tobias', color: '#7a5a3a', voice: 0.7, if: s => !s.flags.caravanGone });
    m.spr(S.vines[0], 7, 10, { fw: 3, fh: 3, dx: -1, dy: 2, id: 'vines', name: 'Thorny Vines', act: 'vines', anim: S.vines, light: { r: 22, c: '255,60,100' }, if: s => !s.flags.vinesGone });
    m.spr(S.log, 15, 5, { fw: 2, id: 'log', name: 'Fallen Log', look: 'A fallen log across the trail. You could probably jump over it.', low: true, dx: 0 });
    m.spr(S.waystone[1], 26, 13, { light: { r: 44, c: '255,220,120' }, id: 'ws0', name: 'Waystone', look: 'A guild waystone. Its little lamp still burns, marking the forest road.' });
    m.spr(S.mushrooms, 12, 14, { solid: false }); m.spr(S.mushrooms, 28, 7, { solid: false });
    leafPickup(m, 'edge', 31, 4);
    m.keep(17, 8, 9, 7); m.keep(14, 0, 4, 12); m.keep(30, 3, 3, 3); m.keep(5, 9, 6, 6);
    m.scatter((x, y, r) => r() < 0.85 ? m.pine(x, y) : m.dead(x, y), 220, [0, 0, 34, 24], FOREST, 13, 2);
    m.exit(33, 10, 1, 4, 'town', 'west');
    m.exit(14, 0, 4, 1, 'deep_forest', 'south', { gate: 'northTrail' });
    m.exit(0, 10, 1, 4, 'gateway', 'east', { gate: 'westTrail' });
    m.spawn('east', 31, 11, 'left'); m.spawn('north', 15, 2, 'down'); m.spawn('west', 3, 11, 'right'); m.spawn('caravan', 17, 11, 'left');
    return m;
  };

  // =============================================================== DEEP DARK FOREST
  build.deep_forest = () => {
    const m = B('deep_forest', 42, 36, 'forest', 41);
    m.name = 'The Dark Forest'; m.music = 'forest'; m.dark = 0.9; m.particles = 'fireflies'; m.darkPines = true; m.fog = true;
    // stream
    for (let x = 0; x < 42; x++) { const yc = 16 + Math.round(Math.sin(x / 5) * 1); m.fill(x, yc, 1, 3, 'water'); }
    // trails
    m.path([[20, 35], [20, 26], [8, 26], [8, 22]], 'fpath', 2);
    m.path([[20, 26], [33, 26], [33, 22]], 'fpath', 2);
    m.path([[27, 22], [27, 20]], 'fpath', 2);
    m.path([[27, 14], [27, 10], [12, 10], [12, 6]], 'fpath', 2);
    m.path([[27, 10], [33, 10], [33, 0]], 'fpath', 2);
    m.path([[12, 10], [6, 10], [6, 5]], 'fpath', 2);
    // stepping stones across the stream at x 27-28
    for (let y = 13; y < 21; y++) for (let x = 27; x < 29; x++) if (m.get(x, y) === 'water') m.set(x, y, (y % 2 === 0) ? 'stepstone' : 'water');
    m.spr(S.waystone[0], 7, 21, { id: 'ws1', name: 'Waystone', act: 'waystone', wsId: 1, light: null });
    m.spr(S.waystone[0], 34, 21, { id: 'ws2', name: 'Waystone', act: 'waystone', wsId: 2, light: null });
    m.spr(S.waystone[0], 5, 4, { id: 'ws3', name: 'Waystone', act: 'waystone', wsId: 3, light: null });
    m.spr(S.vines[0], 32, 2, { fw: 3, fh: 2, dx: -1, id: 'mist', name: 'Wall of Mist and Thorns', act: 'mist', anim: S.vines, light: { r: 20, c: '255,60,100' }, if: s => !s.flags.mistGone, mist: true });
    m.dead(10, 7); m.spr(S.stoneCircle, 13, 6, { dx: 1 }); m.spr(S.stoneCircle, 9, 5);
    m.obj({ img: GFX.deadSprite(4), x: 3, y: 9, dx: -7, dy: 2, id: 'owlTree', name: 'Hollow Tree', act: 'owl', kind: 'tree' });
    m.npc({ id: 'owl', char: 'owl', x: 3, y: 9, dir: 'down', name: 'Old Hoots', act: 'owl', perch: -30, color: '#8a6a44', voice: 0.6, static: true });
    m.spr(S.mushrooms, 22, 28, { solid: false }); m.spr(S.mushrooms, 14, 12, { solid: false }); m.spr(S.mushrooms, 36, 12, { solid: false });
    m.spr(S.stump, 24, 25, { solid: true }); m.spr(S.log, 16, 26, { fw: 2, low: true, id: 'log2', name: 'Fallen Log', look: 'A mossy log. Jump!' });
    leafPickup(m, 'deep1', 38, 30); leafPickup(m, 'deep2', 2, 14);
    m.keep(18, 24, 18, 4); m.keep(6, 20, 4, 4); m.keep(33, 20, 3, 4); m.keep(3, 3, 12, 9); m.keep(25, 8, 10, 4); m.keep(31, 0, 5, 4); m.keep(26, 12, 4, 10); m.keep(36, 28, 4, 4); m.keep(1, 12, 3, 3); m.keep(19, 28, 3, 8);
    m.scatter((x, y, r) => r() < 0.82 ? m.pine(x, y) : m.dead(x, y), 360, [0, 0, 42, 36], FOREST, 99, 2);
    m.exit(19, 35, 3, 1, 'forest_edge', 'north');
    m.exit(32, 0, 3, 1, 'hollow', 'south');
    m.spawn('south', 20, 33, 'up'); m.spawn('north', 33, 2, 'down');
    m.goblins = [[14, 25], [30, 25], [9, 12], [20, 10], [33, 6]];
    return m;
  };

  // =============================================================== THE HOLLOW
  build.hollow = () => {
    const m = B('hollow', 24, 18, 'forest', 51);
    m.name = 'The Hollow'; m.music = 'forest'; m.dark = 0.85; m.particles = 'fireflies'; m.darkPines = true;
    m.fill(6, 4, 12, 10, 'mud'); m.path([[11, 17], [11, 13]], 'fpath', 2);
    for (let y = 4; y < 14; y++) for (let x = 6; x < 18; x++) if ((x === 6 || x === 17 || y === 4 || y === 13) && GFX.hash(x, y, 2) < 0.5) m.set(x, y, 'forest');
    m.spr(S.hole, 9, 7, { fw: 4, fh: 2, decal: true, solid: false, id: 'holeDecal', dy: 6, dx: 4 });
    m.spr(S.thornheart[0], 9, 7, { fw: 4, fh: 2, id: 'thornheart', name: 'The Thornheart', act: 'thornheart', anim: S.thornheart, light: { r: 48, c: '255,40,80' }, if: s => !s.flags.heartBurned });
    m.obj({ x: 9, y: 7, fw: 4, fh: 2, solid: true, invisible: true, id: 'ashes', name: 'Ashes', look: 'Nothing is left of the Thornheart but grey ash, and the smell of a snuffed candle.', if: s => s.flags.heartBurned });
    m.keep(5, 3, 14, 15);
    m.scatter((x, y, r) => r() < 0.8 ? m.pine(x, y) : m.dead(x, y), 120, [0, 0, 24, 18], FOREST, 71, 2);
    m.exit(10, 17, 3, 1, 'deep_forest', 'north');
    m.spawn('south', 11, 15, 'up'); m.spawn('heart', 11, 10, 'up');
    m.npc({ id: 'possum', char: 'possum', x: 14, y: 9, dir: 'left', name: 'Little Possum', act: 'possum', color: '#8e8a90', voice: 2, if: s => !s.flags.possumFree });
    m.goblins = [[6, 6], [17, 6]];
    return m;
  };

  // =============================================================== THE GATEWAY
  build.gateway = () => {
    const m = B('gateway', 28, 22, 'forest', 61);
    m.name = 'The Gateway'; m.music = 'tension'; m.dark = 0.8; m.particles = 'sparks'; m.darkPines = true;
    m.path([[27, 16], [14, 16], [14, 13]], 'fpath', 2);
    m.fill(9, 10, 12, 5, 'fpath');
    for (let y = 0; y < 22; y++) { m.fill(0, y, 3 + Math.round(Math.sin(y / 3) * 1), 1, 'water'); }
    m.spr(S.portalFrame, 12, 9, { fw: 4, fh: 1, id: 'portal', name: 'The Gateway', act: 'portal', portal: true, light: { r: 70, c: '255,40,90' } });
    [[9, 11], [21, 11], [8, 15], [22, 15], [10, 7], [20, 7]].forEach(([x, y]) => m.spr(S.stoneCircle, x, y, { dx: 1 }));
    m.keep(7, 5, 16, 12); m.keep(12, 15, 16, 4);
    m.scatter((x, y, r) => r() < 0.8 ? m.pine(x, y) : m.dead(x, y), 160, [0, 0, 28, 22], FOREST, 33, 2);
    m.exit(27, 15, 1, 3, 'forest_edge', 'west');
    m.spawn('east', 25, 16, 'left');
    return m;
  };

  const cache = {};
  function get(id) { return cache[id] || (cache[id] = build[id]()); }
  function reset() { for (const k in cache) delete cache[k]; }
  return { get, reset, SOLID_TILES, LOW_TILES, ids: Object.keys(build) };
})();
