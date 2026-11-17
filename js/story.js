// =====================================================================
//  STORY — quests, items, conversations and puzzles for Chapter One.
//  Story & world by Lisa. Lines from her chapters are used wherever possible.
// =====================================================================
const STORY = (() => {
  const F = () => G.S.flags;
  const has = id => G.has(id);

  // ------------------------------------------------------------------ ITEMS
  const ITEMS = {
    teaTin: { name: 'Tin of Green Tea', icon: 'teaTin', desc: 'Floral green tea leaves. Lovely — but even lovelier sweetened.' },
    sugar: { name: 'Sugar Pot', icon: 'sugar', desc: 'A little pot of sugar.' },
    teaBlend: { name: 'Sweet Tea Blend', icon: 'teaBlend', desc: 'Green tea leaves mixed with sugar. Now it just needs hot water from the stove.' },
    teaCup: { name: 'Cup of Green Tea', icon: 'teaCup', desc: 'Hot green tea with a floral scent, sweetened with sugar. Best enjoyed outside, watching the sunrise.', self: true, selfLabel: 'Sip' },
    brassKey: { name: 'Little Brass Key', icon: 'brassKey', desc: 'The key to your safekeeping box.' },
    compass: { name: "Father's Compass", icon: 'compass', desc: 'A special gift from your father before he left for war. It always helps you keep track of your direction. (It now shows your next goal in the corner of the screen.)', self: true, selfLabel: 'Hold it close' },
    lantern: { name: 'Golden Lantern', icon: 'lanternDim', desc: 'Your golden lantern. The oil is very low — its light is only a flicker.' },
    lanternBright: { name: 'Golden Lantern (full)', icon: 'lantern', desc: 'Full of oil and glowing bright. Raise it high with Q to scare away creatures of the dark.' },
    pie: { name: 'Beef & Pepper Pie', icon: 'pie', desc: 'Slow-cooked beef and pepper — your favourite. Hot and spicy! Best eaten sitting down.', self: true, selfLabel: 'Eat' },
    luteString: { name: 'Old Lute String', icon: 'luteString', desc: "A snapped string from Fredrick's lute. Long and very strong." },
    bentNail: { name: 'Bent Nail', icon: 'bentNail', desc: 'An old horseshoe nail, bent into a curl. It looks a bit like a hook…' },
    hookLine: { name: 'Hook and Line', icon: 'hookLine', desc: 'A lute string tied to a bent nail. Perfect for fishing things out of water!' },
    horseshoe: { name: "Clover's Horseshoe", icon: 'horseshoe', desc: 'Dripping wet, but it will fit Clover perfectly.' },
    writ: { name: 'Trade Writ', icon: 'writ', desc: "The guild's list of goods bound for Lesterfield. It needs Lord Aldermere's seal." },
    sealedWrit: { name: 'Sealed Trade Writ', icon: 'sealedWrit', desc: "Stamped with Lord Aldermere's red wax seal. Take it to Guildmaster Hollis." },
    nectarines: { name: 'Basket of Nectarines', icon: 'nectarines', desc: "Marigold's finest, picked this morning." },
    pepper: { name: 'Pouch of Pepper', icon: 'pepper', desc: 'Precious pepper from the far south. Mistress Pell will know what to do with it.' },
    lordPie: { name: "His Lordship's Pie", icon: 'lordPie', desc: "A golden beef and pepper pie, baked specially for Lord Aldermere." },
    oil: { name: 'Flask of Lamp Oil', icon: 'oil', desc: 'Good lamp oil from the Iron Cauldron. Combine it with your lantern.' },
    bread: { name: 'Fresh Loaf', icon: 'bread', desc: '"You never know who might be hungry out there." — {friend}' },
    feather: { name: 'Owl Feather', icon: 'feather', desc: "A soft feather from Old Hoots. Your lantern seems to shine a little further while you carry it." },
    thimble: { name: "Mother's Silver Thimble", icon: 'thimble', desc: "Mother's silver thimble, left at Old Maud's window long ago. Carrying it gives you courage: +1 heart.", self: true, selfLabel: 'Hold it close' },
    honeyCake: { name: 'Honey Cake', icon: 'honeyCake', desc: 'A sticky honey cake from Mistress Pell. Eating it restores all your hearts.', self: true, selfLabel: 'Eat' },
    sunstone: { name: 'Sunstone Charm', icon: 'sunstone', desc: "A warm golden stone from the far south. Your raised lantern shines further, and its light comes back faster.", self: true, selfLabel: 'Hold it up' },
    ball: { name: "Children's Ball", icon: 'ball', desc: "Pip and Nell's ball. It's a bit scuffed from the tree." },
  };

  // ------------------------------------------------------------------ QUESTS
  const allMorning = s => s.flags.cloak && s.flags.hasSatchel && s.flags.gotCompass && s.flags.hasLantern && s.flags.teaDrunk;
  const QUESTS = {
    morning: { title: 'A New Dawn', desc: 'Get ready for the day ahead.', xp: 15, steps: [
      { t: 'Find your satchel', done: s => s.flags.hasSatchel },
      { t: 'Put on the blue cloak Mother made', done: s => s.flags.cloak },
      { t: "Take Father's compass from the safekeeping box", done: s => s.flags.gotCompass },
      { t: 'Pick up your lantern', done: s => s.flags.hasLantern },
      { t: 'Make a cup of sweet green tea', done: s => s.flags.teaMade },
      { t: 'Drink it outside while the sun rises', done: s => s.flags.teaDrunk },
    ] },
    totown: { title: 'Into Kraxenville', desc: 'Walk into town and visit the guild.', xp: 15, steps: [
      { t: 'Walk the leafy lane to Kraxenville', done: s => s.flags.arrivedTown },
      { t: "Visit the Merchants' Guild", done: s => s.flags.metHollis },
    ] },
    pie: { title: 'A Hot Pie & a Daydream', side: true, desc: "Luminara's tummy is rumbling after the long walk.", xp: 10, steps: [
      { t: 'Buy a beef and pepper pie at the Cookshop (south of the market)', done: s => s.flags.pieBought },
      { t: 'Eat it on the bench by the fountain', done: s => s.flags.pieEaten },
    ] },
    lightbearer: { title: 'The Light-Bearer', desc: 'Guide the guild caravan to Lesterfield, safely through the Dark Forest.', giver: 'Guildmaster Hollis', xp: 40, steps: [
      { t: 'Prepare the caravan (three tasks)', done: s => s.flags.caravanReady },
      { t: 'Meet Tobias and the wagon at the West Gate', done: s => s.flags.caravanLeft },
      { t: 'Find a way past the glowing vines', done: s => s.flags.vinesGone },
    ] },
    horseshoe: { parent: 'lightbearer', title: 'A Shoe for Clover', desc: 'Clover the cart-horse has thrown a shoe.', giver: 'Bertram', xp: 25, steps: [
      { t: 'Talk to Bertram at the Coach House', done: s => s.flags.knowFountain },
      { t: 'Make something to fish with (combine two things)', done: s => s.inv.includes('hookLine') || s.flags.gotShoe },
      { t: 'Fish the horseshoe out of the fountain', done: s => s.flags.gotShoe },
      { t: 'Bring the horseshoe to Bertram', done: s => s.flags.shod },
    ] },
    seal: { parent: 'lightbearer', title: "The Lord's Seal", desc: "No goods leave Kraxenville without Lord Aldermere's seal.", giver: 'Guildmaster Hollis', xp: 25, steps: [
      { t: "Ask at Lord Aldermere's manor gate (north-east)", done: s => s.flags.needLordPie || s.flags.gateOpen },
      { t: 'Bring his Lordship a beef and pepper pie', done: s => s.flags.gateOpen },
      { t: 'Give the sealed writ to Guildmaster Hollis', done: s => s.flags.writDelivered },
    ] },
    pepper: { parent: 'seal', title: 'Not a Pinch of Pepper', desc: 'Mistress Pell used her last pepper in your pie!', giver: 'Mistress Pell', xp: 20, steps: [
      { t: 'Find someone selling pepper', done: s => s.flags.osricTrade || s.inv.includes('pepper') || s.flags.pepperGiven },
      { t: "Get a basket of Marigold's nectarines for Osric", done: s => s.flags.gotNectarines || s.inv.includes('pepper') || s.flags.pepperGiven, hide: s => !s.flags.osricTrade },
      { t: 'Get pepper from Osric', done: s => s.inv.includes('pepper') || s.flags.pepperGiven },
      { t: 'Give the pepper to Mistress Pell', done: s => s.flags.pepperGiven },
    ] },
    ball: { title: 'The Runaway Ball', side: true, desc: "Pip and Nell's ball is stuck up in the big oak by the north gate.", giver: 'Pip & Nell', xp: 20, steps: [
      { t: 'Get the ball down from the big oak (try jumping!)', done: s => s.flags.ballDown },
      { t: 'Return the ball to Pip and Nell', done: s => s.flags.ballReturned },
    ] },
    oil: { parent: 'lightbearer', title: 'Oil for the Lantern', desc: 'Your lantern is barely a flicker.', giver: 'Guildmaster Hollis', xp: 20, steps: [
      { t: 'Find some lamp oil (try the Iron Cauldron)', done: s => s.inv.includes('oil') || s.flags.lanternFull },
      { t: 'Fill your lantern (combine the oil with it)', done: s => s.flags.lanternFull },
    ] },
    thornroad: { title: 'The Thorn Road', desc: 'Glowing thorny vines block the forest road. Find out where they come from.', giver: 'Tobias', xp: 50, steps: [
      { t: 'Jump the log and take the north trail', done: s => s.flags.enteredDeep },
      { t: 'Clear the wall of mist', done: s => s.flags.mistGone },
      { t: 'Find where the vines are growing from', done: s => s.flags.foundHeart },
      { t: 'Burn away the Thornheart', done: s => s.flags.heartBurned },
    ] },
    waystones: { parent: 'thornroad', title: 'Light the Waystones', desc: 'Three old guild waystones have gone dark. Light them to burn away the mist.', xp: 30, steps: [
      { t: 'Light the waystone in the south-west', done: s => s.flags.ws1 },
      { t: 'Light the waystone in the south-east', done: s => s.flags.ws2 },
      { t: 'Cross the stream (jump!) and light the waystone in the north-west', done: s => s.flags.ws3 },
    ] },
    thornheart: { parent: 'thornroad', title: 'The Thornheart', desc: 'A great root of thorns, drinking red light. A young possum is caught in it.', xp: 30, steps: [
      { t: 'Focus your lantern on the Thornheart', done: s => s.flags.heartBurned },
      { t: 'Help the frightened possum (optional)', done: s => s.flags.possumFree },
    ] },
    owl: { title: "The Owl's Riddle", side: true, desc: 'Old Hoots knows something.', xp: 20, steps: [{ t: 'Answer the riddle', done: s => s.flags.owlDone }] },
    gateway: { title: 'The Gateway', desc: 'The thorns drank red light from the west, where the rumoured gateway stands.', giver: 'Tobias', xp: 50, steps: [
      { t: 'Follow the west road to the Gateway', done: s => s.flags.sawGateway },
    ] },
    bard: { title: "The Bard's Song", side: true, desc: 'Fredrick the bard is playing an old tune you know.', xp: 10, steps: [{ t: 'Listen to Fredrick', done: s => s.flags.metFredrick }] },
    moments: { title: 'Precious Moments', side: true, desc: 'Butterflies rest on the big rocks along the leafy lane.', xp: 20, steps: [
      { t: 'Watch the butterflies on the Mossy Rock', done: s => s.flags.bf_rock1 }, { t: 'Watch the butterflies on the Big Rock', done: s => s.flags.bf_rock2 }, { t: 'Watch the butterflies on the Sunny Rock', done: s => s.flags.bf_rock3 }] },
    leaves: { title: 'Golden Leaves', side: true, desc: 'Old Maud says eight lucky golden leaves are hidden around the countryside.', giver: 'Old Maud', xp: 40, steps: [
      { t: 'Find all 8 golden leaves', done: s => s.leaves.length >= 8 }, { t: 'Show them to Old Maud', done: s => s.flags.leavesDone }] },
  };
  const TOTAL_LEAVES = 8;

  const SPEAKERS = {
    narrator: { name: '', color: '#7a5530', voice: 0.8 },
  };

  // ------------------------------------------------------------------ helpers
  const say = (w, t) => G.say(w, t), think = t => G.think(t), nar = (t, o) => G.narrate(t, o);
  const L = t => G.say('luminara', t);
  function journalAdd(key) { if (!G.S.journal.includes(key)) { G.S.journal.push(key); G.toast('New journal entry', 'writ'); G.tipLater('journal'); } }
  async function needSatchel() { await L("I'd better find my satchel first, or I'll be dropping things all day."); }
  function checkMorning() { if (allMorning(G.S) && G.S.q.morning !== 'done') { G.questDone('morning'); } }
  function checkCaravan() {
    const f = F();
    if (f.shod && f.writDelivered && f.lanternFull && !f.caravanReady) return true;
    return false;
  }

  // ------------------------------------------------------------------ INTRO
  async function intro() {
    G.music('dawn');
    await G.wait(400);
    await nar('Luminara the Light-Bearer\n— Chapter One —', { big: true });
    G.sfx('tweet');
    await nar('It was the crack of dawn, and a bird called loudly.');
    await nar('Luminara awoke and prepared herself for the day ahead. She arose early each and every morning to enjoy its peacefulness.');
    await nar('She brushed and braided her long hazelnut hair, washed her soft, gentle face, and tied her brown leather shoes.');
    G.emote('luminara', '♪');
    await think('Another beautiful autumn morning. The guild has work for me today — but first, tea!');
    G.questStart('morning');
    await G.tip('move'); await G.tip('goal'); await G.tip('quests'); await G.tip('menu');
  }

  // ------------------------------------------------------------------ ACTIONS (talk / look / use)
  const ACT = {};
  const USE = {};

  // ---------- cottage
  ACT.satchelPick = async () => {
    F().hasSatchel = true; G.sfx('pick'); G.toast('Got your <b>Satchel</b>', 'satchel'); G.refresh();
    await think('My trusty leather satchel. Now I can carry things!');
    await G.tip('satchel');
    checkMorning();
  };
  ACT.bed = async () => {
    if (!F().gotKey) {
      if (!F().hasSatchel) return needSatchel();
      await nar('You straighten the blue quilt and plump the pillow… something small and hard is tucked beneath it.');
      G.give('brassKey'); F().gotKey = true;
      await think('The little brass key to my safekeeping box. I always keep it close.');
    } else await nar('Your bed, neatly made. The quilt is the colour of the evening sky.');
  };
  ACT.box = async () => {
    if (F().gotCompass) return nar('Your safekeeping box. Small treasures and precious memories rest inside.');
    if (!F().hasSatchel) return needSatchel();
    if (has('brassKey')) { await L("It's locked. I should use my little brass key on it."); if (G.S.flags.tip_use) G.toast('Satchel → tap the key → <b>Use…</b> → tap the box.'); await G.tip('use'); }
    else await nar('Your safekeeping box. It is locked tight. Where did you leave the key? You always keep it close to where you sleep.');
  };
  USE.box = async (item) => {
    if (item !== 'brassKey') return false;
    G.take('brassKey'); G.sfx('door');
    await nar('Her father entrusted Luminara with a special gift before he departed for war. Whenever she felt the sadness approaching, she would open this safekeeping box and hold its small treasures close to her heart.');
    await nar('At nine years old, Luminara lost her father. He was a courageous man and a renowned warrior, who fought on the front lines with his trusty axe, "Doomcleaver". He would protect all innocent creatures and any person threatened in their safety.');
    await nar('Among the treasures was a compass. She would carry it to keep track of her direction while journeying into the Dark Forest.');
    G.give('compass'); F().gotCompass = true; journalAdd('father');
    await think('I have a feeling I might need it today.');
    G.hud(); await G.tip('compass');
    checkMorning(); return true;
  };
  ACT.wardrobe = async () => {
    if (F().cloak) return nar("An assortment of clothes — not many, as Luminara was not one to fuss with lavish outfits.");
    await nar('In the wardrobe hangs her favourite cloak. It is deep blue, made of fine-quality sheep\'s wool, and falls from her shoulders almost to the floor. Embroidery runs along the hood and down the front opening.');
    await nar("Luminara's beloved mother made it for her before she passed. It was quite fortunate that her mother was able to finish the embroidery — the cloak held such a strong meaning for her.");
    F().cloak = true; G.sfx('swish'); journalAdd('mother'); G.addXP(5, true);
    G.emote('luminara', '♥');
    await think('There. Now I feel ready for anything.');
    checkMorning();
  };
  ACT.cupboard = async () => {
    if (!F().hasSatchel) return needSatchel();
    if (!F().gotTea) { F().gotTea = true; G.give('teaTin'); await think('My favourite floral green tea.'); if (has('sugar')) await G.tip('combine'); }
    else await nar('Cups, bowls and a jar of honey for winter.');
  };
  ACT.shelf = async () => {
    if (!F().hasSatchel) return needSatchel();
    if (!F().gotSugar) { F().gotSugar = true; G.give('sugar'); await think('A little sugar makes everything sweeter.'); if (has('teaTin')) await G.tip('combine'); }
    else await nar('Jars of dried herbs, buttons, string and a few well-loved books.');
  };
  ACT.stove = async () => {
    if (F().teaMade) return nar('The stove is still warm. The kettle ticks as it cools.');
    if (has('teaBlend')) { await L('The kettle is hot. I just need to use my sweet tea blend here.'); if (G.S.flags.tip_use) G.toast('Satchel → tap the tea blend → <b>Use…</b> → tap the stove.'); await G.tip('use'); }
    else if (has('teaTin')) await think("I like my green tea sweetened. I should combine it with some sugar first.");
    else await nar('The stove is warm and the kettle is full. All you need is tea!');
  };
  USE.stove = async (item) => {
    if (item === 'teaTin') { await think('Not without sugar! I should combine the tea with sugar first.'); return true; }
    if (item !== 'teaBlend') return false;
    G.take('teaBlend'); G.sfx('sip');
    await nar('Luminara prepared a hot tea for herself. It gave off a floral scent.');
    G.give('teaCup'); F().teaMade = true;
    await think('Perfect. Now to drink it in my chair outside and watch the sun come up.');
    return true;
  };
  ACT.table = async () => { if (!F().hasLantern) return ACT.lanternPick(); await nar('A little wooden table, polished with beeswax.'); };
  ACT.lanternPick = async () => {
    if (!F().hasSatchel) return needSatchel();
    F().hasLantern = true; G.give('lantern'); G.refresh();
    await think("My golden lantern. Hmm… the oil's nearly gone. Its light is only a flicker.");
    checkMorning();
  };

  // ---------- hillside
  ACT.chair = async () => {
    if (F().teaDrunk) return nar('Your chair. The perfect place to watch the hills.');
    if (!has('teaCup')) return think("My favourite chair. I'll sit here once I've made my morning tea.");
    return drinkTea();
  };
  USE.chair = async (item) => { if (item !== 'teaCup') return false; await drinkTea(); return true; };
  async function drinkTea() {
    G.take('teaCup'); G.face('luminara', 'down'); G.sfx('sip');
    await nar('Luminara sat in the chair outside her tiny wooden cottage. She watched as the sun rose over the autumn hills of Kraxenville — the sun piercing through the clouds, bringing life and colour to the world.');
    await nar('She savoured her cup of hot green tea. It gave off a floral scent and was sweetened with sugar.');
    F().teaDrunk = true; G.music('dawn');
    checkMorning();
    if (G.S.q.morning === 'done') {
      await nar("Lately, there were strange rumours spreading in the town of Kraxenville. The villagers spoke of a magical passage that had opened in the depths of the Dark Forest. Nobody knew how it appeared there, but the talk of the town was that it led to another world where mysterious creatures resided.");
      await think('Time to walk into town. The lane goes south, all the way to Kraxenville.');
      G.questStart('totown');
    } else {
      const miss = [];
      if (!F().cloak) miss.push('my cloak'); if (!F().gotCompass) miss.push("Father's compass"); if (!F().hasLantern) miss.push('my lantern');
      await think('Lovely. Before I set off I still need ' + miss.join(' and ') + '.');
    }
  }
  USE.chair.ok = true;
  ACT.butterflyRock = async (t) => {
    const id = t.id; G.S.q.moments || G.questStart('moments');
    if (!F()['bf_' + id]) {
      F()['bf_' + id] = true; G.emote('luminara', '♥');
      await nar('Luminara stopped to admire the butterflies resting on the rock, their wings opening and closing in the morning sun.');
      await think('*If only there was some way to capture these precious moments…*');
      journalAdd('butterflies');
      if (F().bf_rock1 && F().bf_rock2 && F().bf_rock3) G.questDone('moments');
      else G.addXP(5);
    } else await nar('The butterflies flutter about, perfectly happy.');
  };

  // ---------- town
  async function arriveTown() {
    F().arrivedTown = true;
    await nar('She arrived at Kraxenville. She heard much chatter from the local villagers. There were young children playing ball on the grassy area near the front entrance.');
    // glide the camera over to the market square so we can see who is calling out
    G.camTo(25.5 * 16, 19 * 16); await G.wait(900);
    await say('marigold', 'Fresh nectarines! Picked this morning!');
    await say('osric', 'Come, see what we have brought in from Lesterfield today!');
    await G.camTo(null);
    await think("My tummy's rumbling after that long walk. The Cookshop is down the alley, south of the market square — but the guild is expecting me too.");
    if (!G.S.q.pie) G.questStart('pie');
  }
  ACT.baker = async (t) => {
    const f = F();
    if (!f.pieBought) {
      await say('baker', "Morning, Light-Bearer! Hot pies, fresh from the oven.");
      const c = await G.choice('luminara', 'What shall I have?', ['A beef and pepper pie, please (4 copper)', 'Just looking, thank you']);
      if (c === 1) return say('baker', 'Come back when your tummy rumbles!');
      if (G.S.coins < 4) return say('baker', "Oh dear, that's not quite enough copper.");
      G.addCoins(-4); f.pieBought = true; G.give('pie'); if (!G.S.q.pie) G.questStart('pie');
      await say('baker', "Pepper is expensive these days, but I know it's your favourite.");
      await think("I'll treat myself. I'll eat it on the bench by the fountain.");
      return;
    }
    if (f.needLordPie && !f.pellAsked) {
      f.pellAsked = true;
      await L("Mistress Pell, could you bake a beef and pepper pie for Lord Aldermere?");
      await say('baker', "For his Lordship? Oh, he does love my beef and pepper! But — oh dear — that was my last pinch of pepper in your pie this morning!");
      await say('baker', "The Lesterfield trader in the market square sells pepper. Bring me a pouch, and I'll bake the finest pie in the kingdom.");
      G.questStart('pepper');
      if (!has('pepper')) return;
    }
    if (has('pepper')) return USE.baker('pepper');
    if (f.pepperGiven && !f.gateOpen && !has('lordPie')) { G.give('lordPie'); return say('baker', 'Here you are — fit for a lord!'); }
    const lines = ["Mind the pastry, it's hot!", "The secret is patience. And butter. Mostly butter.", 'Did you hear? They say a door has opened in the Dark Forest. Gives me the shivers.'];
    await say('baker', lines[Math.floor(Math.random() * lines.length)]);
    if (has('honeyCake')) return;
    const c = await G.choice('luminara', '*Golden honey cakes are cooling on the counter.*', ['A honey cake, please (2 copper) — restores all hearts', 'No thank you']);
    if (c !== 0) return;
    if (G.S.coins < 2) return say('baker', "Oh dear, that's not quite enough copper, love.");
    G.addCoins(-2); G.give('honeyCake'); await say('baker', 'Good for the heart, and good for courage too. Save it for when you need it!');
  };
  USE.baker = async (item) => {
    if (item !== 'pepper') return false;
    if (!F().pellAsked) { await say('baker', 'Pepper! What a treat. Is there something you\'d like me to bake with it?'); return true; }
    G.take('pepper'); F().pepperGiven = true; G.questDone('pepper');
    await say('baker', 'Splendid! Give me a moment…');
    await G.fade(true, 300); G.sfx('munch'); await G.wait(600); await G.fade(false, 300);
    G.give('lordPie');
    await say('baker', "A golden beef and pepper pie, fit for a lord! Off you go, before it cools.");
    return true;
  };
  ACT.cookDoor = async () => nar("The Cookshop's kitchen is through here — but Mistress Pell serves her pies out front.");
  ACT.bench = async () => {
    if (has('pie')) return eatPie();
    await nar('A bench by the fountain. A lovely place to sit and watch Kraxenville go by.');
  };
  async function useSelf(id) {
    if (id === 'honeyCake') {
      if (G.S.hearts >= G.S.maxHearts) return think("I'm feeling brave enough right now. I'll save the honey cake for when I need it.");
      G.take('honeyCake'); G.sfx('munch'); G.S.hearts = G.S.maxHearts; G.hud(); return think('Mmm, sticky and sweet. I feel much braver now!');
    }
    if (id === 'thimble') return nar("Luminara held her mother's silver thimble. It was warm from her pocket, and for a moment she could almost hear her mother humming as she sewed.");
    if (id === 'sunstone') { G.sfx('magic'); return nar('The sunstone glows warm and golden in your hand, like a little piece of a summer afternoon.'); }
    if (id === 'pie') { if (G.M.id === 'town') return eatPie(); return think("I'd rather sit down to eat it properly — the bench by the fountain is perfect."); }
    if (id === 'teaCup') return think("Not yet — I want to drink it in my chair outside, watching the sun rise.");
    if (id === 'compass') { await nar("Luminara held her father's compass close to her heart. The needle trembled, then settled, pointing the way."); return; }
  }
  async function eatPie() {
    G.take('pie'); F().pieEaten = true; G.sfx('munch'); if (G.S.q.pie !== 'done') { G.S.q.pie = G.S.q.pie || 'active'; G.questDone('pie'); }
    G.S.hearts = G.S.maxHearts; G.hud();
    await nar('Although it was hot and spicy in its flavour, she relished the pie. Its hearty filling broke her long fast. The flavours exploded in her mouth, with gravy seeping out of it.');
    await G.fade(true, 900);
    G.music('wonder');
    await nar('Luminara sat for some time outside, lost in a daydream. She fantasised about mythical creatures from distant lands, and imagined what it might be like to ride upon the back of a fire-breathing dragon…');
    G.sfx('roar');
    await G.wait(600);
    await G.fade(false, 900);
    G.music('town');
    G.sfx('lute');
    await nar('It wasn\'t too long after that she heard one of the local bards, plucking his lute and humming an old tune that she recognised.');
    const next = F().metHollis ? 'Now, back to work — the caravan will not get ready by itself!' : 'Now — to the guild!';
    await think(F().metFredrick ? `Good old Fredrick, still playing by the fountain. ${next}` : `That tune! It's Fredrick — he's by the fountain. ${next}`);
    G.addXP(5, true);
  }
  ACT.fredrick = async () => {
    const f = F();
    if (!f.metFredrick) {
      G.questStart('bard');
      G.sfx('lute');
      const c = await G.choice('luminara', '*Fredrick is plucking his lute and humming.*', ['Donate a copper coin', 'Just listen']);
      if (c === 0 && G.S.coins > 0) { G.addCoins(-1); await say('fredrick', 'Thank you, that is very kind of you.'); G.addXP(5, true); }
      await L('Have you heard about the rumours of a magical gateway in the Dark Forest?');
      await say('fredrick', "Yes, of course! The talk is all through the town. I was turning it into a song. I, too, wonder what lies on the other side, but I won't be going into the forest any time soon, that's for sure!");
      await say('fredrick', 'Old songs speak of such danger, warning: *doors of mystery should never be opened unless the traveller has a key*.');
      await L('That is fascinating. Enjoy your day.');
      f.metFredrick = true; journalAdd('song'); G.questDone('bard');
      if (!(f.knowFountain && !f.gotString && !f.shod)) return;
    }
    if (f.knowFountain && !f.gotString && !f.shod) {
      await L('Fredrick, I need something long and strong, like a fishing line…');
      await say('fredrick', "Strange you should ask! A string snapped on my lute this very morning, right in the middle of a verse. It's no good for music now — but it's strong as anything. Take it!");
      f.gotString = true; G.give('luteString'); return;
    }
    const songs = ['♪ Through the forest dark and deep, where the old stones softly sleep… ♪', '♪ Oh, the Light-Bearer walks where the shadows grow… ♪', "I'm still looking for a word that rhymes with 'gateway'. 'Straightaway'? Hmm.", '♪ Doors of mystery, doors of night — never open without a key, nor without a light… ♪'];
    G.sfx('lute'); await say('fredrick', songs[(f.fredT = ((f.fredT || 0) + 1)) % songs.length]);
  };
  ACT.marigold = async () => {
    const f = F();
    const needFruit = f.osricTrade && !f.gotNectarines && !has('pepper') && !f.pepperGiven;
    // she thanks you for the children's ball, whenever you happened to do it
    if (f.ballReturned && !f.marigoldThanked) {
      f.marigoldThanked = true;
      if (f.askedMarigold) await say('marigold', "Bless you, Light-Bearer! Those two are happy as larks on the green, and my stall is safe at last.");
      else {
        await say('marigold', "Oh! It was you who fetched Pip and Nell's ball down from the big oak, wasn't it? They're playing on the green now, and not one nectarine has been squashed since. Thank you, dear!");
        if (!needFruit) return say('marigold', "If you ever need anything from my stall, you just ask.");
      }
    }
    if (needFruit) {
      if (f.ballReturned) {
        if (!f.askedMarigold) await L("Marigold, could I have a basket of your nectarines? It's for a trade with Osric.");
        await say('marigold', f.askedMarigold ? "And here's your basket of nectarines, just as I promised." : "After what you did for those two? Of course! Take a whole basket — the best of this morning's picking.");
        f.gotNectarines = true; f.askedMarigold = true; G.give('nectarines');
        return;
      }
      if (!f.askedMarigold) {
        f.askedMarigold = true;
        await L("Marigold, could I have a basket of your nectarines? It's for a trade with Osric.");
        await say('marigold', "A whole basket? I'd love to help, dear, but I can't take my eyes off this stall for a moment — those two little scamps keep kicking their ball into my fruit!");
        await say('marigold', f.ballDown ? "Their ball went up into the big oak by the north gate… oh! You've got it? Then do give it back to them, and tell them to play on the green." : "And now it's stuck up in the big oak by the north gate, and they're howling about it. If somebody fetched it down, they'd play over on the green and leave my nectarines in peace.");
        if (!G.S.q.ball) G.questStart('ball');
        return;
      }
      return say('marigold', has('ball') ? 'Give that ball back to Pip and Nell, dear — then the basket is yours.' : "The ball is stuck up in the big oak near the north gate. You're a good jumper, aren't you?");
    }
    const lines = ['Fresh nectarines! Picked this morning!', 'Juicy as sunshine, sweet as honey!', "If you see a goose called Duchess, she owes me three nectarines."];
    await say('marigold', lines[Math.floor(Math.random() * lines.length)]);
  };
  ACT.osric = async () => {
    const f = F();
    if (has('nectarines') && f.osricTrade) return USE.osric('nectarines');
    if (G.S.q.pepper === 'active' && !has('pepper') && !f.pepperGiven) {
      await L('How much for a pouch of pepper?');
      await say('osric', 'Ah, a lady of taste! Twelve copper. Pepper is precious — it comes all the way from the far south.');
      const opts = G.S.coins >= 12 ? ['Pay 12 copper', 'Is there another way?'] : ["I don't have that much…"];
      const c = await G.choice('luminara', 'Twelve copper…', opts);
      if (G.S.coins >= 12 && c === 0) { G.addCoins(-12); G.give('pepper'); return say('osric', 'A pleasure doing business!'); }
      f.osricTrade = true;
      await say('osric', "Hmm. Well… folk in Lesterfield pay handsomely for Kraxenville nectarines. Bring me a basket of Marigold's finest, and the pepper is yours.");
      return;
    }
    const lines = ['Come, see what we have brought in from Lesterfield today!', 'Silks from Wockville, spices from the south, and the finest pepper in Krax!', "The road from Lesterfield goes through the Dark Forest. I'd not do it without the Light-Bearer, I tell you."];
    await say('osric', lines[Math.floor(Math.random() * lines.length)]);
    if (has('sunstone') || G.S.q.pepper === 'active') return;
    const c = await G.choice('luminara', '*A little golden stone glows warmly on his stall.*', ['A sunstone charm (8 copper) — makes your raised lantern stronger', 'Just looking']);
    if (c !== 0) return;
    if (G.S.coins < 8) return say('osric', "Eight copper, friend. Come back when your purse is heavier!");
    G.addCoins(-8); G.give('sunstone'); F().sunstone = true;
    await say('osric', "Hold it up with your lantern and see how the darkness runs! It soaks up sunshine all day long.");
  };
  USE.osric = async (item) => {
    if (item !== 'nectarines') return false;
    if (!F().osricTrade) { await say('osric', 'Lovely nectarines! But what is it you want from me, friend?'); return true; }
    G.take('nectarines'); G.give('pepper');
    await say('osric', 'Marvellous! Lesterfield will love these. A pouch of pepper, as promised.');
    return true;
  };
  ACT.kids = async () => {
    const f = F();
    if (f.ballReturned) { const l = ['Thank you, Light-Bearer! We\'re playing on the green now, so we don\'t squash Marigold\'s fruit.', 'Can you jump that high every day?', "When I grow up I'm going to carry a lantern too!"]; return say(Math.random() < 0.5 ? 'kid1' : 'kid2', l[Math.floor(Math.random() * l.length)]); }
    if (has('ball')) return USE.kids('ball');
    await say('kid1', "Our ball's stuck up in the big oak tree! It's ever so high.");
    await say('kid2', "You're tall. Can you jump for it? Pleeease?");
    F().kidsAsked = true;
    if (!G.S.q.ball) G.questStart('ball');
    await G.tip('jump');
  };
  USE.kids = async (item) => {
    if (item !== 'ball') return false;
    G.take('ball'); F().ballReturned = true; G.emote('kid1', '♥'); G.emote('kid2', '♥');
    await say('kid1', 'Our ball! Thank you, thank you!');
    await say('kid2', "We'll play here on the green from now on. We promise not to kick it into Marigold's fruit.");
    await say('kid1', 'Here — a shiny copper from my piggy bank!');
    G.addCoins(1);
    if (!G.S.q.ball) G.S.q.ball = 'active';
    G.questDone('ball');
    return true;
  };
  ACT.ballTree = async () => {
    if (F().ballDown) return nar('A grand old oak, glowing orange with autumn leaves.');
    if (!F().kidsAsked) return think('A ball is wedged up in the branches of the old oak. It must belong to those two children on the green.');
    await think("Pip and Nell's ball is wedged in the low branches, just out of reach. If I stand right underneath and jump…");
    if (G.S.flags.tip_jump) G.toast(document.body.classList.contains('touch') ? 'Tap <b>Jump</b>!' : 'Press <b>Space</b> to jump!'); await G.tip('jump');
  };
  ACT.ballTreeJump = async () => {
    if (F().ballDown) return;
    F().ballDown = true; G.sfx('leaf'); G.sfx('pop'); G.refresh();
    for (let i = 0; i < 12; i++) G.particles({ kind: 'leaf', x: G.player.x + (Math.random() - 0.5) * 30, y: G.player.y - 40 - Math.random() * 10, vx: (Math.random() - 0.5) * 10, vy: 10 + Math.random() * 20, ph: Math.random() * 6, c: ['#e0902a', '#e8c040', '#c05030'][i % 3], t: 3 });
    G.give('ball');
    if (!G.S.q.ball) G.questStart('ball');
    await think('Got it! Down came the ball — and half the leaves on the tree. It must belong to Pip and Nell, the children on the green. I should give it back to them.');
  };
  ACT.bertram = async () => {
    const f = F();
    if (has('horseshoe')) return USE.bertram('horseshoe');
    if (f.shod) return say('bertram', 'Clover\'s right as rain now. Best cart-horse in Krax, she is.');
    if (!f.knowFountain) {
      if (!f.metHollis) return say('bertram', 'Morning, Light-Bearer. Don\'t mind me — just a spot of horse trouble.');
      await say('bertram', "Oh, Light-Bearer, what a morning! Clover took fright at the geese and bolted round the fountain — and her shoe flew clean off! I heard it go *plop*, right into the water.");
      await say('bertram', "The fountain's deep in the middle and cold as winter. My old arms can't reach, and I've no tackle for fishing.");
      await L('If I can fish it out, can you fit it again?');
      await say('bertram', f.gotNail ? "Quick as a wink — I've nails aplenty." : "Quick as a wink — I've nails aplenty. Well… I had. One rolled off somewhere by the trough.");
      f.knowFountain = true;
      return think("Something to fish with… I need a hook, and a line strong enough to pull up a horseshoe.");
    }
    await say('bertram', "Any luck with the horseshoe? It's sat at the bottom of the fountain, sure as eggs.");
  };
  USE.bertram = async (item) => {
    if (item !== 'horseshoe') return false;
    G.take('horseshoe'); F().shod = true;
    await say('bertram', "You found it! Light-Bearer, you're a marvel!");
    G.sfx('door'); await G.wait(250); G.sfx('ding'); await G.wait(250); G.sfx('ding');
    G.emote('clover', '♥');
    await say('bertram', "There we are — good as new. Clover's ready to pull that wagon all the way to Lesterfield.");
    G.questDone('horseshoe'); G.addCoins(2);
    return true;
  };
  USE.clover = async (item) => { if (item !== 'horseshoe') return false; await think('Bertram should be the one to fit it.'); return true; };
  ACT.clover = async () => {
    G.sfx('hoot', 0.5);
    if (G.M.id === 'forest_edge') return nar('Clover nickers nervously at the dark trees, but stays close to the warm fire.');
    if (!F().shod) return nar('Clover nickers softly. She is holding up one hoof — the one missing its shoe.');
    await nar('Clover nuzzles your cloak, looking for treats. Her new shoe shines.');
  };
  ACT.nailPick = async () => {
    if (!F().hasSatchel) return needSatchel();
    F().gotNail = true; G.give('bentNail'); G.refresh();
    await think('A bent horseshoe nail, curled up like a little hook.');
  };
  ACT.fountain = async () => {
    const f = F();
    if (f.knowFountain && !f.gotShoe) {
      await nar('Deep in the middle of the fountain, something curved and iron glints beneath the water.');
      return think("It's too deep and cold to reach by hand. I need a hook and a line.");
    }
    if (!f.wished) {
      const c = await G.choice('luminara', '*The fountain sparkles in the sunlight. Coins glitter on the bottom.*', ['Toss in a copper and make a wish', 'Just admire it']);
      if (c === 0 && G.S.coins > 0) { G.addCoins(-1); G.sfx('splash'); f.wished = true; await think('I wish… that everyone I love stays safe, always.'); G.addXP(3); }
      return;
    }
    await nar('The fountain sparkles. Water splashes softly from the top.');
  };
  USE.fountain = async (item) => {
    if (item === 'luteString' || item === 'bentNail') { await think("On its own that won't work. I should combine the string and the nail."); return true; }
    if (item !== 'hookLine') return false;
    if (F().gotShoe) { await think("I've already fished out the horseshoe."); return true; }
    G.sfx('splash'); await nar('Luminara lowered the hook into the fountain, slowly, slowly… a tug!');
    G.take('hookLine'); F().gotShoe = true; G.give('horseshoe'); G.addCoins(3);
    await think("Clover's horseshoe! And a few coppers somebody wished upon. I'm sure they won't mind.");
    return true;
  };
  ACT.noticeBoard = async () => {
    await nar('Notices flutter on the board:\n• WANTED: An escort through the Dark Forest. Ask Guildmaster Hollis.\n• LOST: One goose. Answers to "Duchess". Bites.\n• BEWARE: Strange red lights seen west of the Ruined Keep.');
  };
  ACT.mapTable = async () => {
    await nar('A map of the Kingdom of Krax. Kraxenville sits in the north-east. The Dark Forest sprawls across the middle of the kingdom, past the Ruined Keep, all the way to the mountains of Vosmos — where a great volcano smokes in the far north.');
    await nar('Someone has drawn a little glowing door in the far north-west of the forest, with a question mark beside it.');
    journalAdd('realm'); F().sawMap = true;
    await G.tip('map');
    G.openPanel('map');
  };
  ACT.tavernDoor = async () => { await nar('Laughter and singing spill out of the tavern. It is far too rowdy for this early in the day.'); };
  ACT.coachDoor = async () => { await nar('The Coach House stables. It smells of hay and horses. Bertram is out in the yard.'); };
  ACT.hallDoor = async () => { await nar("The Merchant's Hall is closed — a sign says COUNTING. PLEASE DO NOT DISTURB."); };
  ACT.manorDoor = async () => { await nar("The manor's great front door. You'd better not knock without being invited."); };
  ACT.pemberton = async () => {
    const f = F();
    if (has('lordPie')) return USE.pemberton('lordPie');
    if (!has('writ')) return say('pemberton', 'Good morning. His Lordship receives no visitors today. His gout is grumbling — and so is he.');
    if (!f.needLordPie) {
      await say('pemberton', 'Good morning. His Lordship receives no visitors today. His gout is grumbling — and so is he.');
      await L("I'm sorry to hear that. But I need his seal on the guild's trade writ, or the caravan can't leave.");
      await say('pemberton', "Hmm. Then you'll need to sweeten his mood. Nothing cheers Lord Aldermere like a beef and pepper pie from Mistress Pell's Cookshop. Bring him one, and I shall see what I can do.");
      f.needLordPie = true; return;
    }
    await say('pemberton', 'A beef and pepper pie, from the Cookshop. Nothing less will do.');
  };
  USE.pemberton = async (item) => {
    if (item !== 'lordPie') return false;
    if (!has('writ')) { await say('pemberton', 'How kind. But what do you need from his Lordship?'); return true; }
    const f = F();
    await say('pemberton', "Is that…? It is! Mistress Pell's beef and pepper! Wait here, miss.");
    G.take('lordPie');
    await G.walk('pemberton', 41, 8, 40);
    G.removeNPC('pemberton');
    const al = G.addNPC({ id: 'aldermere', char: 'aldermere', x: 41, y: 8, dir: 'down', name: 'Lord Aldermere', color: '#5a2a6a', voice: 0.6 });
    await G.walk('aldermere', 41, 11, 30);
    await say('aldermere', 'A pepper pie! *munch* Mmph. *munch* Oh, Mistress Pell, you treasure.');
    await say('aldermere', 'Now then. Pemberton tells me you need my seal?');
    G.take('writ'); G.sfx('ding');
    await nar('Lord Aldermere pressed his ring into a blob of red wax.');
    G.give('sealedWrit');
    await say('aldermere', "There. Mind the forest, young lady. My gamekeeper swears he saw a red light glowing beyond the Ruined Keep. Red! In my day, lights in the woods were a respectable gold.");
    await say('aldermere', 'Do enjoy my garden on your way out, if you like. Good day!');
    await G.walk('aldermere', 41, 8, 30); G.removeNPC('aldermere');
    f.gateOpen = true; G.refresh(); G.addXP(10);
    return true;
  };

  // ---------- guild
  ACT.hollis = async () => {
    const f = F();
    if (!f.metHollis) {
      f.metHollis = true; G.questDone('totown');
      await say('hollis', "Ah, Luminara, our Light-Bearer! Just the person I hoped to see.");
      await say('hollis', "We've a caravan of goods bound for Lesterfield — chests, boxes, barrels and crates — and the only safe road runs through the Dark Forest.");
      await say('hollis', "But I'm sorry to say we're not ready to leave. Three troubles have come up this morning:");
      await say('hollis', 'One: Clover, our cart-horse, has thrown a shoe. Bertram at the Coach House is in a dreadful flap.');
      await say('hollis', "Two: no goods may leave Kraxenville without Lord Aldermere's seal. Here is the trade writ — his Lordship must stamp it.");
      G.give('writ');
      await say('hollis', "And three: that lantern of yours is barely a flicker! You'll need oil before we go anywhere near that forest.");
      await L('Leave it with me, Guildmaster.');
      G.questStart('lightbearer'); G.questStart('horseshoe'); G.questStart('seal'); G.questStart('oil');
      return;
    }
    if (has('sealedWrit')) await USE.hollis('sealedWrit');
    if (checkCaravan()) {
      f.caravanReady = true;
      await say('hollis', "A shod horse, a sealed writ and a lantern like a little sun! Splendid work, Light-Bearer.");
      await say('hollis', "Tobias is waiting with the wagon at the West Gate. Lead them safely through the forest.");
      G.addXP(20); return;
    }
    if (f.caravanReady) return say('hollis', 'Tobias is waiting at the West Gate. Off you go, and may your light never falter!');
    const left = [];
    if (!f.shod) left.push("Clover's shoe (Bertram, at the Coach House)");
    if (!f.writDelivered) left.push("Lord Aldermere's seal (his manor, north-east)");
    if (!f.lanternFull) left.push('oil for your lantern');
    if (left.length) await say('hollis', 'Still to sort out: ' + left.join('; ') + '.');
  };
  USE.hollis = async (item) => {
    if (item !== 'sealedWrit') return false;
    G.take('sealedWrit'); F().writDelivered = true; G.questDone('seal');
    await say('hollis', "Lord Aldermere's seal! However did you manage it? No — don't tell me. Pie, wasn't it?");
    return true;
  };

  // ---------- iron cauldron
  ACT.friend = async () => {
    const f = F();
    if (!f.metFriend) {
      f.metFriend = true;
      await say('friend', 'Luminara! Over here! I saved you a seat by the fire.');
      await say('friend', "You look like you've walked across the whole kingdom already. Sit! Brenna's stew is the best thing in Kraxenville.");
      await G.fade(true, 500); G.sfx('munch'); await G.wait(400); await G.fade(false, 500);
      G.S.hearts = G.S.maxHearts; G.hud();
      await nar('The two friends shared a hearty stew and warm bread beside the crackling fire, and for a while the whole world was just the two of them, talking and laughing.');
      if (f.metHollis) {
        await say('friend', 'So the guild is sending you into the Dark Forest with a whole caravan? With all these rumours about a gateway?');
        await L('Someone has to light the way.');
      } else {
        await say('friend', "Off to the guild after this? Let me guess — another run through the Dark Forest.");
        await L("Most likely. That's where they always need a light.");
        await say('friend', 'With all these rumours about a gateway out there? Oh, Luminara…');
        await L('Someone has to light the way.');
      }
      await say('friend', 'Just… promise you will come back and tell me everything.');
      await L('I promise. You know I hate being apart from the people I love.');
      await say('friend', 'And you never will be. Not while I am around.');
      G.emote('friend', '♥'); G.emote('luminara', '♥');
      await say('friend', 'Here — take this loaf for the road. You never know who might be hungry out there.');
      G.give('bread'); journalAdd('friend'); G.addXP(10);
    }
    if (G.S.q.oil === 'active' && !has('oil') && !f.lanternFull) {
      await L('Do you know where I might find some lamp oil? My lantern is nearly dry.');
      await say('friend', "Brenna keeps a whole barrel of it for the inn's lamps! Brenna — a flask for my friend, please?");
      await say('innkeeper', 'For the Light-Bearer? On the house, love.');
      G.give('oil');
      await think('Now I just need to combine the oil with my lantern.');
      return;
    }
    if (f.metFriend && f.friendChat) {
      const lines = ['Be careful out there, Luminara.', 'Brenna says there are more travellers than ever wanting a guide through the forest.', 'When you come back, we\'ll have stew again. My treat.', 'Your mother would be so proud of you, you know.'];
      return say('friend', lines[(f.fc = ((f.fc || 0) + 1)) % lines.length]);
    }
    f.friendChat = true;
  };
  ACT.innkeeper = async () => {
    if (G.S.q.oil === 'active' && !has('oil') && !F().lanternFull && !F().metFriend) {
      return say('innkeeper', "Lamp oil? Your friend {friend} has a flask set aside for you, love — she's been keeping a seat for you by the fire all morning.");
    }
    if (G.S.q.oil === 'active' && !has('oil') && !F().lanternFull) {
      await say('innkeeper', 'Lamp oil? Of course — for the Light-Bearer, it is on the house.');
      G.give('oil'); return;
    }
    const lines = ['Welcome to the Iron Cauldron! Stew\'s on, fire\'s lit.', "That cauldron's been simmering since my grandmother's day. Never once gone cold.", "Your friend's been waiting for you all morning, you know."];
    await say('innkeeper', lines[Math.floor(Math.random() * lines.length)]);
  };

  // ---------- villagers
  ACT.villagerA = async () => say('vA', ["They say a magic door has opened in the Dark Forest. My cousin's goat went missing near the Ruined Keep. Coincidence? I think not!", 'Lovely day for it, Light-Bearer.', "Have you seen a goose called Duchess? Nobody likes her, but we'd like her back."][Math.floor(Math.random() * 3)]);
  ACT.villagerC = async () => say('vC', ["Lord Aldermere's gamekeeper saw red lights beyond the Ruined Keep. Red! Never trust a red light in a dark wood.", 'The guild pays well, but I wouldn\'t walk that forest for all the copper in Krax.'][Math.floor(Math.random() * 2)]);
  ACT.villagerB = async () => {
    const f = F(), n = G.S.leaves.length;
    if (!G.S.q.leaves) {
      await say('vB', 'When I was a girl, we hunted for golden leaves every autumn. Lucky, they are!');
      await say('vB', "They say there are eight hidden about the countryside — in the lane, the town, even the forest. Bring me all eight and I'll tell you a secret.");
      G.questStart('leaves');
      if (n > 0 && n < TOTAL_LEAVES) return say('vB', `Oh! You've found ${n} already? Clever thing. Keep looking!`);
      if (n < TOTAL_LEAVES) return;
    }
    if (f.leavesDone) return say('vB', 'Remember, dear: a light shared is a light doubled.');
    if (n >= TOTAL_LEAVES) {
      f.leavesDone = true;
      await say('vB', 'All eight! Oh, look how they shine. You have the eyes of a true adventurer.');
      await say('vB', "Here's my secret, then: a light shared is a light doubled. Your mother used to say that, you know. She sewed by my window when you were small.");
      await say('vB', "And this… your mother left it on my windowsill the last time she came. I've kept it safe for you all these years.");
      G.give('thimble'); G.S.maxHearts = Math.min(9, G.S.maxHearts + 1); G.S.hearts = G.S.maxHearts; G.hud();
      G.toast("Mother's thimble gives you courage: <b>+1 heart</b>", 'thimble');
      G.addCoins(5); G.questDone('leaves'); journalAdd('maud'); return;
    }
    await say('vB', `${n} golden leaf${n === 1 ? '' : 'ves'} so far! Keep looking — they like quiet corners and the shade of big trees.`);
  };
  ACT.tobias = async () => {
    const f = F();
    if (G.M.id === 'forest_edge') {
      if (f.vinesGone) return say('tobias', "The road's clear! We'll be in Lesterfield by morning, thanks to you.");
      return say('tobias', "Clover and I will keep the fire lit. Go on, lass — find where those vines are coming from.");
    }
    if (!f.caravanReady) return say('tobias', 'Tobias, wagoner, at your service. Ready to roll when the Guildmaster says so — and not a moment before.');
    await say('tobias', 'Right then, Light-Bearer! Clover is hitched and the wagon is loaded. Lead the way!');
    f.caravanLeft = true; G.refresh();
    await G.fade(true, 800);
    await nar('The crew travelled by horse and wagon, as it was the most efficient way of carrying heavy cargo — chests, boxes, barrels and crates.');
    await nar('Luminara walked ahead, lantern in hand, as she had done many times before. This was how she had earned her name: "the Light-Bearer".');
    G.loadMap('forest_edge', 'caravan');
    await G.fade(false, 800);
    await forestArrival();
  };

  // ---------- forest edge
  async function forestArrival() {
    const f = F();
    G.music('forest');
    await say('tobias', "Whoa, Clover! Whoa! What in the world…?");
    G.face('luminara', 'left');
    await L("Thorny vines… they weren't here last week. And they're glowing, like embers!");
    await say('tobias', "We'll never get the wagon through that. Best make camp here while we think.");
    await nar('The day was turning into night.');
    f.nightfall = true;
    G.sfx('eep');
    await nar('Something small and green scuttled out of the thorns, squeaked at the lantern light, and vanished into the trees.');
    await say('tobias', "Goblinites! Nasty little things. I've not seen one this side of the Ruined Keep in years.");
    await say('tobias', "My old dad used to say the guild waystones kept this road safe. There are three of them, north of here past the stream — but they've been dark as long as I can remember.");
    await L('Then I will light them. And I will find out where these vines are coming from.');
    await say('tobias', "Take care, lass. Clover and I will keep the fire burning till you're back.");
    await think("The north trail leads deep into the forest. A log has fallen across it — I'll have to jump over.");
    await G.tip('jump');
    f.thornQuest = true;
    G.questStart('thornroad');
    await G.tip('light');
  }
  ACT.vines = async () => {
    if (F().vinesGone) return;
    await nar('Thorny vines curl across the road, pulsing with a strange red glow, like a slow heartbeat.');
    await think("I can't push through them. They seem to be growing from somewhere deeper in the forest.");
  };
  USE.vines = async (item) => { if (item !== 'lanternBright' && item !== 'lantern') return false; await nar('The vines shrink back from your lantern… then creep forward again. These are only the ends of the thorns. Somewhere, there must be a root.'); return true; };

  // ---------- deep forest
  async function enterDeep() {
    const f = F();
    if (f.enteredDeep) return;
    f.enteredDeep = true;
    await nar('The forest closed in around her. Only the golden circle of her lantern kept the dark at bay.');
    await think('Goblinites… if any come near, I will raise my lantern high. They cannot bear bright light. (Press Q)');
    await think('There — to the north-east, a wall of mist and thorns. The vines are thickest there.');
    await think('And the old waystones… if I light all three, their light might burn the mist away.');
    G.questStart('waystones');
  }
  ACT.waystone = async (t) => {
    const n = t.o.wsId, f = F();
    if (f['ws' + n]) return nar('The waystone glows warmly, lighting the path.');
    if (!f.lanternFull) return think("My lantern isn't bright enough to light it.");
    f['ws' + n] = true; G.sfx('magic'); G.fx({ kind: 'sparkle', x: t.o.x * 16 + 8, y: t.o.y * 16 - 4, t: 1 });
    await nar('Luminara held her lantern to the waystone. The little lamp inside caught, and glowed gold.');
    G.addXP(10);
    const lit = [1, 2, 3].filter(i => f['ws' + i]).length;
    if (lit < 3) return think(lit === 1 ? 'One waystone lit. Two to go.' : 'Just one more waystone!');
    G.questDone('waystones');
    G.sfx('magic'); G.shake(0.5);
    f.mistGone = true; G.refresh();
    await nar('Far to the north-east, the wall of mist shivered in the golden light of the three waystones… and melted away like frost in the morning sun.');
    await think('The way is open. Now to find where these thorns are growing from.');
  };
  USE.waystone = async (item, t) => { if (item !== 'lanternBright' && item !== 'lantern') return false; await ACT.waystone(t); return true; };
  ACT.mist = async () => {
    await nar('A wall of grey mist, thick with thorns. It is as cold as ice.');
    await think('Only a strong light could burn this away. The three old waystones…');
  };
  ACT.owl = async () => {
    const f = F();
    if (f.owlDone) return say('owl', 'Hoo-hoo. The Thornheart lies north-east, Light-Bearer, past the mist.');
    if (!f.owlHoot) {
      f.owlHoot = true; G.sfx('hoot');
      await nar('HOOT! HOOT!');
      await think("Oh! It's only an owl. Hello there.");
    }
    G.questStart('owl');
    await say('owl', 'Hoo… who walks my woods at this hour? A Light-Bearer, all alone.');
    await say('owl', 'Answer my riddle, and I will tell you what I know of these thorns.');
    for (;;) {
      const c = await G.choice('owl', 'What can fill a whole room, yet takes up no space at all?', ['Water', 'Light', 'A really big cat']);
      if (c === 1) break;
      if (c === 2) await say('owl', "Hoo-hoo-hoo! A big cat takes up a great deal of space, I assure you. Think, Light-Bearer — what do you carry?");
      else await say('owl', 'Hoo! Water would make a very soggy room. Think, Light-Bearer — what do you carry?');
    }
    await say('owl', 'Light, of course! Hoo-hoo!');
    await say('owl', 'Here is what I know. Every thorn in this forest grows from one great root — a Thornheart — in the hollow past the mist, to the north-east.');
    await say('owl', 'It drinks a red light that comes from the west. Light of your own is the only thing it fears.');
    await say('owl', 'Take this feather. May it help you see a little further in the dark.');
    G.give('feather'); F().owlDone = true; G.questDone('owl');
  };

  // ---------- the hollow (the Thornheart)
  async function enterHollow() {
    const f = F();
    if (f.foundHeart) return;
    f.foundHeart = true;
    await nar('Beyond the mist lay a hollow. In its heart, a great knot of thorny roots pulsed with red light. Every vine in the forest seemed to grow from it.');
    await think('The Thornheart…');
    G.sfx('eep', 1.6);
    await nar('A tiny squeak came from the edge of the thorns. A young possum was caught there, trembling.');
    await think('Poor little thing — just like the young possums that visit my cottage each night. Hold on, little one.');
    G.questStart('thornheart');
  }
  ACT.thornheart = async () => {
    const f = F();
    if (f.heartBurned) return;
    await L('Your thorns end here.');
    await nar('Luminara raised her lantern high and gathered all its light into one bright beam.');
    G.music('wonder');
    const o = G.M.objects.find(o => o.id === 'thornheart');
    await G.flapMini(4, { label: 'Focus your light! Press <b>Space</b> (or tap) when the ring turns <b style="color:#ffd860">gold</b>.', icon: '✦',
      msgs: ['Brighter!', 'Brighter still!', 'The thorns are smoking!', 'Now!'], at: { x: o.x * 16 + o.fw * 8, y: (o.y + o.fh) * 16 - 16 } });
    G.sfx('flash'); G.fx({ kind: 'flash', x: G.player.x, y: G.player.y - 14, t: 0.6 }); G.fx({ kind: 'beam', x: o.x * 16 + o.fw * 8, y: o.y * 16 - 20, w: 50, h: 60, t: 1.4 }); G.shake(0.6);
    await G.wait(700);
    for (let i = 0; i < 40; i++) G.particles({ kind: 'spark', x: o.x * 16 + Math.random() * o.fw * 16, y: o.y * 16 + Math.random() * 30, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, t: 1.4 });
    f.heartBurned = true; f.vinesGone = true; G.refresh();
    G.sfx('magic');
    await nar('The light poured from her lantern, brighter than she had ever seen it. The Thornheart hissed, smoked and shrivelled away to dust…');
    await nar('…and all through the Dark Forest, every glowing vine withered and crumbled.');
    G.addXP(20);
    await think('The little possum is free — but it is still trembling.');
  };
  USE.thornheart = async (item) => { if (item !== 'lanternBright') return false; await ACT.thornheart(); return true; };
  ACT.possum = async () => {
    const f = F();
    if (!f.heartBurned) return think("It's caught in the thorns. I can't pull it free without getting tangled myself. I have to deal with the Thornheart first.");
    if (f.possumFree) return;
    const food = ['bread', 'nectarines', 'pie'].find(i => has(i));
    if (food) {
      G.take(food);
      await nar(food === 'bread' ? 'Luminara knelt down and broke off a piece of the loaf {friend} had given her. The possum sniffed it… nibbled it… then gobbled up the lot.' : 'Luminara knelt down and offered a little food. The possum sniffed it… nibbled it… then gobbled up the lot.');
      G.addXP(10);
    } else await nar('Luminara knelt down and spoke softly, the way she did to the possums at home, until the trembling stopped.');
    G.emote('possum', '♥'); G.sfx('pop');
    await think('There you go. Home you run, little one.');
    await G.walk('possum', 11, 17, 50); G.removeNPC('possum');
    f.possumFree = true; G.questDone('thornheart');
    journalAdd('possum');
    await returnToCaravan();
  };
  USE.possum = async () => { await ACT.possum(); return true; };
  async function returnToCaravan() {
    const f = F(); if (f.caravanGone) return;
    await G.fade(true, 800);
    await nar('Luminara hurried back through the forest. The waystones glowed along the path, and not a single thorn was left.');
    G.loadMap('forest_edge', 'caravan');
    await G.fade(false, 800);
    await say('tobias', 'Light-Bearer! The vines — they crumbled to dust before my very eyes! The road is clear!');
    await L('They all grew from one great root, deep in the forest. A Thornheart. But it was drinking a red light… from the west.');
    await say('tobias', "The west road… that's where folk say the magic gateway opened.");
    await L("Fredrick's old song: *doors of mystery should never be opened unless the traveller has a key*.");
    await say('tobias', "Then you be careful, lass. With the waystones lit, Clover and I can manage the road to Lesterfield on our own. The guild will hear what you did tonight!");
    G.questDone('thornroad'); G.questDone('lightbearer'); G.addCoins(10);
    f.caravanGone = true; G.refresh();
    await nar('The caravan rolled on towards Lesterfield. And Luminara turned west, towards the Gateway.');
    G.questStart('gateway');
  }

  // ---------- the gateway
  async function enterGateway() {
    const f = F(); if (f.gatewayIntro) return; f.gatewayIntro = true;
    await nar('The air grows warm and strange. Red light flickers between the trees.');
  }
  ACT.portal = async () => {
    const f = F();
    if (f.sawGateway) return nar('The Gateway hums with red light. Not yet, Light-Bearer. Not without a key.');
    f.sawGateway = true;
    await nar('A tall door of carved silver stands in a ring of ancient stones. Inside it, red light swirls like a storm trapped in glass.');
    await L("So the rumours were true… a gateway to another world.");
    G.sfx('hum');
    for (let i = 1; i <= 10; i++) { f.monsterShow = i / 10; await G.wait(80); }
    G.sfx('roar'); G.shake(0.8);
    await nar('Something moved inside the swirling red. Two burning eyes. A shriek that shook the leaves from the trees.');
    await G.walk('luminara', Math.floor(G.player.x / 16), Math.floor(G.player.y / 16) + 2);
    f.monsterShow = 0;
    await L('Doors of mystery should never be opened… unless the traveller has a key.');
    await think('Whatever is on the other side, I am not ready for it. Not yet. First I need to find that key.');
    await think('And I promised {friend} I would come back and tell her everything.');
    G.questDone('gateway');
    f.chapter1 = true;
    await G.fade(true, 1200);
    await nar('End of Chapter One', { big: true });
    G.save();
    await G.chapterSummary(summaryHTML(G.S));
    G.showCredits([
      '#Luminara the Light-Bearer', 'Chapter One', '', '',
      '#Story & World', 'Lisa', '', '',
      '#Made with love by', 'Dad', '', '',
      '#Starring', 'Luminara, the Light-Bearer', '{friend}', 'Fredrick the Bard', 'Mistress Pell', 'Guildmaster Hollis', 'Bertram & Clover', 'Lord Aldermere & Pemberton', 'Marigold, Osric, Pip & Nell', 'Old Hoots', 'Tobias', 'and one very brave little possum', '', '',
      `#Your journey`, `Level ${G.S.lvl} · ${G.S.xp} experience`, `Golden leaves: ${G.S.leaves.length} / ${TOTAL_LEAVES}`, '', '',
      '#Played by', G.S.playerName || '', '', '', '#To be continued…', 'The Gateway awaits.', '', '', '',
    ].map(l => l.replace('{friend}', G.S.friendName)));
    await G.fade(false, 400);
  };

  // ------------------------------------------------------------------ CHAPTER SUMMARY
  const MAIN_BEATS = [
    ['A New Dawn', "Luminara set out with her mother's cloak, her father's compass and her golden lantern."],
    ["The Guild's Three Troubles", "Clover was shod, Lord Aldermere's seal was won with a pepper pie, and the lantern was filled."],
    ['Stew with {friend}', 'A promise made by the fire: "I will come back and tell you everything."'],
    ['The Thorn Road', 'Three waystones were lit again, and the Thornheart burned away to dust.'],
    ['The Gateway', 'Something waits beyond the red door. First, Luminara must find the key.'],
  ];
  const SIDE_STORIES = [
    { title: 'A Hot Pie & a Daydream', done: s => s.flags.pieEaten,
      yes: 'Luminara treated herself to a beef and pepper pie, and dreamed of riding a fire-breathing dragon.',
      no: s => s.flags.pieBought ? 'The pie went cold in her satchel, and the daydream of dragons never came.' : 'Luminara went the whole day without breakfast, and never had her daydream of dragons.',
      miss: 'a daydream and 10 experience' },
    { title: 'Precious Moments', done: s => s.flags.bf_rock1 && s.flags.bf_rock2 && s.flags.bf_rock3,
      yes: 'She stopped to watch the butterflies on all three rocks: moments she will always treasure.',
      no: 'Some of the butterflies fluttered away before Luminara stopped to watch them.',
      miss: 'a journal memory and 20 experience' },
    { title: 'The Runaway Ball', done: s => s.flags.ballReturned,
      yes: 'Pip and Nell got their ball back, and played happily on the green all afternoon.',
      no: "Pip and Nell's ball stayed stuck in the old oak. The green was very quiet that day.",
      miss: "Pip's shiny copper and 20 experience" },
    { title: 'A Wish at the Fountain', done: s => s.flags.wished,
      yes: 'Luminara wished that everyone she loves would stay safe, always.',
      no: 'No wish was made at the fountain.', miss: '3 experience' },
    { title: "Old Maud's Golden Leaves", done: s => s.flags.leavesDone,
      yes: "Old Maud shared a memory of Luminara's mother, and gave her Mother's silver thimble.",
      no: s => s.q.leaves ? `Only ${s.leaves.length} of 8 golden leaves were found, so Old Maud's memory of Luminara's mother stays untold.` : "Old Maud never got to share her memory of Luminara's mother.",
      miss: "Mother's silver thimble (+1 heart), 5 copper and 40 experience" },
    { title: "The Owl's Riddle", done: s => s.flags.owlDone,
      yes: 'Old Hoots was pleased with her answer, and gave her a feather to see further in the dark.',
      no: 'Old Hoots kept his riddle, and his feather, to himself.',
      miss: 'the Owl Feather and 20 experience' },
    { title: 'The Little Possum', done: s => s.flags.possumFree,
      yes: 'The young possum made it safely home, with a full tummy.',
      no: 'The young possum was left trembling in the hollow. Luminara never knew if it found its way home.',
      miss: '10 experience, and a little friend for Chapter Two' },
  ];
  function summaryHTML(s) {
    const fr = t => t.replace(/\{friend\}/g, s.friendName);
    const done = SIDE_STORIES.filter(d => d.done(s)).length;
    const mins = Math.max(1, Math.round((s.time || 0) / 60));
    let h = `<div class="sum"><h4 class="smain">The Story <span>main path · completed</span></h4><ul>`;
    for (const [t, b] of MAIN_BEATS) h += `<li class="ok">✓ <b>${fr(t)}</b> — ${fr(b)}</li>`;
    h += `</ul><h4 class="sside">Side Stories <span>optional · ${done} of ${SIDE_STORIES.length} found</span></h4><ul>`;
    for (const d of SIDE_STORIES) {
      if (d.done(s)) h += `<li class="ok">✓ <b>${d.title}</b> — ${typeof d.yes === 'function' ? d.yes(s) : d.yes}</li>`;
      else h += `<li class="no">✗ <b>${d.title}</b> — ${typeof d.no === 'function' ? d.no(s) : d.no} <span class="miss">Missed: ${d.miss}</span></li>`;
    }
    h += `</ul><h4>Your Journey</h4><p>Level ${s.lvl} · ${s.xp} experience · ${s.leaves.length} of ${TOTAL_LEAVES} golden leaves · ${s.coins} copper · played ${mins} min</p>`;
    if (done < SIDE_STORIES.length) h += `<p class="dim">Want to find what you missed? Start a new game in another save slot from <b>Players &amp; Saves</b>.</p>`;
    else h += `<p class="dim">Every side story found. What a true Light-Bearer!</p>`;
    return h + '</div>';
  }

  // ------------------------------------------------------------------ COMBINING
  const COMBOS = {
    'sugar+teaTin': async () => { G.take('teaTin'); G.take('sugar'); G.sfx('combine'); G.give('teaBlend', true); G.toast('Combined into <b>Sweet Tea Blend</b>', 'teaBlend'); await think('Floral green tea, sweetened with sugar. Just how I like it. Now for the stove!'); },
    'bentNail+luteString': async () => { G.take('bentNail'); G.take('luteString'); G.sfx('combine'); G.give('hookLine', true); G.toast('Combined into <b>Hook and Line</b>', 'hookLine'); await think("I tied the lute string to the bent nail. A hook and line! Now, the fountain…"); },
    'lantern+oil': async () => { G.take('lantern'); G.take('oil'); G.sfx('combine'); G.give('lanternBright', true); F().lanternFull = true; G.toast('Your lantern glows bright!', 'lantern'); G.questDone('oil'); await think('Much better! It glows like a little sun.'); },
  };
  async function combine(a, b) {
    const key = [a, b].sort().join('+');
    if (COMBOS[key]) return COMBOS[key]();
    G.sfx('no');
    const fails = ["Those two don't go together.", "Hmm, I can't see how to combine those.", "That won't work."];
    await think(fails[Math.floor(Math.random() * fails.length)]);
  }

  // ------------------------------------------------------------------ INTERACT ROUTER
  async function interact(t, heldItem) {
    if (heldItem) {
      G.setHeld(null);
      const h = USE[t.act];
      if (h && await h(heldItem, t)) return;
      G.sfx('no');
      return think(['That doesn\'t seem to work.', `I don't think the ${ITEMS[heldItem].name} will help here.`, 'Hmm, no.'][Math.floor(Math.random() * 3)]);
    }
    if (t.pickup === 'leaf') {
      const id = t.o.leafId; if (G.S.leaves.includes(id)) return;
      G.S.leaves.push(id); G.sfx('pick'); G.refresh();
      G.toast(`Golden Leaf (${G.S.leaves.length}/${TOTAL_LEAVES})`, 'goldLeaf'); G.addXP(5, true);
      if (!G.S.q.leaves) await think('A golden leaf! How lucky. It practically glows.');
      return;
    }
    if (t.enter) return G.go(t.enter[0], t.enter[1]);
    const h = ACT[t.act];
    if (h) return h(t);
    if (t.look) return nar(t.look);
  }

  // ------------------------------------------------------------------ GATES
  function gate(name) {
    const f = F();
    if (name === 'cottageDoor') {
      if (f.cloak && f.hasSatchel && f.gotCompass && f.hasLantern && (f.teaMade || f.teaDrunk)) return true;
      const miss = [];
      if (!f.hasSatchel) miss.push('my satchel'); if (!f.cloak) miss.push('my cloak'); if (!f.gotCompass) miss.push("Father's compass"); if (!f.hasLantern) miss.push('my lantern'); if (!f.teaMade && !f.teaDrunk) miss.push('my morning tea');
      return "I can't leave yet — I still need " + miss.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
    }
    if (name === 'westGate') {
      if (f.caravanLeft) return true;
      if (!f.metHollis) return "The road west leads into the Dark Forest. I should see what the guild needs of me first.";
      if (!f.caravanReady) return 'Not without the caravan. Once the three troubles are sorted, Tobias will meet me here.';
      return 'Tobias is waiting right here by the gate — I should talk to him.';
    }
    if (name === 'laneSouth') return f.teaDrunk ? true : "Before I set off, I'd love to drink my tea in my chair by the door, and watch the sun come up.";
    if (name === 'northTrail') return f.thornQuest ? true : 'The north trail leads deep into the Dark Forest. My job is to stay with the caravan.';
    if (name === 'westTrail') return f.vinesGone ? true : 'The vines block the road.';
    return true;
  }

  // ------------------------------------------------------------------ MAP HOOKS
  async function onEnter(id) {
    const f = F();
    if (id === 'town' && !f.arrivedTown) await arriveTown();
    if (id === 'deep_forest') await enterDeep();
    if (id === 'hollow') await enterHollow();
    if (id === 'gateway') await enterGateway();
    if (id === 'forest_edge' && f.vinesGone && !f.caravanGone) await returnToCaravan();
    if (id === 'hillside' && f.teaDrunk && G.S.q.totown === 'active' && !f.laneThought) {
      f.laneThought = true;
      await nar('Her walk into town was peaceful and pleasant. She heard the crunching of the leaves which had fallen from the majestic trees along the way — yellow, orange and brown.');
    }
  }
  function onLoad() { }
  function onFlash() { }
  function musicFor(id) { if (id === 'hollow' && F().heartBurned) return 'wonder'; return null; }
  function tintFor(id) {
    const f = F();
    if ((id === 'cottage' || id === 'hillside') && !f.teaDrunk) return 'dawn';
    if (id === 'forest_edge') return f.nightfall ? null : 'dusk';
    return null;
  }
  function darkFor(id) {
    const f = F();
    if (id === 'cottage' && !f.teaDrunk) return 0.28;
    if (id === 'forest_edge') return f.nightfall ? 0.78 : 0.45;
    if (id === 'deep_forest' && has('feather')) return 0.82;
    return null;
  }

  // ------------------------------------------------------------------ OBJECTIVE & COMPASS
  const LINKS = {
    cottage: { hillside: [6, 9] }, hillside: { cottage: [14, 6], town: [14, 33] },
    town: { hillside: [19, 0], guild: [24, 13], cauldron: [10, 30], forest_edge: [0, 21] }, guild: { town: [7, 10] }, cauldron: { town: [7, 10] },
    forest_edge: { town: [33, 11], deep_forest: [15, 0], gateway: [0, 11] }, deep_forest: { forest_edge: [20, 35], hollow: [33, 0] }, hollow: { deep_forest: [11, 17] }, gateway: { forest_edge: [27, 16] },
  };
  function route(from, to) {
    if (from === to) return null;
    const prev = { [from]: null }, q = [from];
    while (q.length) { const m = q.shift(); for (const n in LINKS[m]) if (!(n in prev)) { prev[n] = m; q.push(n); } }
    if (!(to in prev)) return null;
    let n = to; while (prev[n] !== from) n = prev[n];
    return n;
  }
  function goal() {
    const f = F(), s = G.S;
    if (!f.hasSatchel) return ['Find your satchel', 'cottage', 8, 7];
    if (!f.cloak) return ['Put on your blue cloak (wardrobe)', 'cottage', 3, 3];
    if (!f.gotCompass) return f.gotKey ? ["Use the brass key on your safekeeping box", 'cottage', 2, 4] : ['Find the key to your safekeeping box', 'cottage', 1, 4];
    if (!f.hasLantern) return ['Pick up your lantern from the table', 'cottage', 5, 6];
    if (!f.teaMade) return !has('teaBlend') ? ['Make sweet tea: find tea and sugar, then combine them', 'cottage', has('teaTin') ? 6 : 10, 3] : ['Use your sweet tea blend on the stove', 'cottage', 8, 3];
    if (!f.teaDrunk) return ['Drink your tea in the chair outside', 'hillside', 17, 7];
    if (!f.arrivedTown) return ['Walk down the leafy lane to Kraxenville', 'town', 19, 4];
    if (!f.metHollis && has('pie')) return ["Eat your pie on the bench by the fountain — or head to the Merchants' Guild", 'town', 21, 22];
    if (!f.metHollis) return ["Visit the Merchants' Guild", 'guild', 7, 3];
    if (!f.caravanReady) {
      if (checkCaravan()) return ['Report back to Guildmaster Hollis', 'guild', 7, 3];
      if (!f.lanternFull && has('oil')) return ['Combine the lamp oil with your lantern', null];
      if (!f.shod) {
        if (has('horseshoe')) return ['Bring the horseshoe to Bertram', 'town', 40, 20];
        if (!f.knowFountain) return ['Talk to Bertram at the Coach House (east)', 'town', 40, 20];
        if (has('hookLine')) return ['Use the hook and line on the fountain', 'town', 25, 21];
        if (has('luteString') && has('bentNail')) return ['Combine the lute string and the bent nail', null];
        if (!has('bentNail') && !f.gotNail) return ['Find something hook-shaped (Bertram mentioned the trough)', 'town', 45, 19];
        return ['Find something long and strong, like a string', 'town', 27, 23];
      }
      if (!f.writDelivered) {
        if (has('sealedWrit')) return ['Take the sealed writ to Guildmaster Hollis', 'guild', 7, 3];
        if (has('lordPie')) return ['Bring the pie to Pemberton at the manor gate', 'town', 41, 12];
        if (!f.needLordPie) return ["Ask for Lord Aldermere's seal at his manor (north-east)", 'town', 41, 12];
        if (!f.pellAsked) return ['Ask Mistress Pell at the Cookshop to bake a pie', 'town', 30, 37];
        if (has('pepper')) return ['Give the pepper to Mistress Pell', 'town', 30, 37];
        if (has('nectarines')) return ['Trade the nectarines with Osric for pepper', 'town', 29, 18];
        if (!f.osricTrade) return ['Find pepper — try the Lesterfield trader, Osric', 'town', 29, 18];
        if (f.ballReturned) return ['Collect the nectarines from Marigold', 'town', 22, 18];
        if (has('ball')) return ['Return the ball to Pip and Nell on the green', 'town', 13, 7];
        if (f.askedMarigold) return ['Get the ball down from the big oak (jump!)', 'town', 13, 5];
        return ['Ask Marigold for a basket of nectarines', 'town', 22, 18];
      }
      if (!f.lanternFull) return ['Find lamp oil — maybe at the Iron Cauldron', 'cauldron', 5, 6];
    }
    if (!f.caravanLeft) return ['Meet Tobias at the West Gate', 'town', 6, 22];
    if (!f.enteredDeep) return ['Jump the log and take the north trail', 'deep_forest', 20, 33];
    if (!f.mistGone) {
      for (const [i, x, y] of [[1, 7, 21], [2, 34, 21], [3, 5, 4]]) if (!f['ws' + i]) return ['Light the three waystones', 'deep_forest', x, y];
    }
    if (!f.foundHeart) return ['Find where the vines grow from, beyond the mist', 'hollow', 11, 8];
    if (!f.heartBurned) return ['Burn away the Thornheart with your lantern', 'hollow', 11, 8];
    if (!f.caravanGone) return f.possumFree ? ['Return to the caravan', 'forest_edge', 17, 11] : ['Help the frightened possum', 'hollow', 15, 9];
    if (!f.sawGateway) return ['Follow the west road to the Gateway', 'gateway', 14, 10];
    return ['Chapter One complete! More adventures coming soon…', null];
  }
  function objective() { return goal()[0]; }
  function compass(mapId) {
    const g = goal(); if (!g[1]) return null;
    if (g[1] === mapId) return { x: g[2], y: g[3] };
    const next = route(mapId, g[1]); if (!next) return null;
    const [x, y] = LINKS[mapId][next]; return { x, y };
  }

  // ------------------------------------------------------------------ JOURNAL
  const ENTRIES = {
    mother: ['The Blue Cloak', "Mother made my cloak from fine sheep's wool and stitched the embroidery along the hood herself. She finished it before she passed, when I was nineteen. We shared a deep, unbreakable bond. I wear it every day in the colder seasons."],
    father: ["Father's Compass", 'Father left for war when I was nine and never came home. He was a courageous man, a renowned warrior, who protected every innocent creature with his trusty axe, Doomcleaver. Before he went, he gave me this compass. Whenever the sadness comes, I hold it close.'],
    butterflies: ['Precious Moments', 'Butterflies resting on the big rocks along the lane. If only there were some way to capture moments like these…'],
    song: ["Fredrick's Warning", '"Doors of mystery should never be opened unless the traveller has a key." — an old song, as sung by Fredrick the bard.'],
    realm: ['The Kingdom of Krax', 'Kraxenville lies in the north-east. Brushwood, Wockville and Lesterfield lie to the south. The Dark Forest fills the middle of the kingdom, with the Ruined Keep at its heart. Beyond it, to the north and west, rise the mountains of Vosmos — and right in the middle of them, in the far north, a great volcano smokes.'],
    friend: ['{friend}', 'My dearest friend. We shared stew at the Iron Cauldron, and I promised to come back and tell her everything. My greatest fear is being left alone — but she says I never will be.'],
    possum: ['A Brave Little Possum', 'Deep in the Dark Forest, a young possum was caught in the thorns of the Thornheart. Once the thorns were gone, it gobbled up its supper and scampered home. I hope it finds its way to my cottage one night.'],
    maud: ["Old Maud's Secret", '"A light shared is a light doubled." Mother used to say that. She sewed by Maud\'s window when I was small.'],
  };
  function journal(s) {
    let h = '<h4>Memories & Discoveries</h4>';
    const keys = s.journal.filter(k => ENTRIES[k]);
    if (!keys.length) h += '<p>Nothing written yet.</p>';
    for (const k of keys) h += `<p><b>${ENTRIES[k][0].replace('{friend}', s.friendName)}</b><br>${ENTRIES[k][1].replace('{friend}', s.friendName)}</p>`;
    h += '<h4>Creatures</h4>';
    const cr = [];
    if (s.flags.foundHeart) cr.push('<b>The Thornheart</b> — a great knot of thorny roots that drank red light from the west. Its vines blocked the forest road.');
    if (s.flags.enteredDeep) cr.push('<b>Goblinites</b> — green, big-eared creatures wrapped in vines. They scuttle about the Dark Forest but cannot bear bright light.');
    if (s.flags.owlDone) cr.push('<b>Old Hoots</b> — a wise owl who loves a good riddle.');
    if (s.flags.sawGateway) cr.push('<b>???</b> — Something with burning eyes, beyond the Gateway.');
    h += cr.length ? cr.map(c => `<p>${c}</p>`).join('') : '<p>None yet.</p>';
    h += `<h4>Golden leaves</h4><p>${s.leaves.length} of ${TOTAL_LEAVES} found.</p>`;
    return h;
  }

  return { summaryHTML, ITEMS, QUESTS, TOTAL_LEAVES, SPEAKERS, intro, interact, combine, useSelf, gate, onEnter, onLoad, onFlash, objective, compass, journal, musicFor, tintFor, darkFor };
})();
