// Every interaction on every map has a handler in the story code.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; p.on('pageerror', e => errs.push('PAGEERROR '+e.message+'\n'+e.stack)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto(GAME); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    const out = []; const ids = MAPS.ids;
    for (const id of ids) {
      let m; try { m = MAPS.get(id); } catch(e) { out.push(id+' BUILD FAIL '+e.message); continue; }
      if (!m) { out.push(id+' missing'); continue; }
      const things = [...m.objects.filter(o=>o.act||o.id), ...m.npcs];
      for (const o of things) if (o.act && !STORY.ACT[o.act]) out.push(`${id}: act '${o.act}' (${o.id}) has no handler`);
      out.push(`${id}: ${m.w}x${m.h} exits=${m.exits.map(e=>`${e.x},${e.y}->${e.to}`).join(' ')} zones=${(m.zones||[]).map(z=>z.id)} npcs=${m.npcs.map(n=>n.id+'@'+n.x+','+n.y).join(' ')}`);
    }
    return out;
  }).catch(e=>['EVAL '+e.message]);
  console.log(r.join('\n')); console.log(errs.join('\n')||'no errors'); await b.close();
})();
