// "Start at Chapter Two": only in a browser with preview on (never for Lisa), it makes a new save in the first empty slot,
// with Chapter One played along its main story, and begins Chapter Two in the Dark Forest. Other saves are left alone.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--mute-audio'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const E = (fn, a) => p.evaluate(fn, a);
  const ok = (cond, what) => { console.log((cond ? 'ok   ' : 'FAIL ') + what); if (!cond) errs.push('FAIL ' + what); };
  try {
    // Lisa's browser: no preview, no button
    await p.goto(GAME + '?nopreview'); await p.waitForTimeout(800);
    await E(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
    ok(!(await p.$('[data-chap]')), 'without preview there is no "Start at Chapter Two" button');
    // Matt's browser: preview on, and a save already in slot 1
    await p.goto(GAME + '?preview'); await p.waitForTimeout(800);
    await E(() => { G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await E(() => G.dbg.idle());
    await E(() => G.save());
    await p.reload(); await p.waitForTimeout(900);
    ok(!!(await p.$('[data-chap="2"]')), 'with preview, the title has "Start at Chapter Two"');
    await p.screenshot({ path: OUTDIR + 'c2_start_title.png' });
    await E(() => { G.dbg.auto = true; }); await p.click('[data-chap="2"]'); await p.waitForTimeout(300);
    await p.fill('.modal input', 'Tester'); await p.click('.modal .primary'); await p.waitForTimeout(500); await E(() => G.dbg.idle());
    ok(await E(() => G.M.id) === 'forest_path', 'it begins in the Dark Forest');
    ok(await E(() => G.S.chapter === 2 && G.S.flags.ch1Done && G.S.flags.ch2Intro), 'Chapter One counts as finished and Chapter Two has begun');
    ok(await E(() => G.S.q.darkforest === 'active' && G.S.inv.includes('flint') && G.S.inv.includes('lanternReady')), 'the Dark Forest quest is on, with flint and the ready lantern in the satchel');
    ok(await E(() => !!G.dbg.drive && G.followers.length === 2), 'Luminara is driving, with the others behind');
    ok(await E(() => G.S.playerName === 'Tester'), 'the new save has the name typed');
    ok(await E(() => localStorage.getItem('luminara_save_slot_1') !== null && localStorage.getItem('luminara_save_slot_2') !== null), 'the save that was already there is still there');
    await p.screenshot({ path: OUTDIR + 'c2_start_play.png' });
  } catch (e) { errs.push('THREW ' + e.stack); }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
