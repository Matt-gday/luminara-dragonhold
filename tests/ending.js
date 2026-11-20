// Finish the chapter, let the credits play, return to the title: no film bars anywhere.
// The ending: finish Chapter One with the Chapter Two preview on, through the credits, back to the title, Continue.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(GAME); await p.waitForTimeout(1000);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('luminara_preview', '1'); G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await p.evaluate(() => G.dbg.idle());
  await p.evaluate(() => { Object.assign(G.S.flags, { atBrushwood: 1, horsesDone: 1, lastBarrel: 1, pouchFilled: 1, paid: 1, departed: 1, arrivedTown: 1 }); G.loadMap('brushwood', 'north'); });
  await p.waitForTimeout(300);
  await p.evaluate(async () => { const n = G.dbg.target('aldric'); G.dbg.place(Math.floor(n.x / 16), Math.floor(n.y / 16) + 1, 'up'); await G.dbg.act('aldric'); });
  const inCredits = await p.evaluate(() => ({ mode: G.dbg.mode, cine: document.body.classList.contains('cine') }));
  await p.waitForTimeout(1500); await p.click('#cBack'); await p.waitForTimeout(800); await p.click('#tCont'); await p.waitForTimeout(300); await p.evaluate(() => G.dbg.idle()); console.log('after Continue:', await p.evaluate(() => G.M.id + ' ch' + G.S.chapter)); await p.evaluate(() => G.toTitle && G.toTitle());
  const atTitle = await p.evaluate(() => ({ chap: document.querySelector('#title .chap').textContent, saveChapter: JSON.parse(localStorage.getItem('luminara_save_slot_1')).chapter, cine: document.body.classList.contains('cine'), title: !!document.querySelector('#title.home') }));
  await p.screenshot({ path: OUTDIR + 'after_credits.png' });
  console.log(JSON.stringify({ inCredits, atTitle }), errs.join(' ') || 'no errors'); await b.close();
})();
