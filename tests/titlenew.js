// Title screen screenshots (HD, desktop, phone), Continue line and the save-slot screen.
const { chromium, devices } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [tag, o] of [['hd', { viewport: { width: 1920, height: 1080 } }], ['desk', { viewport: { width: 1280, height: 720 } }], ['phone', devices['iPhone 13 landscape']]]) {
    const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(GAME); await p.waitForTimeout(2500);
    await p.screenshot({ path: OUTDIR + `tn_${tag}.png` });
    if (tag === 'desk') {
      await p.mouse.click(300, 150); await p.mouse.click(400, 120); await p.waitForTimeout(700); await p.screenshot({ path: OUTDIR + 'tn_wisp.png' });
      // a save in progress shows Continue with who and where
      await p.evaluate(() => { localStorage.clear(); G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await p.evaluate(() => G.dbg.idle());
      await p.evaluate(() => { G.S.flags.ch1Done = 1; G.save(); }); await p.reload(); await p.waitForTimeout(2000);
      await p.screenshot({ path: OUTDIR + 'tn_continue.png' });
      console.log('continue:', await p.textContent('#tCont'), '| line:', await p.evaluate(() => document.querySelector('#title .chap').textContent));
      await p.click('#tSlots'); await p.waitForTimeout(400); await p.screenshot({ path: OUTDIR + 'tn_slots.png' });
    }
    console.log(tag, errs.join(' ') || 'no errors'); await ctx.close();
  }
  await b.close();
})();
