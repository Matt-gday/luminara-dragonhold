// Chapter One screenshots, desktop and phone, into tests/out/.
const { chromium, devices } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [tag, ctxOpt] of [['desk', { viewport: { width: 1280, height: 720 } }], ['phone', devices['iPhone 13 landscape']]]) {
    const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage();
    const errs=[]; p.on('pageerror', e => errs.push('PAGEERROR '+e.message));
    await p.goto(GAME); await p.waitForTimeout(1200);
    await p.screenshot({ path: OUTDIR + `s_${tag}_title.png` });
    await p.evaluate(()=>{ localStorage.clear(); G.dbg.auto = true; }); await p.click('#tNew'); await p.click('.modal .primary'); await p.evaluate(()=>G.dbg.idle());
    const E = (fn, a) => p.evaluate(fn, a);
    // town yard with the crew
    await E(() => { Object.assign(G.S.flags, { hasSatchel:1, teaMade:1, teaDrunk:1, cloak:1, gotCompass:1, hasLantern:1, gotRations:1, arrivedTown:1 }); G.loadMap('town','north'); G.dbg.place(27, 16, 'up'); });
    await p.waitForTimeout(700); await E(() => { G.dbg.auto = false; }); 
    const sc = E(() => G.dbg.act('gerald')); await p.waitForTimeout(2500); await p.screenshot({ path: OUTDIR + `s_${tag}_yard.png` });
    await E(() => { G.dbg.auto = true; }); await p.keyboard.press('Enter'); await sc; await E(() => G.dbg.idle());
    // road with the caravan, fox crossing
    await E(() => { Object.assign(G.S.flags, { cargoDone:1, gotStrongbox:1, lanternReady:1, pieEaten:1, pieBought:1, metFredrick:1, departed:1, shod:1 }); G.S.q.brushwood = 'active'; G.loadMap('road','north'); G.setParty([{ id:'clover', char:'horse', kind:'horse', name:'Clover', gap:20 }, { id:'wagonF', sprite:'wagon', kind:'sprite', gap:26 }, { id:'aldric', char:'aldric', kind:'human', name:'Aldric', gap:22 }, { id:'ronald', char:'ronald', kind:'human', name:'Ronald', gap:16 }]); G.dbg.place(14, 3, 'down'); G.setParty(G.S.party); });
    await E(() => { G.dbg.keys.down = true; }); await p.waitForTimeout(1200); await E(() => { G.dbg.keys.down = false; }); await p.waitForTimeout(1500);
    await p.screenshot({ path: OUTDIR + `s_${tag}_road.png` });
    // Brushwood
    await E(() => G.dbg.exit('brushwood')); await E(() => G.dbg.idle()); await E(() => G.dbg.place(13, 13, 'up')); await p.waitForTimeout(500);
    await p.screenshot({ path: OUTDIR + `s_${tag}_brush.png` });
    // summary
    await E(() => { G.dbg.auto = false; G.chapterSummary(STORY.summaryHTML(G.S, 1)); }); await p.waitForTimeout(600);
    await p.screenshot({ path: OUTDIR + `s_${tag}_summary.png` });
    console.log(tag, errs.join('\n') || 'no errors'); await ctx.close();
  }
  await b.close();
})();
