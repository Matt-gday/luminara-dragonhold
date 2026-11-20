// Chapter Two screenshots, desktop and phone, into tests/out/.
const { chromium, devices } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [tag, o] of [['desk', { viewport: { width: 1280, height: 720 } }], ['phone', devices['iPhone 13 landscape']]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(GAME + '?preview'); await p.waitForTimeout(900);
    const E = (fn, a) => p.evaluate(fn, a);
    await E(() => { localStorage.clear(); localStorage.setItem('luminara_preview', '1'); G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await E(() => G.dbg.idle());
    await E(() => { Object.assign(G.S.flags, { hasSatchel: 1, cloak: 1, hasLantern: 1, teaDrunk: 1, ch1Done: 1, shod: 1, ch2Started: 1, ch2Intro: 1 }); for (const k of ['move', 'goal', 'quests', 'menu', 'satchel', 'xp', 'coins', 'journal', 'light', 'hint', 'combine', 'use']) G.S.flags['tip_' + k] = 1; G.S.chapter = 2; G.S.inv = ['compass', 'flint', 'strongbox', 'guildKey', 'lanternReady']; });
    const shot = async name => { await p.waitForTimeout(700); await p.screenshot({ path: OUTDIR + `c2_${tag}_${name}.png` }); };
    // the wheel
    await E(() => { G.loadMap('forest_path', 'north'); G.setParty([]); Object.assign(G.S.flags, { wheelStopped: 1, barrelsOff: 1 }); G.refresh(); G.dbg.place(14, 9, 'down'); });
    await shot('wheel');
    // flint mini-game
    await E(() => { Object.assign(G.S.flags, { rockPlaced: 1, barrelsBack: 1, wheelFixed: 1, clouds: 1 }); G.refresh(); G.dbg.auto = false; window.__fl = G.flintGame(); });
    await p.waitForTimeout(500); await p.click('.fl-btn'); await p.waitForTimeout(300); await shot('flint');
    await E(() => { document.querySelector('.modal.flint').parentElement.remove(); G.dbg.auto = true; });
    // lantern lit, the lumina
    await E(() => { G.S.flags.lanternLit = 1; G.S.inv = G.S.inv.filter(i => i !== 'lanternReady').concat('lanternLit'); G.hud(); G.setParty([{ id: 'clover', char: 'horse', kind: 'horse', name: 'Clover', gap: 20 }, { id: 'wagonF', sprite: 'wagon', kind: 'sprite', gap: 26 }, { id: 'aldric', char: 'aldric', kind: 'human', name: 'Aldric', gap: 22 }, { id: 'ronald', char: 'ronald', kind: 'human', name: 'Ronald', gap: 16 }]); G.dbg.place(15, 31, 'down'); const n = G.addNPC({ id: 'lumina', char: 'wisp', x: 19, y: 33, name: 'Lumina', act: 'lumina' }); n.glow = 34; n.glowC = '160,255,170'; });
    await shot('lumina');
    // the misty bog
    await E(() => { G.removeNPC('lumina'); G.loadMap('forest_bog', 'north'); G.S.flags.bogIntro = 1; G.dbg.place(11, 16, 'down'); });
    await shot('mist');
    await E(() => { G.S.flags.trailFound = 1; G.refresh(); G.dbg.place(13, 19, 'down'); });
    await shot('trail');
    await E(() => { G.dbg.place(6, 13, 'up'); });
    await shot('owls');
    await E(() => { G.dbg.place(9, 26, 'left'); const d = G.addNPC({ id: 'deer', char: 'deerUpright', x: 3, y: 25, dir: 'left', name: '?' }); });
    await shot('deer');
    console.log(tag, errs.join(' ') || 'no errors'); await ctx.close();
  }
  await b.close();
})();
