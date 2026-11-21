// Chapter Two, Ronald's wheel, played like a player: walk in until the caravan stops, bump the top and bottom of the
// screen (Luminara should say why, no invisible walls), find the half-hidden flat rock by clicking it, mend the wheel,
// then walk on down the path.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--mute-audio'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const E = (fn, a) => p.evaluate(fn, a);
  const ok = (cond, what) => { console.log((cond ? 'ok   ' : 'FAIL ') + what); if (!cond) errs.push('FAIL ' + what); };
  const tile = () => E(() => G.dbg.tileAt(G.dbg.player.x, G.dbg.player.y - 2));
  const hold = async (dir, ms) => { await E(d => { G.dbg.keys[d] = true; }, dir); await p.waitForTimeout(ms); await E(d => { G.dbg.keys[d] = false; }, dir); await p.waitForTimeout(150); };
  // the line being said, once it has finished typing out (waits up to 4 seconds)
  const bubble = async () => { for (let i = 0; i < 40; i++) { const t = await E(() => { const d = document.querySelector('.bubble, .narr'); return d && d.querySelector('.more') && d.querySelector('.more').style.display !== 'none' ? d.textContent : ''; }); if (t) return t; await p.waitForTimeout(100); } return ''; };
  // move the conversation on, and close any 'Got…' card or tip, as a player would
  const closeTalk = async () => { for (let i = 0; i < 30 && await E(() => G.dbg.dialog || !!document.querySelector('.ncard, .tipbox')); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(250); } };
  const click = async (wx, wy) => { const r = await E(([wx, wy]) => { const c = document.getElementById('game').getBoundingClientRect(), cam = G.dbg.cam(); return [c.left + (wx - cam.x) / 320 * c.width, c.top + (wy - cam.y) / 180 * c.height]; }, [wx, wy]); await p.mouse.click(r[0], r[1]); };
  try {
    // a finished Chapter One, carried on into Chapter Two (preview)
    await p.goto(GAME + '?preview'); await p.waitForTimeout(900);
    await E(() => { localStorage.clear(); localStorage.setItem('luminara_preview', '1'); G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await E(() => G.dbg.idle());
    await E(() => { Object.assign(G.S.flags, { hasSatchel: 1, teaMade: 1, teaDrunk: 1, cloak: 1, gotCompass: 1, hasLantern: 1, gotRations: 1, arrivedTown: 1, departed: 1, atBrushwood: 1, horsesDone: 1, lastBarrel: 1, pouchFilled: 1, paid: 1, ch1Done: 1, lanternReady: 1, gotStrongbox: 1 }); for (const k of ['move', 'goal', 'quests', 'menu', 'satchel', 'xp', 'coins', 'journal', 'light', 'hint', 'combine', 'use', 'compass']) G.S.flags['tip_' + k] = 1; G.S.inv = ['compass', 'flint', 'strongbox', 'guildKey', 'lanternReady']; G.S.q = { morning: 'done', totown: 'done', journey: 'done', brushwood: 'done', lantern: 'done' }; G.loadMap('brushwood', 'north'); G.save(); });
    await p.reload(); await p.waitForTimeout(1200); await E(() => { G.dbg.auto = true; }); await p.click('#tCont'); await E(() => G.dbg.idle()); await p.waitForTimeout(400); await E(() => G.dbg.idle());
    ok(await E(() => G.M.id) === 'forest_path', 'Chapter Two starts on the forest path');
    // the top of the path explains itself
    await E(() => { G.dbg.auto = false; }); await hold('up', 700);
    ok(/Brushwood is back the way we came/.test(await bubble()), 'walking back up the path: Luminara says Brushwood is behind them');
    await closeTalk();
    // walk down until the caravan stops
    await E(() => { G.dbg.auto = true; }); await hold('down', 1500); await E(() => G.dbg.idle()); await E(() => G.dbg.act('ronWagon')); await E(() => { G.dbg.auto = false; });
    ok(await E(() => G.S.flags.wheelStopped && G.S.flags.barrelsOff), 'the caravan stops and the barrels come off');
    ok(await E(() => !G.M.objects.some(o => o.invisible && !o.door && o.solid !== false && (!o.if || o.if(G.S)))), 'no invisible walls on the path');
    // the bottom of the screen is the edge
    await E(() => G.dbg.place(9, 10, 'down')); await hold('down', 900);
    const y = await E(() => G.dbg.player.y), camY = await E(() => G.dbg.cam().y);
    ok(y <= camY + 180 && y >= camY + 160, 'walking down stops at the bottom of the screen');
    ok(/Ronald's wheel needs mending first/.test(await bubble()), 'at the bottom edge: "Ronald\'s wheel needs mending first"');
    await p.screenshot({ path: OUTDIR + 'c2_wheel_edge.png' });
    await closeTalk();
    // the flat rock peeks out from behind a pine; clicking it walks there and picks it up
    await E(() => G.dbg.place(14, 8, 'up')); await p.waitForTimeout(500);
    await p.screenshot({ path: OUTDIR + 'c2_wheel_rock.png' });
    await click(19 * 16 + 8, 5 * 16 + 12); await p.waitForTimeout(3000); await closeTalk();
    ok(await E(() => !!G.S.flags.gotFlatRock), 'clicking the half-hidden flat rock picks it up');
    // mend the wheel and carry on: the edge lifts
    await E(() => { G.dbg.auto = true; }); await E(() => G.dbg.act('ronWagon', 'flatRock')); await E(() => G.dbg.act('ronWagon')); await E(() => G.dbg.idle());
    ok(await E(() => !!G.S.flags.wheelFixed), 'the rock props the wagon and the wheel is mended');
    await E(() => { G.dbg.auto = false; G.dbg.place(14, 9, 'down'); }); await hold('down', 1500);
    ok((await tile())[1] > 13, 'after the wheel is mended, the path south is open');
  } catch (e) { errs.push('THREW ' + e.stack); }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
