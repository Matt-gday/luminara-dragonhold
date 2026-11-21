// =====================================================================
//  CHAPTER TWO — "The Dark Forest"
//  From Lisa's book, chapters 3 (The Dark Forest), 4 (Lesterfield), 5 (The Inn) and 6 (The Book).
//  Built in stages; marked `preview` until finished, so it only appears with ?preview.
//  Stage 1: the Dark Forest (book chapter 3). See docs/chapter-2-plan.md.
// =====================================================================
(() => {
  const { F, has, say, think, nar, L, journalAdd, pick, startQuest, finishQuest } = STORY.H;

  const ITEMS = {
    flatRock: { name: 'Flat Rock', icon: 'flatRock', desc: 'A flat, heavy stone. Sturdy enough to hold something up.' },
    lanternLit: { name: 'Golden Lantern (lit)', icon: 'lanternLit', desc: 'Your lantern, burning steady behind its glass. Raise it high to light up the darkness further.' },
  };

  const QUESTS = {
    darkforest: { title: 'The Dark Forest', desc: 'Lead the caravan safely through the Dark Forest to Lesterfield.', xp: 40, steps: [
      { t: 'Help Ronald with his loose wheel', done: s => s.flags.wheelFixed, hint: ['See the quest <b>A Loose Wheel</b>, and ask for a hint there.'] },
      { t: 'Light your lantern', done: s => s.flags.lanternLit, hint: ['It is getting dark, and you have everything you need in your satchel.', `Open your satchel, choose your flint and steel, {btn:Combine…}, then choose your lantern.`] },
      { t: 'Find the way through the mist', done: s => s.flags.trailFound, hint: ['The path vanishes into thick mist. What could cut through it?', `Stand by the old waymarker stone at the edge of the mist and {press:light} to hold your lantern high.`] },
      { t: 'Reach Lesterfield', done: s => s.flags.reachedLesterfield, hint: ['Keep following the path south.', 'Follow the glowing trail through the bog, all the way to the bottom of the map.'] },
    ] },
    wheel: { title: 'A Loose Wheel', parent: 'darkforest', desc: "Ronald's old wagon has a loose wheel. He needs the barrels off the back to mend it.", giver: 'Ronald', xp: 25, steps: [
      { t: "Take the barrels off Ronald's wagon", done: s => s.flags.barrelsOff, hint: ["The barrels are on the back of Ronald's wagon.", "{Act:Ronald's wagon}."] },
      { t: 'Find something to prop up the wagon', done: s => s.flags.gotFlatRock || s.flags.rockPlaced, hint: ['Ronald needs something flat and sturdy. Round things roll.', "There is a flat rock just off the path, up near Ronald's wagon on the right, peeking out from behind a pine."] },
      { t: 'Prop up the wagon', done: s => s.flags.rockPlaced, hint: ['Put it under the wagon.', `Open your satchel, choose the flat rock, {btn:Use…}, then {act:Ronald's wagon}.`] },
      { t: 'Load the barrels back on', done: s => s.flags.barrelsBack, hint: ['The wheel is mended.', "{Act:Ronald's wagon} again."] },
    ] },
    lumina: { title: 'The Lumina', side: true, desc: 'A lumina, a little living light, is floating near the path. Nobody has ever caught one.', xp: 20, steps: [
      { t: 'Try to catch the lumina', done: s => s.flags.wispFaded && s.flags.wispTries >= 3, hint: ['It is floating just off the path.', 'Walk up to the glowing light and try to take hold of it, more than once.'] },
    ] },
    owls: { title: 'The Owls', side: true, desc: 'A rare kind of owl, perched with its mate, staring back at you.', xp: 15, steps: [
      { t: 'Watch the owls', done: s => s.flags.owlsWatched, hint: ['Something is watching from the trees.', 'Two owls are perched on a dead tree on the left side of the misty forest.'] },
    ] },
  };

  const ACT = {}, USE = {}, SELF = {};

  // ---- the caravan: Luminara drives her own wagon; Aldric and Ronald drive theirs behind her
  function party() {
    const f = F();
    return [
      { kind: 'drive', id: f.shod ? 'clover' : 'biscuit', char: f.shod ? 'horse' : 'horseCream', name: f.shod ? 'Clover' : 'Biscuit' },
      { id: 'aldric', kind: 'rig', char: 'horseDark', driver: 'aldric', name: 'Aldric', color: '#4a7a9a', gap: 90 },
      { id: 'ronald', kind: 'rig', char: 'horseGrey', driver: 'ronald', name: 'Ronald', color: '#7a5a3a', gap: 90 },
    ];
  }

  // ================================================================ STARTING THE CHAPTER
  async function begin() {
    const f = F(); f.ch2Started = true;
    G.loadMap('forest_path', 'north'); G.setParty(party()); G.music('forest');
  }
  async function forestIntro() {
    const f = F();
    await nar('Luminara the Light-Bearer\n— Chapter Two —\nThe Dark Forest', { big: true });
    await nar('Tall black spruce trees enclosed the travellers as they journeyed through the Dark Forest. There was a faint smell of damp moss in the crisp cold air. A mist emerged, and a chill breeze swept across their path.');
    await nar('The three wagons trundled over the uneven ground as the rocky path gradually gave way to dark, damp soil. The conditions were ideal for moss and white mushrooms to grow, but made the path slippery for the horses.');
    f.ch2Intro = true;
    startQuest('darkforest');
  }

  // ================================================================ RONALD'S WHEEL
  async function wheelStop() {
    const f = F(); if (f.wheelStopped) return;
    f.wheelStopped = true;
    await say('ronald', 'Stop!');
    await nar('Luminara reined her horse to a halt and turned around.');
    // she climbs down from her wagon; the three wagons stand in a line on the path
    await G.fade(true, 450); G.setParty([]); G.loadMap('forest_path', 'wheel'); await G.wait(150); await G.fade(false, 450);
    await L('What is the matter?');
    await say('ronald', 'My right wheel is loose.');
    await nar('His wagon was old and had broken down many times before.');
    await say('ronald', 'Come and help me with the wheel. I need the barrels off the back of my wagon.');
    startQuest('wheel');
  }
  ACT.ronWagon = async () => {
    const f = F();
    if (!f.barrelsOff) {
      await G.fade(true, 350); G.sfx('door'); f.barrelsOff = true; G.refresh(); await G.wait(300); await G.fade(false, 350);
      await nar('Ronald, Aldric and Luminara all helped move the barrels off the wagon, so Ronald could repair it.');
      await say('aldric', "At least it's not as though the wheel has come off, Ron.");
      await say('ronald', 'Hmph. I need something flat and sturdy under the axle, to hold her up while I work.');
      return;
    }
    if (!f.rockPlaced) return has('flatRock') ? think("The flat rock would hold the wagon up. I should use it here.") : say('ronald', 'Something flat and sturdy, under the axle. A round stone would roll right out.');
    if (!f.barrelsBack) return loadBarrels();
  };
  USE.ronWagon = async (item) => { if (item !== 'flatRock') return false; await propWagon(); return true; };
  USE.ronaldF = USE.ronWagon;
  async function propWagon() {
    const f = F();
    if (!f.barrelsOff) { await say('ronald', "Barrels off first, or we'll never lift her."); return; }
    if (f.rockPlaced) return;
    G.take('flatRock'); f.rockPlaced = true; G.refresh(); G.sfx('land');
    await nar('Luminara wedged the flat rock under the axle, and the wagon held steady.');
    await nar('Aldric and Luminara offered help to repair the wheel.');
    for (let i = 0; i < 3; i++) { G.sfx('hammer'); await G.wait(260); }
    await say('ronald', "There. Good as new. Well, good as old. Now let's get those barrels back on.");
  }
  async function loadBarrels() {
    const f = F();
    await G.fade(true, 350); G.sfx('door'); f.barrelsBack = true; G.refresh(); await G.wait(300); await G.fade(false, 350);
    await nar('Once they finished repairing the wheel, they lifted the barrels onto the wagon once again and returned to their own wagons.');
    // back up onto her wagon, at the front of the line
    await G.fade(true, 400); f.wheelFixed = true; G.loadMap('forest_path', 'drive'); G.setParty(party()); await G.wait(150); await G.fade(false, 400);
    await L("Why don't we stay in Lesterfield tonight?");
    await nar('Aldric and Ronald nodded.');
    finishQuest('wheel');
    // the clouds come in
    f.clouds = true;
    await nar('As dark clouds began to form overhead, they blocked the sunlight from reaching the forest floor, making it appear to be later in the day than it actually was.');
    await think("It's getting dark. It would be a good idea to light my lantern.");
  }
  ACT.ronaldF = async () => {
    const f = F();
    if (!f.barrelsOff) return say('ronald', 'The barrels need to come off the back first. Give us a hand?');
    if (!f.rockPlaced) return say('ronald', 'Something flat and sturdy, under the axle. A round stone would roll right out.');
    return say('ronald', "Wheel's mended. Just the barrels to go back on.");
  };
  ACT.aldricF = async () => {
    const f = F();
    if (!f.rockPlaced) return say('aldric', pick(["Ron's wagon is older than the both of us put together.", "At least it's not as though the wheel has come off."]));
    return say('aldric', "Nearly there. Lesterfield before dark, I'd say.");
  };
  // the other two wagons, waiting on the path while the wheel is mended
  ACT.myWagon = async () => {
    const name = F().shod ? 'Clover' : 'Biscuit';
    await think(`My wagon. ${name} is resting in the harness. We'll be on our way again once Ronald's wheel is mended.`);
  };
  ACT.aldWagon = async () => nar("Aldric's wagon. Juniper, his dark bay, flicks an ear and waits patiently in the harness.");
  USE.myWagon = USE.aldWagon = async (item) => { if (item !== 'flatRock') return false; await think("It's Ronald's wagon that needs propping up, not this one."); return true; };
  ACT.flatRock = async () => {
    F().gotFlatRock = true; G.give('flatRock'); G.refresh();
    await think('A flat, heavy stone. Sturdy, too.');
  };

  // ================================================================ LIGHTING THE LANTERN
  async function lightLantern() {
    const f = F();
    if (f.lanternLit) return think('My lantern is already burning bright.');
    if (!f.clouds) return think("It's still light enough to see. I'll save the tallow for when it gets dark.");
    await nar('She picked up her flint and steel and began to start a small fire.');
    await G.flintGame();
    f.lanternLit = true; G.take('lanternReady'); G.give('lanternLit', true); G.hud();
    G.notice('Your lantern is <b>lit</b>', 'lanternLit', { kind: 'item', desc: ITEMS.lanternLit.desc });
    await nar('Using the burning tinder, she lit her lantern. She closed the glass door and snuffed out the fire from the tinder with moist dirt from the ground.');
    await nar('Along with her lantern, she also carried her compass and a map, which she used frequently on her trips. Once she was confident that she was travelling in the right south-west direction towards Lesterfield, she placed both the map and the compass back into her satchel.');
    G.addXP(10);
    await G.tip('light');
  }
  const COMBOS = { 'flint+lanternReady': lightLantern };
  SELF.lanternReady = lightLantern;
  SELF.lanternLit = () => nar('The flame burns steady behind the glass. {Press:light} to hold it high.');

  // ================================================================ THE LUMINA
  const WISP_SPOTS = [[20, 33], [8, 35], [19, 38]];
  function spawnWisp(x, y) {
    if (G.npc('lumina')) return G.npc('lumina');
    const n = G.addNPC({ id: 'lumina', char: 'wisp', x, y, dir: 'down', name: 'Lumina', act: 'lumina', voice: 2 });
    n.glow = 34; n.glowC = '160,255,170'; n.speed = 36; return n;
  }
  async function wispAppears() {
    const f = F(); if (f.wispSeen) return; f.wispSeen = true;
    spawnWisp(3, 31); G.walk('lumina', 18, 32, 30);
    await nar('On her way, Luminara recognised what appeared to be a small, living, glowing green light moving across her path. It was no larger than a grapefruit. Its motion changed from bobbing up and down to swiftly surging forward.');
    await nar('She had seen these creatures before. She always called them light wisps, or by their formal name, Lumina, which was the origin of her name.');
    await nar('The lumina were seen on very rare occasions by Luminara. Many times she had tried to catch one and discover what they truly were. They seemed to be enchanted. *Perhaps it is a wandering spirit,* Luminara wondered. But she could never know for sure, as nobody had ever been able to take hold of one to study it.');
    journalAdd('lumina');
    startQuest('lumina');
  }
  ACT.lumina = async () => {
    const f = F(); f.wispTries = (f.wispTries || 0) + 1;
    const [x, y] = WISP_SPOTS[(f.wispTries - 1) % WISP_SPOTS.length];
    G.sfx('magic'); G.walk('lumina', x, y, 95);
    if (f.wispTries === 1) return think('Almost…!');
    if (f.wispTries === 2) return think('It slipped right through my fingers!');
    await think("It's no use. Nobody has ever been able to take hold of one.");
    await wispFades();
    finishQuest('lumina');
  };
  async function wispFades() {
    const f = F(), n = G.npc('lumina'); if (f.wispFaded) return; f.wispFaded = true;
    if (n) { n.fade = 1; for (let i = 0; i < 20; i++) { n.fade -= 0.05; await G.wait(60); } G.removeNPC('lumina'); }
    await nar("The wisp began to fade away, leaving her and the crew travelling through the misty forest with only her lantern's light.");
  }

  // ================================================================ THE MISTY BOG
  async function bogArrive() {
    const f = F();
    if (f.wispSeen && !f.wispFaded) { f.wispFaded = true; await nar("The wisp began to fade away, leaving her and the crew travelling through the misty forest with only her lantern's light."); }
    if (f.bogIntro) return;
    f.bogIntro = true;
    await nar('It was about an hour into the journey when they took a turn from the path. A gentle pitter-patter of rain could be heard against the roofs of the wagons.');
    await nar('As the rain began at a slow pace, the ground became boggier, forcing Luminara and the crew to slow down. The companions continued along the muddy ground together.');
    await nar('The whispering sounds of the woods grew louder and louder, until they could hear the songbirds and woodland animals chattering in the light rain.');
  }
  ACT.owls = async () => {
    const f = F();
    if (f.owlsWatched) return nar(pick(['The owls blink slowly, side by side.', 'One owl ruffles its feathers against the rain. Its mate does not move at all.']));
    G.sfx('hoot');
    await nar('Luminara looked up in the trees and spotted a rare kind of owl. It was perched upon a tree branch with its mate, and staring back at Luminara.');
    await think('*What are the owls thinking? It would be such a great experience to be able to fly like a bird.*');
    const c = await G.choice('luminara', '*She watches them for a while…*', ['Imagine flying like a bird', 'Leave them in peace']);
    if (c === 0) {
      await G.fade(true, 600); G.music('wonder');
      await nar('For a moment, Luminara imagined spreading her arms like wings, rising over the black spruce, through the rain and into the clouds…');
      await G.fade(false, 400);
      await G.flapMini(4, { label: `Beat your wings: {press:jump} when the ring turns <b style="color:#ffd860">gold</b>.`, icon: '🪶', msgs: ['Higher!', 'Over the treetops!', 'Into the clouds!', 'Flying!'] });
      await G.fade(true, 500); G.music('forest'); await G.fade(false, 500);
      await think('Someday, perhaps.');
    }
    f.owlsWatched = true; journalAdd('owls'); finishQuest('owls');
  };
  ACT.marker = async () => {
    const f = F();
    if (f.trailFound) return nar('The old waymarker, green with moss. Beyond it, small stones glow faintly along the trail.');
    await nar('An old waymarker stone, green with moss. Beyond it, the mist is as thick as wool.');
    if (!f.markerSeen) { f.markerSeen = true; await think("I can't see the path at all. Even my lantern only reaches a little way into it."); }
  };
  // Raising the lantern near the waymarker burns the mist back and shows the trail (further away with the sunstone).
  async function onFlash(r) {
    const f = F();
    if (G.M.id !== 'forest_bog' || f.trailFound) return;
    const mk = { x: 12 * 16 + 8, y: 18 * 16 };
    if (Math.hypot(G.player.x - mk.x, G.player.y - mk.y) > r + 24) return;
    f.trailFound = true; G.sfx('magic');
    for (let i = 0; i < 30; i++) G.particles({ kind: 'smoke', x: 16 + Math.random() * 448, y: 320 + Math.random() * 60, vx: (Math.random() - 0.5) * 20, vy: -6, r: 3 + Math.random() * 4, t: 1.5 + Math.random() });
    G.refresh();
    await nar("Luminara held her lantern high. The light spread out across the mist, and the mist drew back from it, curling away between the trees. Small stones glowed faintly along a hidden trail.");
    G.addXP(15);
    await nar('Luminara also wondered about the rumours of the gateway in the Dark Forest. Perhaps during their journey they might spot it, but the odds were quite slim, since they were only travelling through the shortest route in the Dark Forest.');
  }

  // ================================================================ "AWOOOO…" AND THE UPRIGHT DEER
  async function awoo() {
    const f = F(); if (f.deerSeen) return; f.deerSeen = true;
    G.sfx('snort');
    await nar("They were headed to Lesterfield, which was now only half an hour away. Luminara's horse snorted and huffed. It had obviously heard the strange noises coming from the north-west. The sound resembled a mournful cry.");
    G.sfx('howl');
    await nar('"Awooooo…"', { big: true });
    await nar('The cry echoed through the trees. The sound was muffled, as it was off in the distance. Luminara was uncertain about the type of creature making the unusual sound.');
    const d = G.addNPC({ id: 'deer', char: 'deerUpright', x: 2, y: 25, dir: 'left', name: '?', voice: 0.4 }); d.speed = 10;
    await G.camTo(d.x + 40, d.y - 20);
    await nar('There was a faint silhouette of a deer in the distance. It appeared to be standing on its hind legs, walking upright.');
    G.walk('deer', 0, 22, 10);
    await G.wait(1200);
    await nar('Luminara knew the sound could not have come from a deer, but what this creature could have been, she did not know.');
    for (let i = 0; i < 16; i++) { d.fade = 0.9 - i * 0.06; await G.wait(70); }
    G.removeNPC('deer');
    await G.camTo(null);
    await nar('She continued on her way through the forest, while keeping a sharp eye out for danger.');
    journalAdd('deer');
  }
  async function sunShower() {
    const f = F(); if (f.sunShower) return; f.sunShower = true;
    await nar('Time passed slowly for the travellers as they continued through the damp forest. Luminara glanced back to see the other two travellers still with her. It was only a short trip to Lesterfield, and there was no sign of any strange creatures in the bushes, which was a relief.');
    await nar('There was a shimmer of light beaming down from between the trees. Luminara looked up and saw the sun breaking through the clouds. Although it was still spitting with rain, a sun shower was better than pouring rain.');
    await nar('She was very pleased they were nearing Lesterfield, as she could see the opening through the trees ahead.');
  }

  // ================================================================ GATES, ARRIVALS, GOALS
  const GATES = {
    toBog: () => F().lanternLit ? true : "It's getting too dark to see the path. I should light my lantern first.",
    toLesterfield: () => {
      if (!F().sunShower) return 'The trail goes on through the trees.';
      F().reachedLesterfield = true;
      return 'Lesterfield lies just beyond the trees. (The rest of Chapter Two is still being written!)';
    },
  };
  const onEnter = {
    forest_path: async () => {
      const f = F();
      if ((f.wheelFixed || !f.wheelStopped) && !(G.S.party && G.S.party.length)) G.setParty(party());
      if (f.wheelStopped && !f.wheelFixed && G.S.party && G.S.party.length) G.setParty([]);  // the wagons are stopped: she's on foot
      if (!f.ch2Intro) await forestIntro();
      if (f.wispSeen && !f.wispFaded) { const [x, y] = WISP_SPOTS[((f.wispTries || 0) + WISP_SPOTS.length - 1) % WISP_SPOTS.length]; spawnWisp(x, y); }
    },
    forest_bog: async () => { if (!(G.S.party && G.S.party.length)) G.setParty(party()); await bogArrive(); },
  };
  async function mistEdge() { if (!F().trailFound) await think("The mist is too thick. I can't see where the path goes from here."); }
  const ZONES = { wheelStop, luminaWisp: wispAppears, awoo, sunShower, mistEdge };

  function goal() {
    const f = F();
    if (!f.wheelStopped) return ['Lead the caravan into the Dark Forest', 'forest_path', 14, 9];
    if (!f.wheelFixed) {
      if (!f.barrelsOff) return ["Help Ronald: take the barrels off his wagon", 'forest_path', 14, 4];
      if (!f.rockPlaced) return has('flatRock') ? ["Prop up Ronald's wagon", 'forest_path', 14, 4] : ["Find something to prop up Ronald's wagon", null];
      return ["Load the barrels back onto Ronald's wagon", 'forest_path', 14, 4];
    }
    if (!f.lanternLit) return ['Light your lantern', null];
    if (!f.bogIntro) return ['Follow the path south through the Dark Forest', 'forest_path', 14, 47];
    if (!f.trailFound) return ['Find the way through the mist', 'forest_bog', 12, 18];
    if (!f.reachedLesterfield) return ['Follow the trail to Lesterfield', 'forest_bog', 15, 43];
    return ['Chapter Two continues soon…', null];
  }

  Object.assign(STORY.LINKS, { forest_path: { forest_bog: [14, 47] }, forest_bog: { forest_path: [14, 0] } });

  STORY.register({
    n: 2, title: 'The Dark Forest', subtitle: 'Chapter Two · The Dark Forest', preview: true,
    items: ITEMS, quests: QUESTS, act: ACT, use: USE, combos: COMBOS, gates: GATES, onEnter, self: SELF, zones: ZONES, caravan: party,
    intro: async () => { }, goal, onFlash,
    onLoad: async () => { if (!F().ch2Started) await begin(); },
    // Starting here for a play-test: Chapter One finished along its main story (no side stories), as if just left Brushwood.
    startState: s => {
      Object.assign(s.flags, { hasSatchel: 1, teaMade: 1, teaDrunk: 1, cloak: 1, gotCompass: 1, hasLantern: 1, gotRations: 1, arrivedTown: 1,
        metFredrick: 1, metCrew: 1, cargoDone: 1, gotStrongbox: 1, lanternReady: 1, departed: 1, atBrushwood: 1, horsesDone: 1, lastBarrel: 1,
        pouchFilled: 1, paid: 1, ateRations: 1, ch1Done: 1 });
      for (const k of ['move', 'goal', 'quests', 'menu', 'satchel', 'xp', 'coins', 'journal', 'hint', 'combine', 'use', 'compass', 'hearts']) s.flags['tip_' + k] = 1;
      s.inv = ['compass', 'flint', 'strongbox', 'guildKey', 'lanternReady'];
      s.q = { morning: 'done', totown: 'done', journey: 'done', lantern: 'done', brushwood: 'done' };
      s.journal = ['father', 'mother', 'song', 'strongbox'];
      Object.assign(s, { xp: 200, lvl: 4, hearts: 6, maxHearts: 6, light: 6, maxLight: 6, coins: 16, chapterDone: 1, map: 'brushwood' });
      s.met = Object.assign(s.met || {}, { Aldric: 1, Ronald: 1, Gerald: 1, Fredrick: 1, Kalen: 1, Winston: 1 });
    },
    musicFor: id => (id === 'forest_path' || id === 'forest_bog') ? 'forest' : null,
    tintFor: id => id === 'forest_bog' && F().sunShower ? 'gold' : null,
    // While Ronald's wagon is broken, the screen around the wagons is the whole area: walking off its top or bottom edge
    // gets a line from Luminara instead of an invisible wall. The top of the path always says why it's closed.
    boundsFor: id => {
      if (id !== 'forest_path') return null;
      const f = F();
      if (f.wheelStopped && !f.wheelFixed) return { view: 1.5,
        up: "Brushwood is back the way we came. Let's mend Ronald's wheel and carry on to Lesterfield.",
        down: "I can't go on without the others. Ronald's wheel needs mending first." };
      return { top: 1.6, up: "Brushwood is back the way we came. We're bound for Lesterfield." };
    },
    darkFor: id => id === 'forest_path' ? (F().clouds ? 0.6 : 0.3) : id === 'forest_bog' ? (F().sunShower ? 0.25 : 0.6) : null,
    particlesFor: id => id === 'forest_bog' ? (F().sunShower ? 'drizzle' : 'rain') : null,
    journal: {
      lumina: ['The Lumina', 'A small, living, glowing green light, no larger than a grapefruit. I call them light wisps, or by their formal name, Lumina: the origin of my name. Nobody has ever been able to take hold of one.'],
      owls: ['The Owls', 'A rare kind of owl, perched with its mate in the Dark Forest, staring back at me. What are they thinking? It would be such a great experience to fly like a bird.'],
      deer: ['The Upright Deer', 'A mournful cry, "Awooooo…", from the north-west, and the faint silhouette of a deer standing on its hind legs, walking upright. It could not have made that sound. What was it?'],
    },
    creatures: s => [
      ...(s.flags.wispSeen ? ['<b>Lumina</b> — a little living light. Nobody has ever caught one.'] : []),
      ...(s.flags.owlsWatched ? ['<b>Owls</b> — a rare kind, always in pairs.'] : []),
      ...(s.flags.deerSeen ? ['<b>???</b> — a deer that walks upright. Not from around here.'] : []),
    ],
    mainBeats: [
      ['The Dark Forest', "Ronald's loose wheel, the lantern lit with flint and steel, a glimpse of the lumina, and a trail found through the mist."],
    ],
    sideStories: [
      { title: 'The Lumina', done: s => s.flags.wispTries >= 3, yes: 'Luminara tried to catch the lumina, as she always had. It slipped away, as it always did.', no: 'The lumina drifted away before Luminara could try to catch it.', miss: 'a journal memory and 20 experience' },
      { title: 'The Owls', done: s => s.flags.owlsWatched, yes: 'She watched the rare owls, and for a moment imagined flying like a bird.', no: 'The rare owls watched the caravan pass by, unnoticed.', miss: 'a journal memory and 15 experience' },
    ],
  });
})();
