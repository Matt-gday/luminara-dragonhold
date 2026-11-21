// Runs every check in this folder, one after another, and reports which ones found problems.
// Usage: npm test   (or: node tests/run-all.js)
const { spawnSync } = require('child_process'), path = require('path');
const tests = ['audit.js', 'reach.js', 'ch1play.js', 'ch1order.js', 'ending.js', 'ch2play.js', 'shots.js', 'ch2shots.js', 'titlenew.js', 'controller.js', 'ch2wheel.js'];
let bad = 0;
for (const t of tests) {
  process.stdout.write(`\n=== ${t} ===\n`);
  const r = spawnSync(process.execPath, [path.join(__dirname, t)], { encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(out.split('\n').slice(-12).join('\n') + '\n');
  if (r.status !== 0 || /PAGEERROR|THREW|!! cannot reach|UNREACHABLE: (?!exit->forest_bog|exit->null|ronWagon)|no handler/.test(out)) { bad++; console.log(`>>> ${t}: needs a look`); }
}
console.log(bad ? `\n${bad} check(s) need a look (see above). Screenshots and transcript are in tests/out/.` : '\nAll checks passed. Screenshots and the transcript are in tests/out/.');
process.exit(bad ? 1 : 0);
