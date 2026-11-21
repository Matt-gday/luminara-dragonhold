// Reachability: every person, object and exit on every map can be reached.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push('PAGEERROR '+e.message));
  await p.goto(GAME); await p.waitForTimeout(800);
  await p.evaluate(()=>{ localStorage.clear(); G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await p.evaluate(()=>G.dbg.idle());
  const out = await p.evaluate(async () => {
    const res = [];
    const runs = [['forest_path','north',{wheelStopped:1}], ['forest_path','north',{wheelFixed:1, wheelStopped:1}], ['forest_bog','north',{}], ['forest_bog','north',{trailFound:1}], ['cottage','start',{}], ['hillside','north',{teaDrunk:1}], ['town','north',{arrivedTown:1}], ['town','north',{arrivedTown:1, departed:0, shod:1}], ['guild','door',{}], ['cauldron','door',{}], ['road','north',{departed:1}], ['brushwood','north',{departed:1, atBrushwood:1}]];
    for (const [id, sp, fl] of runs) {
      Object.assign(G.S.flags, fl); G.loadMap(id, sp); await new Promise(r => setTimeout(r, 50));
      const D = G.dbg, M = G.M, T = 16;
      const [px, py] = D.tileAt(D.player.x, D.player.y - 2);
      const bad = [];
      const ids = new Set([...M.objects.filter(o => (o.act || o.enter || o.leafId) && (!o.if || o.if(G.S))).map(o => o.id), ...D.npcs.map(n => n.id)]);
      for (const t of ids) { const r = D.canReach(t); if (r !== true) bad.push(t + '=' + r); }
      for (const e of M.exits) { let ok = false; for (let x = e.x; x < e.x + e.w && !ok; x++) for (let y = e.y; y < e.y + e.h && !ok; y++) { for (const [nx, ny] of [[x, y], [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]]) if (D.walkable(nx, ny, D.player) && D.findPath(px, py, nx, ny, D.player, 30000)) { ok = true; break; } } if (!ok) bad.push('exit->' + e.to); }
      const g = STORY.compass(id);
      res.push(`${id}/${sp} from ${px},${py}: ${ids.size} targets, ${M.exits.length} exits` + (bad.length ? '  UNREACHABLE: ' + bad.join(' ') : '  all reachable'));
    }
    return res.join('\n');
  });
  console.log(out); console.log(errs.join('\n') || 'no errors'); await b.close();
})();
