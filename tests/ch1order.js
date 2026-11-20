// Out-of-order route, cargo puzzle UI solve, save/reload mid-journey, reachability of every target.
// Chapter One out-of-order routes, the cargo puzzle solved by clicking, saving/reloading on the road.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; p.on('pageerror', e => errs.push('PAGEERROR '+e.message+'\n'+e.stack)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto(GAME); await p.waitForTimeout(1000);
  await p.evaluate(()=>{ localStorage.clear(); G.dbg.auto = true; window.__t = []; for (const k of ['say','think','narrate']) { const f = G[k]; G[k] = function (...a) { window.__t.push(k + ' ' + (k==='say' ? a[0] + ': ' + a[1] : a[0])); return f.apply(this, a); }; } });
  await p.click('#tNew'); await p.click('.modal .primary');
  const E = (fn, arg) => p.evaluate(fn, arg);
  const idle = () => E(() => G.dbg.idle());
  const log = [];
  const near = id => E(id => {
    const D = G.dbg, it = D.target(id); if (!it) return 'missing';
    const T = 16, [px, py] = D.tileAt(D.player.x, D.player.y - 2);
    const fx0 = Math.floor(it.x / T), fy0 = Math.floor(it.y / T), fx1 = Math.floor((it.x + it.w - 1) / T), fy1 = Math.floor((it.y + it.h - 1) / T);
    const c = [];
    for (let x = fx0; x <= fx1; x++) { c.push([x, fy1 + 1, 'up']); c.push([x, fy0 - 1, 'down']); }
    for (let y = fy0; y <= fy1; y++) { c.push([fx0 - 1, y, 'right']); c.push([fx1 + 1, y, 'left']); }
    if (it.type === 'obj' && !it.o.solid) c.push([fx0, fy0, 'up']);
    for (const [x, y, d] of c) { if (!D.walkable(x, y, D.player)) continue; if ((x === px && y === py) || D.findPath(px, py, x, y, D.player, 20000)) { D.place(x, y, d); return true; } }
    return false;
  }, id);
  const lastLines = async n => (await E(() => (window.__t || []).splice(0))).slice(-n).map(l => '      ' + l.slice(0, 150)).join('\n');
  async function act(id, item, choices) {
    const r = await near(id); if (r !== true) log.push(`!! cannot reach ${id} on ${await E(()=>G.M.id)} (${r})`);
    await E(([id,item,ch]) => { G.dbg.choices = ch||[]; return G.dbg.act(id,item); }, [id,item,choices]);
  }
  const exit = async to => { await E(t => G.dbg.exit(t), to); await idle(); };
  const combine = async (a,b) => { await E(([a,b])=>G.dbg.combine(a,b),[a,b]); await idle(); };
  const goal = () => E(() => STORY.objective());
  const note = async (label, n = 4) => log.push(`-- ${label}  [goal: ${await goal()}]\n${await lastLines(n)}`);
  const setF = o => E(o => Object.assign(G.S.flags, o), o);
  try {
  await idle();
  // fast-forward the morning (it has its own route checks in the full playthrough)
  await act('satchel_pick'); await act('cupboard'); await act('shelf'); await combine('teaTin','sugar'); await act('stove','teaBlend');
  await exit('hillside'); await act('chair'); await act('cottage_door'); await act('wardrobe'); await act('bed'); await act('box','brassKey'); await act('lantern_pick'); await act('pantry');
  await exit('hillside'); await exit('town'); await lastLines(0);
  // 1. straight to the wagons before anything else (yard zone by walking)
  await E(()=>G.dbg.place(27, 17, 'up')); await E(()=>{ G.dbg.keys.up = true; }); await p.waitForTimeout(500); await E(()=>{ G.dbg.keys.up = false; }); await idle();
  await note('walked into the yard first', 3);
  await act('gerald'); await note('Gerald before cargo', 1);
  // 2. cargo puzzle solved by hand through the UI
  await E(() => { G.dbg.auto = false; }); await near('wagonY1');
  const done = E(() => G.dbg.act('wagonY1')).catch(()=>{});
  await p.waitForSelector('.modal.cargo', { timeout: 8000 }).catch(()=>{});
  for (let i = 0; i < 20 && !(await p.$('.modal.cargo')); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(250); }
  await p.screenshot({ path: OUTDIR + 'c1_cargo_start.png' });
  const click = async sel => { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(60); };
  const cell = (x, y) => `.modal.cargo .cg-grid .cg-cell:nth-child(${y * 4 + x + 1})`;
  for (let k = 0; k < 6; k++) { const pc = await p.$('.modal.cargo .cg-grid .cg-piece'); if (!pc) break; await pc.click(); await p.waitForTimeout(40); await p.click('.modal.cargo .cg-tray', { position: { x: 6, y: 6 } }); await p.waitForTimeout(40); }
  await click('.modal.cargo .cg-tray .cg-piece.bigcrate'); await click(cell(0, 0));
  await click('.modal.cargo .cg-tray .cg-piece.cask'); await click('.cg-rot'); await click(cell(2, 0));
  await click('.modal.cargo .cg-tray .cg-piece.cask'); await click('.cg-rot'); await click(cell(3, 0));
  for (let x = 0; x < 4; x++) { await click('.modal.cargo .cg-tray .cg-piece.barrel'); await click(cell(x, 2)); }
  await p.screenshot({ path: OUTDIR + 'c1_cargo_done.png' });
  log.push('cargo msg: ' + await p.textContent('.modal.cargo .cg-msg'));
  await click('.modal.cargo .primary');
  await E(() => { G.dbg.auto = true; }); let fin = false; done.then(() => fin = true); for (let i = 0; i < 40 && !fin; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); } await done; await idle();
  await note('cargo solved by hand', 3);
  // 3. Gerald lists everything still to do
  await act('gerald'); await note('depart too early', 1);
  // 4. jump at the oak before the children ask
  await E(()=>{ G.dbg.place(13,5,'up'); G.dbg.jump(); }); await p.waitForTimeout(900); await idle(); await note('jumped at oak before kids', 1);
  await act('marigold'); await note('Marigold with ball but not returned', 1);
  await act('kid1'); await note('kids given ball', 3);
  // 5. Fredrick before pie, then pie
  await act('fredrick', null, [1]); await act('baker', null, [0]); await act('benchPie'); await note('Fredrick before pie', 2);
  // 6. Henry after the crew
  await act('guild_door'); await act('henry'); await note('Henry after crew', 2); await exit('town');
  // 7. sugar-free bits: tallow+wick together, fountain with string
  await act('tilda'); await act('cauldron_door'); await act('innkeeper'); await act('innkeeper'); await exit('town');
  await combine('tallow','wick'); await note('tallow+wick', 1);
  await combine('lantern','tallow'); await combine('lanternTallow','wick');
  await act('gerald'); await note('depart (all side stories skipped)', 3);
  log.push('party: ' + await E(() => G.followers.map(f => f.name || f.id).join(',')));
  // 8. save on the road, reload
  await E(() => G.save()); await p.reload(); await p.waitForTimeout(1000);
  await E(()=>{ G.dbg.auto = true; }); await p.click('#tCont').catch(async () => { log.push('no #tCont'); });
  await p.waitForTimeout(600); await idle();
  log.push('after reload: map=' + await E(() => G.M.id) + ' party=' + await E(() => G.followers.map(f => f.name || f.id).join(',')));
  // 9. simulate closing mid-departure: departed but saved in town
  await E(() => { G.setParty([]); G.loadMap('town', 'south'); G.save(); }); await p.reload(); await p.waitForTimeout(1000);
  await E(()=>{ G.dbg.auto = true; }); await p.click('#tCont').catch(()=>{}); await p.waitForTimeout(600); await idle();
  log.push('closed mid-departure → map=' + await E(() => G.M.id) + ' party=' + await E(() => G.followers.map(f => f.name || f.id).join(',')) + ' crewInTown=' + await E(() => !!G.npc('gerald')));
  await exit('brushwood'); await act('horseL'); await act('juniper'); await act('bramble'); await act('wagonB3'); await act('aldric'); await note('Aldric before well/pay', 1);
  await act('winston'); await act('aldric'); await note('Aldric before well', 1);
  await act('well'); await act('aldric'); await note('end', 2);
  const sum = await E(() => STORY.summaryHTML(G.S, 1).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  log.push('SUMMARY: ' + sum);
  } catch (e) { log.push('THREW ' + e.message.split('\n')[0]); await p.screenshot({ path: OUTDIR + 'c1_fail.png' }); }
  console.log(log.join('\n')); console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
