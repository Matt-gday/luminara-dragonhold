// Chapter Two, stage 1 (the Dark Forest): full playthrough from a finished Chapter One save.
// Chapter Two (preview) stage 1 playthrough from a finished Chapter One save.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message + '\n' + e.stack)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const log = [];
  const E = (fn, a) => p.evaluate(fn, a);
  const idle = () => E(() => G.dbg.idle());
  const hook = () => E(() => { window.__t = window.__t || []; for (const k of ['say', 'think', 'narrate', 'notice']) { const f = G[k]; if (f.__h) continue; const w = function (...a) { window.__t.push(k + ' ' + (k === 'say' ? a[0] + ': ' + a[1] : String(a[0]).replace(/<[^>]+>/g, ''))); return f.apply(this, a); }; w.__h = 1; G[k] = w; } });
  const lines = async () => (await E(() => (window.__t || []).splice(0))).map(l => '      ' + l.slice(0, 170)).join('\n');
  const step = async label => { const s = await E(() => ({ map: G.M.id, goal: STORY.objective(), lvl: G.S.lvl, xp: G.S.xp, inv: G.S.inv.slice(), ch: G.S.chapter })); log.push(`-- ${label}  [ch${s.ch} ${s.map} L${s.lvl} xp${s.xp}] goal: ${s.goal}\n   inv: ${s.inv.join(',')}\n${await lines()}`); };
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
  const act = async (id, item, ch) => { const r = await near(id); if (r !== true) log.push(`!! cannot reach ${id} on ${await E(() => G.M.id)} (${r})`); await E(([id, item, ch]) => { G.dbg.choices = ch || []; return G.dbg.act(id, item); }, [id, item, ch]); };
  const walk = async (x, y, dir, ms) => { await E(([x, y, d]) => { G.dbg.place(x, y, d); G.dbg.keys[d] = true; }, [x, y, dir]); await p.waitForTimeout(ms || 600); await E(d => { G.dbg.keys[d] = false; }, dir); await idle(); };
  const exit = async to => { await E(t => G.dbg.exit(t), to); await idle(); };
  try {
    // ---- a finished Chapter One save
    await p.goto(GAME); await p.waitForTimeout(800);
    await E(() => { localStorage.clear(); G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await idle();
    await E(() => { Object.assign(G.S.flags, { hasSatchel: 1, teaMade: 1, teaDrunk: 1, cloak: 1, gotCompass: 1, hasLantern: 1, gotRations: 1, arrivedTown: 1, departed: 1, atBrushwood: 1, horsesDone: 1, lastBarrel: 1, pouchFilled: 1, paid: 1, ch1Done: 1, lanternReady: 1, gotStrongbox: 1, sunstone: 1 }); G.S.inv = ['compass', 'flint', 'strongbox', 'guildKey', 'lanternReady', 'sunstone']; G.S.q = { morning: 'done', totown: 'done', journey: 'done', brushwood: 'done', lantern: 'done' }; G.loadMap('brushwood', 'north'); G.save(); });
    // without the preview switch, Chapter Two stays hidden
    await p.reload(); await p.waitForTimeout(1000);
    log.push('no preview: title says "' + await E(() => document.querySelector('#title .chap').textContent) + '"');
    await p.goto(GAME + '?preview'); await p.waitForTimeout(1000);
    log.push('preview: title says "' + await E(() => document.querySelector('#title .chap').textContent) + '"');
    await E(() => { G.dbg.auto = true; }); await hook();
    await p.click('#tCont'); await p.waitForTimeout(500); await idle(); await hook();
    await step('chapter two begins');
    // ---- Ronald's wheel
    await walk(14, 4, 'down', 900); await step('wheel stop');
    await exit('forest_bog').catch(e => log.push('(exit blocked as expected: ' + e.message.split('\n')[0] + ')'));
    await act('ronaldF'); await act('ronWagon'); await act('ronWagon'); await act('roundRock1'); await step('barrels off, no rock yet');
    await act('flatRock'); await act('ronWagon', 'flatRock'); await act('ronWagon'); await step('wheel fixed, clouds');
    // ---- the lantern
    await walk(14, 44, 'down', 700); await step('try to leave in the dark');
    await E(() => G.dbg.combine('flint', 'lanternReady')); await idle(); await step('lantern lit');
    // ---- the lumina
    await walk(14, 27, 'down', 900); await step('lumina appears');
    await act('lumina'); await act('lumina'); await act('lumina'); await step('tried to catch it');
    await walk(14, 44, 'down', 900); await idle(); await step('the misty bog');
    // ---- owls, mist, deer, sun
    await act('owl1', null, [0]); await step('owls');
    await walk(14, 19, 'down', 400); await step('blocked by mist');
    await act('marker'); await E(() => G.dbg.place(13, 18, 'up')); await p.keyboard.press('KeyQ'); await p.waitForTimeout(400); await idle(); await step('lantern raised at the waymarker');
    await walk(16, 25, 'down', 900); await step('awooo');
    await walk(19, 33, 'down', 900); await step('sun shower');
    await walk(15, 41, 'down', 900); await step('edge of the forest');
    log.push('journal: ' + await E(() => G.S.journal.join(',')) + ' | quests: ' + JSON.stringify(await E(() => G.S.q)));
  } catch (e) { log.push('THREW ' + e.message.split('\n')[0]); await p.screenshot({ path: OUTDIR + 'c2_fail.png' }); }
  console.log(log.join('\n')); console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
