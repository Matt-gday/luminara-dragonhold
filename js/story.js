// =====================================================================
//  STORY ENGINE — shared by every chapter.
//  Story & world by Lisa (from her book "Luminara the Light-Bearer").
//  Each chapter lives in its own file (js/ch1.js, js/ch2.js, …) and calls STORY.register({...}).
// =====================================================================
const STORY = (() => {
  const F = () => G.S.flags;
  const has = id => G.has(id);

  // ------------------------------------------------------------------ registries (filled by chapters)
  const ITEMS = {}, QUESTS = {}, ACT = {}, USE = {}, COMBOS = {}, GATES = {}, ENTER = {}, ENTRIES = {}, SPEAKERS = {}, SELF = {}, ZONES = {};
  const CHAPTERS = [];
  const LEAVES = [];   // ids of golden leaves placed in the world (for Old Maud's side story)

  function register(ch) {
    Object.assign(ITEMS, ch.items || {}); Object.assign(QUESTS, ch.quests || {});
    Object.assign(ACT, ch.act || {}); Object.assign(USE, ch.use || {}); Object.assign(COMBOS, ch.combos || {});
    Object.assign(GATES, ch.gates || {}); Object.assign(ENTRIES, ch.journal || {}); Object.assign(SPEAKERS, ch.speakers || {});
    Object.assign(SELF, ch.self || {}); Object.assign(ZONES, ch.zones || {});
    for (const [map, fn] of Object.entries(ch.onEnter || {})) (ENTER[map] = ENTER[map] || []).push(fn);
    (ch.leaves || []).forEach(l => LEAVES.push(l));
    CHAPTERS.push(ch); CHAPTERS.sort((a, b) => a.n - b.n);
  }
  const chapter = () => CHAPTERS.find(c => c.n === (G.S && G.S.chapter || 1)) || CHAPTERS[0];

  // ------------------------------------------------------------------ shared helpers for chapter scripts
  const say = (w, t) => G.say(w, t), think = t => G.think(t), nar = (t, o) => G.narrate(t, o);
  const L = t => G.say('luminara', t);
  function journalAdd(key) { if (!G.S.journal.includes(key)) { G.S.journal.push(key); G.notice('New journal entry', 'writ', { kind: 'journal', desc: ENTRIES[key] ? `<i>${ENTRIES[key][0].replace(/\{friend\}/g, G.S.friendName)}</i> · read it in Quests → Journal` : '' }); G.tipLater('journal'); } }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function startQuest(id) { if (!G.S.q[id]) G.questStart(id); }
  function finishQuest(id, xp) { if (G.S.q[id] === 'done') return; if (!G.S.q[id]) G.S.q[id] = 'active'; G.questDone(id, xp); }
  const H = { F, has, say, think, nar, L, journalAdd, pick, startQuest, finishQuest };

  // ------------------------------------------------------------------ interaction router
  async function interact(t, heldItem) {
    if (heldItem) {
      G.setHeld(null);
      const h = USE[t.act];
      if (h && await h(heldItem, t)) return;
      G.sfx('no');
      return think(pick(["That doesn't seem to work.", `I don't think the ${ITEMS[heldItem].name} will help here.`, 'Hmm, no.']));
    }
    if (t.pickup === 'leaf') {
      const id = t.o.leafId; if (G.S.leaves.includes(id)) return;
      G.S.leaves.push(id); G.sfx('pick'); G.refresh();
      G.notice(`Golden Leaf (${G.S.leaves.length} of ${LEAVES.length})`, 'goldLeaf', { kind: 'item' }); G.addXP(5, true);
      if (!G.S.q.leaves) await think('A golden leaf! How lucky. It practically glows.');
      return;
    }
    if (t.enter) return G.go(t.enter[0], t.enter[1]);
    const h = ACT[t.act];
    if (h) return h(t);
    if (t.look) return nar(t.look);
  }
  async function combine(a, b) {
    const key = [a, b].sort().join('+');
    if (COMBOS[key]) return COMBOS[key]();
    G.sfx('no');
    await think(pick(["Those two don't go together.", "Hmm, I can't see how to combine those.", "That won't work."]));
  }
  async function useSelf(id) { if (SELF[id]) return SELF[id](); }
  async function zone(id) { if (ZONES[id]) return ZONES[id](); }
  function gate(name) { const g = GATES[name]; return g ? g() : true; }
  async function onEnter(id) { for (const fn of ENTER[id] || []) await fn(); }
  async function intro() { return chapter().intro(); }
  function onLoad() { const c = chapter(); if (c.onLoad) return c.onLoad(); }
  function onFlash(r) { const c = chapter(); if (c.onFlash) return c.onFlash(r); }
  function particlesFor(id) { const c = chapter(); return c.particlesFor ? c.particlesFor(id) : null; }
  // A chapter marked preview is hidden until a browser opts in with ?preview (so unfinished chapters stay out of Lisa's game).
  const previewOn = () => { try { return localStorage.getItem('luminara_preview') === '1'; } catch (e) { return false; } };
  const ready = c => c && (!c.preview || previewOn());
  // For play-testing: in a browser with preview on, a new game can start at a later chapter, with the chapters before
  // it played along their main story (each chapter's startState). Lisa never sees this.
  const startable = () => previewOn() ? CHAPTERS.filter(c => c.n > 1 && c.startState && ready(c)) : [];
  function startAt(n, s) { const c = startable().find(c => c.n === n); if (!c) return false; c.startState(s); s.chapter = n; return true; }
  function nextChapter(n) { const c = CHAPTERS.find(c => c.n === n + 1); return ready(c) ? c : null; }
  // A save that finished its chapter moves on to the next one, once that chapter is ready.
  function advance(s) { const n = s.chapter || 1; if (s.flags['ch' + n + 'Done'] && nextChapter(n)) s.chapter = n + 1; }
  function musicFor(id) { const c = chapter(); return c.musicFor ? c.musicFor(id) : null; }
  function tintFor(id) { const c = chapter(); return c.tintFor ? c.tintFor(id) : null; }
  function darkFor(id) { const c = chapter(); return c.darkFor ? c.darkFor(id) : null; }
  // how far Luminara may walk up and down a place right now, and what she says at the edge (see game.js updatePlayer)
  function boundsFor(id) { const c = chapter(); return c.boundsFor ? c.boundsFor(id) : null; }

  // ------------------------------------------------------------------ goals & the compass
  // How the places join up (the tile in each map that leads to the next one).
  const LINKS = {
    cottage: { hillside: [6, 9] }, hillside: { cottage: [14, 6], town: [14, 33] },
    town: { hillside: [19, 0], guild: [24, 13], cauldron: [10, 30], road: [12, 41] }, guild: { town: [7, 10] }, cauldron: { town: [7, 10] },
    road: { town: [14, 0], brushwood: [14, 43] }, brushwood: { road: [16, 0] },
  };
  function route(from, to) {
    if (from === to) return null;
    const prev = { [from]: null }, q = [from];
    while (q.length) { const m = q.shift(); for (const n in LINKS[m] || {}) if (!(n in prev)) { prev[n] = m; q.push(n); } }
    if (!(to in prev)) return null;
    let n = to; while (prev[n] !== from) n = prev[n];
    return n;
  }
  function goal() { return chapter().goal(); }
  function objective() { return goal()[0]; }
  function compass(mapId) {
    const g = goal(); if (!g[1]) return null;
    if (g[1] === mapId) return { x: g[2], y: g[3] };
    const next = route(mapId, g[1]); if (!next) return null;
    const [x, y] = LINKS[mapId][next]; return { x, y };
  }

  // ------------------------------------------------------------------ journal
  function journal(s) {
    const fr = t => t.replace(/\{friend\}/g, s.friendName);
    let h = '<h4>Memories & Discoveries</h4>';
    const keys = s.journal.filter(k => ENTRIES[k]);
    if (!keys.length) h += '<p>Nothing written yet.</p>';
    for (const k of keys) h += `<p><b>${fr(ENTRIES[k][0])}</b><br>${fr(ENTRIES[k][1])}</p>`;
    const cr = []; for (const c of CHAPTERS) if (c.creatures) cr.push(...c.creatures(s));
    h += '<h4>Creatures</h4>' + (cr.length ? cr.map(c => `<p>${c}</p>`).join('') : '<p>None yet.</p>');
    h += `<h4>Golden leaves</h4><p>${s.leaves.length} of ${LEAVES.length} found.</p>`;
    return h;
  }

  // ------------------------------------------------------------------ chapter summary (main path + side stories)
  function summaryHTML(s, n) {
    const c = CHAPTERS.find(c => c.n === (n || s.chapter || 1)) || chapter();
    const fr = t => (typeof t === 'function' ? t(s) : t).replace(/\{friend\}/g, s.friendName);
    const sides = c.sideStories || [];
    const done = sides.filter(d => d.done(s)).length;
    const mins = Math.max(1, Math.round((s.time || 0) / 60));
    let h = `<div class="sum"><h4 class="smain">The Story <span>main path · completed</span></h4><ul>`;
    for (const [t, b] of c.mainBeats || []) h += `<li class="ok">✓ <b>${fr(t)}</b> — ${fr(b)}</li>`;
    h += `</ul><h4 class="sside">Side Stories <span>optional · ${done} of ${sides.length} found</span></h4><ul>`;
    for (const d of sides) {
      if (d.done(s)) h += `<li class="ok">✓ <b>${d.title}</b> — ${fr(d.yes)}</li>`;
      else h += `<li class="no">✗ <b>${d.title}</b> — ${fr(d.no)} <span class="miss">Missed: ${d.miss}</span></li>`;
    }
    h += `</ul><h4>Your Journey</h4><p>Level ${s.lvl} · ${s.xp} experience · ${s.leaves.length} of ${LEAVES.length} golden leaves · ${s.coins} copper · played ${mins} min</p>`;
    h += done < sides.length ? `<p class="dim">Want to find what you missed? Start a new game in another save slot from <b>Players &amp; Saves</b>.</p>` : `<p class="dim">Every side story found. What a true Light-Bearer!</p>`;
    return h + '</div>';
  }

  function caravan() { const c = chapter(); return c.caravan ? c.caravan() : null; }
  function partyFor(id) { const c = chapter(); return c.partyFor ? c.partyFor(id) : null; }

  return {
    register, H, ITEMS, QUESTS, SPEAKERS, CHAPTERS, LINKS, ACT, USE,
    get TOTAL_LEAVES() { return LEAVES.length; },
    get chapterInfo() { return chapter(); },
    intro, interact, combine, useSelf, zone, gate, onEnter, onLoad, onFlash, particlesFor, nextChapter, advance, objective, compass, journal, summaryHTML, musicFor, tintFor, darkFor, boundsFor, caravan, partyFor, startable, startAt,
  };
})();
