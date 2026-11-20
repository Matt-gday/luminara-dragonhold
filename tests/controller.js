// Game controller (Xbox layout): a pretend controller drives the title, a new game, walking, the satchel, tabs, the
// pause menu, tips and dialogue; checks the on-screen wording switches to controller buttons and back to keys.
const { chromium } = require('playwright');
const path = require('path'), { pathToFileURL } = require('url'), fs = require('fs');
const GAME = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const OUTDIR = path.join(__dirname, 'out') + path.sep; fs.mkdirSync(OUTDIR, { recursive: true });
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // a standard-layout controller the page can read through navigator.getGamepads()
  await p.addInitScript(() => {
    const pad = { id: 'Test Xbox Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      buttons: [...Array(17)].map(() => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
    window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null];
  });
  const E = (fn, a) => p.evaluate(fn, a);
  const press = async (name, hold = 90) => { await E(i => { const x = window.__pad.buttons[i]; x.pressed = true; x.value = 1; }, BTN[name]); await p.waitForTimeout(hold); await E(i => { const x = window.__pad.buttons[i]; x.pressed = false; x.value = 0; }, BTN[name]); await p.waitForTimeout(120); };
  const stick = async (x, y, ms) => { await E(([x, y]) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, [x, y]); await p.waitForTimeout(ms); await E(() => { window.__pad.axes[0] = 0; window.__pad.axes[1] = 0; }); await p.waitForTimeout(100); };
  const ok = (cond, what) => { console.log((cond ? 'ok   ' : 'FAIL ') + what); if (!cond) errs.push('FAIL ' + what); };
  const focusText = () => E(() => { const r = document.getElementById('padfocus'); if (r.style.display === 'none') return null; const fr = r.getBoundingClientRect(); const el = document.elementFromPoint(fr.left + fr.width / 2, fr.top + fr.height / 2); return el ? (el.closest('button,.slot,input') || el).textContent.trim().slice(0, 30) : null; });
  try {
    await p.goto(GAME); await p.waitForTimeout(1500);
    await E(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(1200);
    // ---- title screen: any button switches to the controller; A begins, A again accepts the name
    await press('DOWN'); await press('UP');
    ok(await E(() => G.dbg.input) === 'pad', 'pressing a controller button switches to controller mode');
    ok(/Begin/.test(await focusText() || ''), 'title: the highlight starts on "Begin the Story"');
    await p.screenshot({ path: OUTDIR + 'pad_title.png' });
    await E(() => { G.dbg.auto = true; });
    await press('A'); await p.waitForTimeout(300);
    ok(await E(() => !!document.querySelector('.modal .modal-in')), 'title: A opens "Who\'s playing?"');
    await press('A'); await E(() => G.dbg.idle());
    ok(await E(() => G.dbg.mode) === 'play', 'A on "Begin the story" starts the game');
    await E(() => { G.dbg.auto = false; G.S.flags.hasSatchel = 1; G.give('compass', true); G.S.q.morning = 'active'; G.hud(); });
    ok(await E(() => document.querySelector('#bar [data-k=inv] .gp-view') !== null), 'toolbar shows controller buttons (View for the satchel)');
    // ---- walking with the left stick
    const x0 = await E(() => G.dbg.player.x);
    await stick(1, 0, 500);
    ok(await E(() => G.dbg.player.x) > x0 + 10, 'left stick walks Luminara');
    // ---- satchel, tabs, back
    await press('VIEW'); await p.waitForTimeout(150);
    ok(await E(() => document.getElementById('panel').classList.contains('open')), 'View opens the satchel');
    ok(/Choose an item with/.test(await E(() => document.getElementById('panelBody').textContent)), 'satchel text uses controller wording');
    await press('A'); await p.waitForTimeout(150);
    ok(await E(() => !!document.querySelector('#panelBody .slot.sel')), 'A picks the highlighted item in the satchel');
    await p.screenshot({ path: OUTDIR + 'pad_satchel.png' });
    await press('RB');
    ok(await E(() => document.querySelector('#panel header .on').dataset.tab) === 'quest', 'RB moves to the next tab (Quests)');
    await press('LB'); await press('LB');
    ok(await E(() => document.querySelector('#panel header .on').dataset.tab) === 'opts', 'LB moves back, wrapping round to Options');
    ok(/left stick/.test(await E(() => document.getElementById('panelBody').textContent)), 'Options lists the controller layout');
    await p.screenshot({ path: OUTDIR + 'pad_options.png' });
    await press('B');
    ok(await E(() => !document.getElementById('panel').classList.contains('open')), 'B closes the panel');
    // ---- pause menu: move down, back out
    await press('MENU'); await p.waitForTimeout(200);
    ok(await E(() => !!document.querySelector('.modal-bg .modal.stack')), 'Menu pauses the game');
    ok(/Resume/.test(await focusText() || ''), 'pause: the highlight starts on Resume');
    await press('DOWN');
    ok(/Options/.test(await focusText() || ''), 'pause: down moves the highlight to Options');
    ok(await E(() => /Choose/.test(document.getElementById('padhint').textContent)), 'a button guide shows at the bottom');
    await p.screenshot({ path: OUTDIR + 'pad_pause.png' });
    await press('B'); await p.waitForTimeout(150);
    ok(await E(() => !document.querySelector('.modal-bg')), 'B resumes from the pause menu');
    // ---- How to Play from the pause menu, in controller words
    await press('MENU'); await p.waitForTimeout(150); await press('DOWN'); await press('DOWN'); await press('A'); await p.waitForTimeout(200);
    ok(await E(() => /left stick/.test(document.querySelector('.modal').textContent)), 'How to Play is written for the controller');
    await press('A'); await p.waitForTimeout(150);
    // ---- a tip and a hint toast, in controller buttons
    const tipDone = E(() => G.tip('jump'));
    await p.waitForTimeout(250);
    ok(await E(() => !!document.querySelector('.tipbox .gp-x')), 'the jump tip shows the X button');
    await p.screenshot({ path: OUTDIR + 'pad_tip.png' });
    await press('A'); await tipDone;
    ok(await E(() => !document.querySelector('.tipbox')), 'A closes the tip');
    // ---- dialogue: A finishes the line, then continues
    const said = E(() => G.say('luminara', 'Testing, testing.'));
    await p.waitForTimeout(100); await press('A'); await p.waitForTimeout(100);
    ok(await E(() => /continue/.test(document.querySelector('.bubble .more').textContent) && !!document.querySelector('.bubble .more .gp-a')), 'speech bubble says "(A) continue"');
    await press('A'); await said;
    ok(await E(() => !G.dbg.dialog), 'A moves the conversation on');
    // ---- hint wording placeholders
    await E(() => G.toast("Open your satchel, choose the flat rock, {btn:Use…}, then {act:Ronald's wagon}."));
    ok(/choose Use…, then walk up to Ronald's wagon and press A/.test(await E(() => document.querySelector('#toasts').textContent)), 'hint wording for the controller: "choose Use…, then walk up to … and press A"');
    // ---- the green (A) badge over whatever Luminara is facing
    await E(() => { const o = G.M.objects.find(o => o.act && !o.door && o.kind !== 'house'); G.dbg.place(o.x, o.y + o.fh, 'up'); });
    await p.waitForTimeout(300); await p.screenshot({ path: OUTDIR + 'pad_prompt.png' });
    // ---- back to the keyboard
    await p.keyboard.press('KeyM'); await p.keyboard.press('KeyM'); await p.waitForTimeout(100);
    ok(await E(() => G.dbg.input) === 'kb', 'a key press switches back to keyboard wording');
    ok(await E(() => document.querySelector('#bar [data-k=quest] kbd') !== null && document.querySelector('#bar .gp') === null), 'toolbar shows keys again');
    await E(() => G.toast("Then {act:Ronald's wagon}."));
    ok(/click Ronald's wagon/.test(await E(() => document.querySelector('#toasts').textContent)), 'hint wording for the keyboard: "click Ronald\'s wagon"');
  } catch (e) { errs.push('THREW ' + e.stack); }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
