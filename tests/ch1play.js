// Full Chapter One playthrough (main + every side story), walking near each target first.
// Full Chapter One playthrough (main story + every side story), with a dialogue transcript in tests/out/transcript.txt.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; p.on('pageerror', e => errs.push('PAGEERROR '+e.message+'\n'+e.stack)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto(GAME); await p.waitForTimeout(1000);
  await p.evaluate(()=>{ localStorage.clear(); G.dbg.auto = true; });
  await p.evaluate(() => { window.__t = []; for (const k of ['say','think','narrate','choice']) { const f = G[k]; G[k] = function (...a) { window.__t.push(k + ' ' + (k==='narrate'||k==='think' ? '' : a[0] + ': ') + String(k==='narrate'||k==='think' ? a[0] : a[1]).replace(/\n/g,' / ') + (k==='choice' ? '  ' + JSON.stringify(a[2]) : '')); return f.apply(this, a); }; } const tt = G.toast; G.toast = function (...a) { window.__t.push('toast ' + a[0]); return tt.apply(this, a); }; });
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
  async function act(id, item, choices) {
    const r = await near(id);
    if (r !== true) log.push(`!! cannot reach ${id} on ${await E(()=>G.M.id)} (${r})`);
    await E(([id,item,ch]) => { G.dbg.choices = ch||[]; return G.dbg.act(id,item); }, [id,item,choices]);
  }
  const exit = async to => { await E(t => G.dbg.exit(t), to); await idle(); };
  const combine = async (a,b) => { await E(([a,b])=>G.dbg.combine(a,b),[a,b]); await idle(); };
  const self = async id => { await E(id => G.dbg.self ? G.dbg.self(id) : STORY.useSelf(id), id); await idle(); };
  const st = () => E(() => ({ map: G.M.id, inv: G.S.inv.slice(), coins: G.S.coins, lvl: G.S.lvl, xp: G.S.xp, goal: STORY.objective() }));
  const step = async (label) => { await E(l => window.__t.push('---------- ' + l), label); const s = await st(); log.push(`${label.padEnd(24)} ${s.map.padEnd(9)} L${s.lvl} xp=${String(s.xp).padEnd(4)} c=${String(s.coins).padEnd(3)} goal="${s.goal}" inv=[${s.inv.join(',')}]`); };
  const leaf = async id => act('leaf_' + id);
  try {
  await idle(); await step('start');
  // ---- cottage
  await exit('hillside'); await step('try leave (no satchel)');
  await act('satchel_pick'); await step('satchel');
  await act('bed'); await act('box'); await act('box','brassKey'); await step('compass');
  await act('wardrobe'); await act('cupboard'); await act('shelf');
  await act('stove','teaTin');
  await combine('teaTin','sugar'); await act('stove'); await act('stove','teaBlend'); await step('tea made');
  await act('lantern_pick'); await act('pantry'); await step('lantern+rations');
  await exit('hillside');
  await exit('town'); await step('try town before tea');
  await act('chair'); await step('tea drunk');
  await act('cottage_door'); await act('wardrobe'); await step('cloak');
  await exit('hillside');
  await act('rock1'); await act('rock2'); await act('rock3'); await leaf('hill1'); await leaf('hill2'); await step('moments+leaves');
  await exit('town'); await step('arrived town');
  // early guild visit: Henry before the crew
  await act('guild_door'); await act('henry'); await act('mapTable'); await p.keyboard.press('Escape'); await exit('town'); await step('henry first');
  await act('baker', null, [0]); await act('bench'); await act('benchPie'); await step('pie');
  await act('fredrick', null, [0]); await step('fredrick');
  await act('kid1'); await E(()=>{ G.dbg.place(13,5,'up'); G.dbg.jump(); }); await p.waitForTimeout(900); await idle();
  await act('kid2'); await act('marigold'); await step('ball');
  await act('bertram'); await act('nail_pick'); await act('fredrick');
  await combine('bentNail','luteString'); await act('fountain','hookLine'); await act('bertram'); await act('fountain', null, [0]); await step('clover+wish');
  await act('tilda'); await act('cauldron_door'); await act('innkeeper'); await act('patron'); await exit('town');
  await combine('lantern','wick'); await combine('lanternWick','tallow'); await step('lantern ready');
  await act('vB'); await leaf('town1'); await leaf('town2'); await leaf('manor'); await act('vB'); await step('leaves');
  await act('osric', null, [0]); await act('baker', null, [0, 0]);
  log.push('yard lane: ' + await E(()=>[[33,18],[33,17],[33,16],[34,17],[32,17]].map(([x,y])=>x+','+y+'='+G.dbg.walkable(x,y,G.dbg.player)).join(' '))); await E(()=>G.dbg.place(33, 18, 'up')); await E(()=>{ G.dbg.keys.up = true; }); await p.waitForTimeout(600); await E(()=>{ G.dbg.keys.up = false; }); await idle(); await step('crew met (yard zone)');
  await act('gerald'); await act('wagonY1'); await step('cargo');
  await combine('guildKey','strongbox'); await self('strongbox');
  await act('gerald'); await step('departed');
  // ---- the road
  await E(()=>G.dbg.place(10, 16, 'down')); await E(()=>{ G.dbg.keys.down = true; }); await p.waitForTimeout(700); await E(()=>{ G.dbg.keys.down = false; });
  await p.waitForTimeout(1200); log.push('fox present: ' + await E(()=>!!G.npc('fox')) + ' at ' + await E(()=>{const f=G.npc('fox'); return f && [f.x/16|0, f.y/16|0];}));
  await p.screenshot({ path: OUTDIR + 'c1_fox.png' });
  await act('fox'); await step('fox');
  await exit('town'); await step('try go back north');
  await exit('brushwood'); await step('brushwood');
  await act('aldric'); await act('wagonB1'); await act('well');
  await act('horseL'); await act('juniper'); await act('bramble'); await step('horses');
  await act('wagonB2'); await act('winston'); await act('well'); await act('winston'); await step('paid');
  await act('kalen'); await act('ronald');
  await act('aldric'); await step('end');
  const fin = await E(() => ({ mode: G.dbg.mode, q: G.S.q, leaves: G.S.leaves.length, done: G.S.flags.ch1Done, hearts: G.S.maxHearts }));
  log.push(JSON.stringify(fin));
  } catch (e) { log.push('THREW ' + e.message.split('\n')[0]); }
  require('fs').writeFileSync(OUTDIR + 'transcript.txt', (await E(() => window.__t)).join('\n'));
  console.log(log.join('\n')); console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
