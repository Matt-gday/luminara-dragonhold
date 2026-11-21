// =====================================================================
//  CHAPTER ONE — "The Light-Bearer"
//  From Lisa's book, chapters 1 (The Light-Bearer) and 2 (The Journey).
//  Kraxenville → the Merchants' Guild → the road → Brushwood.
// =====================================================================
(() => {
  const { F, has, say, think, nar, L, journalAdd, pick, startQuest, finishQuest } = STORY.H;
  const ITEMS = {
    teaTin: { name: 'Tin of Green Tea', icon: 'teaTin', desc: 'Floral green tea leaves. Lovely — but even lovelier sweetened.' },
    sugar: { name: 'Sugar Pot', icon: 'sugar', desc: 'A little pot of sugar.' },
    teaBlend: { name: 'Sweet Tea Blend', icon: 'teaBlend', desc: 'Green tea leaves mixed with sugar. Now it just needs hot water from the stove.' },
    teaCup: { name: 'Cup of Green Tea', icon: 'teaCup', desc: 'Hot green tea with a floral scent, sweetened with sugar. Best enjoyed outside, watching the sunrise.', self: true, selfLabel: 'Sip' },
    brassKey: { name: 'Little Brass Key', icon: 'brassKey', desc: 'The key to your safekeeping box.' },
    compass: { name: "Father's Compass", icon: 'compass', desc: 'A special gift from your father before he left for war. It helps you keep track of your direction. (Its red needle shows the way to your next goal.)', self: true, selfLabel: 'Hold it close' },
    lantern: { name: 'Golden Lantern (empty)', icon: 'lanternDim', desc: 'Metal-framed with glass to protect the flame from strong winds. The tallow has burned away and the wick is frayed.' },
    lanternTallow: { name: 'Lantern (needs a wick)', icon: 'lanternDim', desc: 'Filled with fresh tallow. It still needs a new linen wick.' },
    lanternWick: { name: 'Lantern (needs tallow)', icon: 'lanternDim', desc: 'A new linen wick is threaded through. It still needs tallow.' },
    lanternReady: { name: 'Golden Lantern', icon: 'lantern', desc: 'Filled with tallow, made from the fat of cattle, with a twisted linen wick. Ready to light the way through the Dark Forest.' },
    flint: { name: 'Flint and Steel', icon: 'flint', desc: 'For lighting your lantern. Strike them together over a little tinder.' },
    rations: { name: 'Travelling Rations', icon: 'rations', desc: 'Nuts and dried fruit you prepared last night, for snacking on the road.', self: true, selfLabel: 'Snack' },
    tallow: { name: 'Pot of Tallow', icon: 'tallow', desc: 'Fresh tallow from the Iron Cauldron kitchen, made from the fat of cattle. It burns slow and steady.' },
    wick: { name: 'Linen Wick', icon: 'wick', desc: 'A twisted fibre wick made of linen.' },
    pie: { name: 'Beef & Pepper Pie', icon: 'pie', desc: 'Slow-cooked beef and pepper — your favourite. Hot and spicy! Best eaten sitting down.', self: true, selfLabel: 'Eat' },
    strongbox: { name: 'Mysterious Strongbox', icon: 'strongbox', desc: 'High-quality oak, trimmed with iron, with strong metal handles. The lock is slightly rusted. It makes a soft rattling sound. You must keep it safe — and not open it.', self: true, selfLabel: 'Listen' },
    guildKey: { name: 'Key to the Strongbox', icon: 'oddKey', desc: 'Round at the top, with a jagged edge. Kept safe in your satchel, the safest place of all.' },
    luteString: { name: 'Old Lute String', icon: 'luteString', desc: "A snapped string from Fredrick's lute. Long and very strong." },
    bentNail: { name: 'Bent Nail', icon: 'bentNail', desc: 'An old horseshoe nail, bent into a curl. It looks a bit like a hook…' },
    hookLine: { name: 'Hook and Line', icon: 'hookLine', desc: 'A lute string tied to a bent nail. Perfect for fishing things out of water!' },
    horseshoe: { name: "Clover's Horseshoe", icon: 'horseshoe', desc: 'Dripping wet, but it will fit Clover perfectly.' },
    ball: { name: "Children's Ball", icon: 'ball', desc: "Pip and Nell's ball. It's a bit scuffed from the tree." },
    thimble: { name: "Mother's Silver Thimble", icon: 'thimble', desc: "Mother's silver thimble, left at Old Maud's window long ago. Carrying it gives you courage: +1 heart.", self: true, selfLabel: 'Hold it close' },
    honeyCake: { name: 'Honey Cake', icon: 'honeyCake', desc: 'A sticky honey cake from Mistress Pell. Eating it restores all your hearts.', self: true, selfLabel: 'Eat' },
    sunstone: { name: 'Sunstone Charm', icon: 'sunstone', desc: 'A warm golden stone from the far south. When your lantern is lit and raised, it shines further and recovers faster.', self: true, selfLabel: 'Hold it up' },
    carrots: { name: 'Bunch of Carrots', icon: 'carrots', desc: 'From Kalen at the Brushwood Tavern — for the hungry horses.' },
    pail: { name: 'Pail of Water', icon: 'pail', desc: 'From Winston at the Brushwood Tavern — for the thirsty horses.' },
  };

  const LEAF_WHERE = [['hill1', 'near the top right of the leafy lane'], ['hill2', 'near the bottom left of the leafy lane'], ['town1', 'in the far south-west corner of town'], ['town2', 'at the far east edge of town, near the top'], ['manor', 'in the manor garden, north-east']];
  const QUESTS = {
    morning: { title: 'A New Dawn', desc: 'Get ready for the day ahead.', xp: 15, steps: [
      { t: 'Find your satchel', done: s => s.flags.hasSatchel, hint: ['It\'s somewhere in your cottage. Look near the door.', 'Your satchel is on the floor, a little to the right of the front door. {Act:it} to pick it up.'] },
      { t: 'Make a cup of sweet green tea', done: s => s.flags.teaMade, hint: s => s.inv.includes('teaBlend') ? ['The kettle is hot, over on the stove.', `Open your satchel, choose the Sweet Tea Blend, {btn:Use…}, then {act:the stove}.`]
        : s.inv.includes('teaTin') && s.inv.includes('sugar') ? ['Two things in your satchel belong together.', `Open your satchel, choose the tea, {btn:Combine…}, then choose the sugar.`]
        : ['Tea and sugar are kept along the kitchen wall.', 'The tea is in the cupboard on the right. The sugar is on the shelf, left of the stove.'] },
      { t: 'Drink it in your chair outside as the sun rises', done: s => s.flags.teaDrunk, hint: ['Luminara loves to drink her tea outside.', 'Go out of the front door. Your chair is just beside the cottage. {Act:it}.'] },
      { t: 'Put on the blue cloak Mother made', done: s => s.flags.cloak, hint: ['Where are clothes kept?', 'Your cloak is in the wardrobe, at the top left of the cottage.'] },
      { t: "Take Father's compass from the safekeeping box", done: s => s.flags.gotCompass, hint: s => s.flags.gotKey ? ['You have the little key now.', `Open your satchel, choose the brass key, {btn:Use…}, then {act:the box beside the bed}.`] : ['The box is locked. Where would you keep a key close while you sleep?', 'The key is under your pillow. {Act:your bed}.'] },
      { t: 'Take your lantern', done: s => s.flags.hasLantern, hint: ['Have a look on the table.', 'Your lantern is on the little table in the middle of the room.'] },
      { t: 'Pack your travelling rations', done: s => s.flags.gotRations, hint: ['Food is kept in the pantry.', '{Act:the barrel in the bottom-left corner of the cottage}.'] },
    ] },
    totown: { title: 'Into Kraxenville', desc: 'A day of guild work begins in town.', xp: 20, steps: [
      { t: 'Walk the leafy lane to Kraxenville', done: s => s.flags.arrivedTown, hint: ['Follow the lane downhill.', 'Walk down the path from your cottage, all the way to the bottom of the hill.'] },
      { t: 'Buy a hot pie at the bakery (down the alley, south of the market)', done: s => s.flags.pieBought, hint: ['Follow your nose, south of the market square.', 'Go down the alley south of the market. Mistress Pell is standing outside her shop. Talk to her.'] },
      { t: 'Eat it outside the pie shop', done: s => s.flags.pieEaten, hint: ['A pie tastes best sitting down.', '{Act:the bench right outside the pie shop}.'] },
      { t: 'Listen to Fredrick the bard by the fountain', done: s => s.flags.metFredrick, hint: ['Listen for the music.', 'Fredrick plays his lute just below the fountain in the market square. Talk to him.'] },
    ] },
    lantern: { title: 'Light for the Road', desc: 'Your lantern needs fresh tallow and a new wick before the Dark Forest.', xp: 20, steps: [
      { t: 'Get tallow (try the Iron Cauldron kitchen)', done: s => s.inv.includes('tallow') || s.flags.lanternReady || s.inv.includes('lanternTallow'), hint: ['Tallow is made in kitchens.', 'Ask Brenna, the cook inside the Iron Cauldron, south-west of the market.'] },
      { t: 'Get a linen wick (try the cloth stall in the market)', done: s => s.inv.includes('wick') || s.flags.lanternReady || s.inv.includes('lanternWick'), hint: ['Linen is cloth. Who sells cloth?', 'Talk to Tilda at the cloth stall with the green and white awning, below and to the left of the fountain.'] },
      { t: 'Fill your lantern (combine them with it)', done: s => s.flags.lanternReady, hint: ['Both go into the lantern, one at a time.', `Open your satchel, choose the lantern, {btn:Combine…}, then choose the tallow. Do the same again with the wick.`] },
    ] },
    journey: { title: 'The Journey', desc: "Escort the guild's goods from Kraxenville, first to Brushwood.", giver: 'Merchants\' Guild', xp: 40, steps: [
      { t: 'Find the caravan outside the Merchants\' Guild', done: s => s.flags.metCrew, hint: ['The Merchants\' Guild is near the top of town.', 'The wagons are in the yard just to the right of the Guild, the building with the green shield and crossed axes.'] },
      { t: 'Help fit the cargo onto the wagons', done: s => s.flags.cargoDone, hint: ['{Act:a wagon}, and start with the biggest piece.', 'Big crate in a corner, the two long casks turned upright beside it, and the four little barrels in a row along the bottom.'] },
      { t: 'Collect the strongbox and its key from Guild Master Henry', done: s => s.flags.gotStrongbox, hint: ['The Guild Master is inside.', 'Go in through the brown door beside the green shield with the crossed axes, and talk to Guild Master Henry.'] },
      { t: 'Get your lantern ready', done: s => s.flags.lanternReady, hint: ['See the quest <b>Light for the Road</b>, and ask for a hint there.'] },
      { t: 'Tell Gerald you are ready to set off', done: s => s.flags.departed, hint: ['Gerald is waiting by the wagons.', 'Talk to Gerald in the caravan yard. If you\'re not ready yet, he\'ll tell you what\'s left.'] },
    ] },
    brushwood: { title: 'First Stop: Brushwood', desc: 'Deliver the barrels to the Brushwood Tavern.', xp: 40, steps: [
      { t: 'Lead the caravan down the road to Brushwood', done: s => s.flags.atBrushwood, hint: ['Keep following the road.', 'Walk down the road to the bottom of the map.'] },
      { t: 'Feed and water the three horses', done: s => s.flags.horsesDone, hint: ['Kalen and Winston brought something for the horses.', '{Act:each of the three horses standing in front of the wagons}.'] },
      { t: 'Help bring the last barrel into the tavern', done: s => s.flags.lastBarrel, hint: ['The barrels are still on the wagons.', '{Act:one of the wagons}.'] },
      { t: 'Take a break: fill your water pouch at the well', done: s => s.flags.pouchFilled, hint: ['Where does a village get its water?', 'Go to the well, to the right of the wagons, and {act:it}.'] },
      { t: 'Collect the coins from Winston', done: s => s.flags.paid, hint: ['Winston looks after the tavern.', 'Talk to Winston, near the wagons.'] },
    ] },
    // ---- side stories (optional)
    moments: { title: 'Precious Moments', side: true, desc: 'Butterflies rest on the big rocks along the leafy lane.', xp: 20, steps: [
      { t: 'Watch the butterflies on the Mossy Rock', done: s => s.flags.bf_rock1, hint: ['The big rocks are along the leafy lane.', 'The Mossy Rock is on the left of the lane, near the top.'] }, { t: 'Watch the butterflies on the Big Rock', done: s => s.flags.bf_rock2, hint: ['The big rocks are along the leafy lane.', 'The Big Rock is on the right of the lane, about halfway down.'] }, { t: 'Watch the butterflies on the Sunny Rock', done: s => s.flags.bf_rock3, hint: ['The big rocks are along the leafy lane.', 'The Sunny Rock is on the left of the lane, near the bottom.'] }] },
    ball: { title: 'The Runaway Ball', side: true, desc: "Pip and Nell's ball is stuck up in the big oak by the north gate.", giver: 'Pip & Nell', xp: 20, steps: [
      { t: 'Get the ball down from the big oak (try jumping!)', done: s => s.flags.ballDown, hint: ['The ball is only just out of reach.', `Stand right under the ball in the big oak by the north gate, and {press:jump}.`] },
      { t: 'Return the ball to Pip and Nell', done: s => s.flags.ballReturned, hint: ['Pip and Nell are on the grass near the north gate.', 'Talk to the children.'] },
    ] },
    clover: { title: 'A Shoe for Clover', side: true, desc: 'Clover is meant to pull your wagon today, but she has thrown a shoe.', giver: 'Bertram', xp: 25, steps: [
      { t: 'Hear what happened from Bertram at the Coach House', done: s => s.flags.knowFountain, hint: ['Bertram is at the Coach House, on the east side of the square.'] },
      { t: 'Find something to use as a hook', done: s => s.flags.gotNail || s.flags.gotShoe, hint: ['Bertram mentioned something he dropped.', 'Look on the ground near the water trough by the Coach House. Something small is glinting.'] },
      { t: 'Find something long and strong to use as a line', done: s => s.flags.gotString || s.flags.gotShoe, hint: ['Did you hear something snap?', "Ask Fredrick, by the fountain, about his broken lute string."] },
      { t: 'Make a hook and line', done: s => s.inv.includes('hookLine') || s.flags.gotShoe, hint: ['Two things in your satchel belong together.', `Open your satchel, choose the string, {btn:Combine…}, then choose the nail.`] },
      { t: 'Fish the horseshoe out of the fountain', done: s => s.flags.gotShoe, hint: ['Where did the shoe go *plop*?', `Open your satchel, choose the hook and line, {btn:Use…}, then {act:the fountain}.`] },
      { t: 'Bring the horseshoe to Bertram', done: s => s.flags.shod, hint: ['Bertram can fit it.', 'Talk to Bertram at the Coach House.'] },
    ] },
    leaves: { title: "Old Maud's Golden Leaves", side: true, desc: 'Old Maud says five lucky golden leaves are hidden around Kraxenville and the leafy lane.', giver: 'Old Maud', xp: 40, steps: [
      { t: 'Find all 5 golden leaves', done: s => s.leaves.length >= 5, hint: s => ['Golden leaves hide in quiet corners and under big trees, on the leafy lane and around Kraxenville.', 'Still to find: ' + LEAF_WHERE.filter(([id]) => !s.leaves.includes(id)).map(([, w]) => w).join('; ') + '.'] }, { t: 'Show them to Old Maud', done: s => s.flags.leavesDone, hint: ['Old Maud is in the market square.', 'Talk to Old Maud, on the west side of the square.'] }] },
  };

  const SPEAKERS = {};
  const ACT = {}, USE = {}, SELF = {};
  async function needSatchel() { await L("I'd better find my satchel first, or I'll be dropping things all day."); }
  const morningDone = s => s.flags.hasSatchel && s.flags.teaDrunk && s.flags.cloak && s.flags.gotCompass && s.flags.hasLantern && s.flags.gotRations;
  async function checkMorning() {
    if (!morningDone(G.S) || G.S.q.morning === 'done') return;
    G.questDone('morning');
    await think('Everything I need. The guild has caravan work for me today — time to walk into town!');
    startQuest('totown');
  }

  // ================================================================ INTRO
  async function intro() {
    G.music('dawn');
    await G.wait(400);
    await nar('Luminara the Light-Bearer\n— Chapter One —', { big: true });
    G.sfx('tweet');
    await nar('It was the crack of dawn, and a bird called loudly.');
    await nar('Luminara awoke and prepared herself for the day ahead. She arose early each and every morning to enjoy its peacefulness.');
    await nar('She brushed and braided her long hazelnut hair, washed her soft, gentle face, and tied her brown leather shoes. She kept her fingernails trimmed short, as she often worked with her hands.');
    G.emote('luminara', '♪');
    await think('Another beautiful autumn morning. First, a cup of tea in my chair outside — then the guild has work for me.');
    G.questStart('morning');
    await G.tip('move'); await G.tip('goal'); await G.tip('quests'); await G.tip('menu');
  }

  // ================================================================ THE COTTAGE
  ACT.satchelPick = async () => {
    F().hasSatchel = true; G.sfx('pick'); G.notice('Got your <b>Satchel</b>', 'satchel', { kind: 'item', desc: 'Everything you pick up goes in here.' }); G.refresh();
    await think('My trusty leather satchel. Now I can carry things!');
    await G.tip('satchel');
    await checkMorning();
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
    await nar('At nine years old, Luminara lost her father. He had gone to war in a faraway land. A courageous man and renowned warrior, he fought on the front lines with his trusty axe, "Doomcleaver". He would protect all innocent creatures and any person threatened in their safety.');
    await nar('Among the treasures was a compass. She would carry it to keep track of her direction while journeying into the Dark Forest.');
    G.give('compass'); F().gotCompass = true; journalAdd('father');
    await nar('On this particular morning, Luminara placed the compass in her satchel, as she had a feeling she might need it later that day.');
    G.hud(); await G.tip('compass');
    await checkMorning(); return true;
  };
  ACT.wardrobe = async () => {
    if (F().cloak) return nar("An assortment of clothes — not many, as Luminara was not one to fuss with lavish outfits.");
    if (!F().teaDrunk) return think('My favourite cloak is in here. But tea first — I always start the day in my chair outside.');
    await nar('In the wardrobe was an assortment of clothes. There was one cloak that was her favourite. It was deep blue in colour and made of fine, quality sheep\'s wool. It fell from her shoulders, past her ankles and almost to the floor. Embroidery ran along the hood and down the front opening.');
    await nar("Luminara's beloved mother had made it for her before she passed. It was quite fortunate that her mother was able to complete the embroidery, as the cloak held such a strong meaning for her.");
    F().cloak = true; G.sfx('swish'); journalAdd('mother'); G.addXP(5, true);
    G.emote('luminara', '♥');
    await think('There. Now I feel ready for anything.');
    await checkMorning();
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
  ACT.pantry = async () => {
    if (!F().hasSatchel) return needSatchel();
    if (F().gotRations) return nar('The pantry barrel. Apples, oats, and a sack of potatoes.');
    F().gotRations = true; G.give('rations');
    await think('My travelling rations — nuts and dried fruit, packed last night. Perfect for the road.');
    await checkMorning();
  };
  ACT.stove = async () => {
    if (F().teaMade) return nar('The stove is still warm. The kettle ticks as it cools.');
    if (has('teaBlend')) { await L('The kettle is hot. I just need to use my sweet tea blend here.'); if (G.S.flags.tip_use) G.toast('Satchel → {act:the tea blend} → {btn:Use…} → {act:the stove}.'); await G.tip('use'); }
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
    F().hasLantern = true; G.give('lantern'); G.give('flint', true); G.refresh();
    await think("My golden lantern, with my flint and steel tucked beside it. Hmm… the tallow has all burned away, and the wick is frayed.");
    await think("I'll need fresh tallow and a new linen wick from town before the Dark Forest.");
    startQuest('lantern');
    await checkMorning();
  };

  // ================================================================ THE LEAFY LANE
  ACT.chair = async () => {
    if (F().teaDrunk) return nar('Your chair. The perfect place to watch the hills.');
    if (!has('teaCup')) return think("My favourite chair. I'll sit here once I've made my morning tea.");
    return drinkTea();
  };
  USE.chair = async (item) => { if (item !== 'teaCup') return false; await drinkTea(); return true; };
  async function drinkTea() {
    G.take('teaCup'); G.face('luminara', 'down'); G.sfx('sip');
    await nar('Luminara sat in a chair outside her tiny wooden cottage. She watched as the sun rose over the autumn hills of Kraxenville, the sun piercing through the clouds, bringing life and colour to the world.');
    await nar('She savoured her cup of hot green tea. It gave off a floral scent and was sweetened with sugar.');
    F().teaDrunk = true; G.music('dawn');
    await nar("Luminara's curiosity led her on many adventures, particularly through the Dark Forest. According to old legends, the Dark Forest concealed secrets waiting to be discovered by wanderers who dared to venture into it.");
    await nar('Lately, there were strange rumours spreading in Kraxenville. The villagers spoke of a magical passage that had opened in the depths of the Dark Forest. The talk of the town was that it led to another world, where mysterious creatures resided.');
    const miss = [];
    if (!F().cloak) miss.push('my cloak'); if (!F().gotCompass) miss.push("Father's compass"); if (!F().hasLantern) miss.push('my lantern'); if (!F().gotRations) miss.push('my rations');
    if (miss.length) await think('Now to get ready. Inside for ' + miss.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.');
    await checkMorning();
  }
  ACT.butterflyRock = async (t) => {
    const id = t.id; startQuest('moments');
    if (!F()['bf_' + id]) {
      F()['bf_' + id] = true; G.emote('luminara', '♥');
      await nar('Luminara stopped to admire the butterflies and birds perched on the rock.');
      await think('*If only there was some way to capture these precious moments…*');
      journalAdd('butterflies');
      if (F().bf_rock1 && F().bf_rock2 && F().bf_rock3) G.questDone('moments');
      else G.addXP(5);
    } else await nar('The butterflies flutter about, perfectly happy.');
  };

  // ================================================================ KRAXENVILLE
  async function arriveTown() {
    F().arrivedTown = true;
    await nar('Her walk into town was peaceful and pleasant. She heard the crunching of the leaves which had fallen from the majestic trees along the way.');
    await nar('She arrived at Kraxenville, and heard much chatter from the local villagers. There were young children playing ball on the grassy area near the front entrance.');
    await nar('There were merchants and market vendors calling out.');
    G.camTo(25.5 * 16, 19 * 16); await G.wait(900);
    await say('marigold', 'Fresh nectarines! Picked this morning!');
    await say('osric', 'Come, see what we have brought in from Lesterfield today!');
    await G.camTo(null);
    await think("I'm quite hungry after that long walk. The bakery is further into town — down the alley, south of the market square.");
  }
  ACT.baker = async () => {
    const f = F();
    if (!f.pieBought) {
      await say('baker', "Morning, Light-Bearer! Hot pies, fresh from the oven.");
      const c = await G.choice('luminara', 'What shall I have?', ['A slow-cooked beef and pepper pie, please (4 copper)', 'Just looking, thank you']);
      if (c === 1) return say('baker', 'Come back when your tummy rumbles!');
      if (G.S.coins >= 4) G.addCoins(-4);
      else { await say('baker', "Short of copper? Pay me next time, love — I know you're good for it."); f.pieOnCredit = true; }
      f.pieBought = true; G.give('pie');
      await nar('Pepper was expensive at the time, but she treated herself anyway. The beef and pepper pie was her favourite.');
      await think("I'll sit down outside the pie shop to eat it — there's a bench right here.");
      return;
    }
    if (f.pieOnCredit && G.S.coins >= 4) {
      f.pieOnCredit = false; G.addCoins(-4);
      await L("And here's the 4 copper I owe you for the pie, Mistress Pell.");
      await say('baker', "Honest as the day is long! Your mother raised you right, love.");
    }
    await say('baker', pick(["Mind the pastry, it's hot!", "The secret is patience. And butter. Mostly butter.", 'Did you hear? They say a door has opened in the Dark Forest. Gives me the shivers.']));
    if (has('honeyCake')) return;
    const c = await G.choice('luminara', '*Golden honey cakes are cooling on the counter.*', ['A honey cake, please (2 copper) — restores all hearts', 'No thank you']);
    if (c !== 0) return;
    if (G.S.coins < 2) return say('baker', "Oh dear, that's not quite enough copper, love.");
    G.addCoins(-2); G.give('honeyCake'); await say('baker', 'Good for the heart, and good for courage too. Save it for when you need it!');
  };
  ACT.cookDoor = async () => nar("The Cookshop's kitchen is through here — but Mistress Pell serves her pies out front.");
  ACT.bench = async () => {
    if (has('pie')) return eatPie();
    await nar('A bench outside the pie shop. A lovely place to sit and watch Kraxenville go by.');
  };
  ACT.benchSquare = async () => {
    if (has('pie')) return think("I'll eat my pie on the bench outside the pie shop — it's still warm from the oven.");
    await nar('A bench by the fountain. The water splashes softly.');
  };
  const nearPieShop = () => G.M.id === 'town' && Math.hypot(G.player.x / 16 - 25, G.player.y / 16 - 38.5) < 5;
  async function eatPie() {
    G.take('pie'); F().pieEaten = true; G.sfx('munch');
    G.S.hearts = G.S.maxHearts; G.hud();
    await nar('Although it was hot and spicy in its flavour, she relished the pie. Its hearty filling broke her long fast. The flavours exploded in her mouth, with gravy seeping out of it.');
    await G.fade(true, 900);
    G.music('wonder');
    await nar('Luminara sat for some time outside the pie shop, lost in a daydream. She fantasised about mythical creatures from distant lands, and imagined what it might be like to ride upon the back of a fire-breathing dragon…');
    G.sfx('roar');
    await G.wait(600);
    await G.fade(false, 900);
    G.music('town');
    G.addXP(5, true);
    if (!F().metFredrick) {
      G.sfx('lute');
      await nar("It wasn't too long after that she heard one of the local bards, plucking his lute and humming an old tune that she recognised. His name was Fredrick.");
      await think("That's Fredrick's tune! He'll be by the fountain.");
    } else await think('That hit the spot. Now — the caravan!');
  }
  ACT.fredrick = async () => {
    const f = F();
    if (!f.metFredrick) {
      G.sfx('lute');
      const c = await G.choice('luminara', '*Fredrick is plucking his lute and humming an old tune.*', ['Donate a few copper coins', 'Just listen']);
      if (c === 0 && G.S.coins > 0) { G.addCoins(-Math.min(2, G.S.coins)); await say('fredrick', 'Thank you, that is very kind of you.'); G.addXP(5, true); f.donated = true; }
      else if (c === 0) { await L("Oh — my purse is empty. I'm sorry, Fredrick."); await say('fredrick', 'No matter! A friendly ear is payment enough.'); }
      await L('Have you heard about the rumours of a magical gateway in the Dark Forest?');
      await say('fredrick', "Yes, of course! The talk is all through the town. I was turning it into a song. I, too, wonder what lies on the other side, but I won't be going into the forest any time soon, that's for sure!");
      await say('fredrick', 'Old songs speak of such danger, warning: *doors of mystery should never be opened unless the traveller has a key*.');
      await L('That is fascinating. Enjoy your day.');
      f.metFredrick = true; journalAdd('song');
      if (!(f.knowFountain && !f.gotString && !f.shod)) return;
    }
    if (f.knowFountain && !f.gotString && !f.shod) {
      await L('Fredrick, I need something long and strong, like a fishing line…');
      await say('fredrick', f.stringSnapped ? "You heard that, did you? Snapped clean in two! It's no good for music now — but it's strong as anything. Take it, with my blessing!" : "Strange you should ask! A string snapped on my lute this very morning, right in the middle of a verse. It's no good for music now — but it's strong as anything. Take it!");
      f.gotString = true; G.give('luteString'); return;
    }
    G.sfx('lute'); await say('fredrick', ['♪ Through the forest dark and deep, where the old stones softly sleep… ♪', '♪ Oh, the Light-Bearer walks where the shadows grow… ♪', "I'm still looking for a word that rhymes with 'gateway'. 'Straightaway'? Hmm.", '♪ Doors of mystery, doors of night — never open without a key… ♪'][(f.fredT = ((f.fredT || 0) + 1)) % 4]);
  };
  ACT.marigold = async () => {
    const f = F();
    if (f.ballReturned && !f.marigoldThanked) {
      f.marigoldThanked = true;
      await say('marigold', "Oh! It was you who fetched Pip and Nell's ball down from the big oak, wasn't it? They're playing on the green now, and not one nectarine has been squashed since. Thank you, dear!");
      await say('marigold', 'Here — have a nectarine. Picked this morning!');
      G.sfx('munch'); G.addXP(5, true);
      return think('Mmm! Sweet as honey, and so juicy.');
    }
    await say('marigold', pick(['Fresh nectarines! Picked this morning!', 'Juicy as sunshine, sweet as honey!', "If you see a goose called Duchess, she owes me three nectarines.", "Those two scamps keep kicking their ball into my fruit — now it's stuck up in the big oak!"]));
  };
  ACT.osric = async () => {
    await say('osric', pick(['Come, see what we have brought in from Lesterfield today!', 'Silks from Wockville, spices from the south, and the finest pepper in Krax!', "The road from Lesterfield goes through the Dark Forest. I'd not do it without the Light-Bearer, I tell you."]));
    if (has('sunstone')) return;
    const c = await G.choice('luminara', '*A little golden stone glows warmly on his stall.*', ['A sunstone charm (8 copper) — makes a raised lantern stronger', 'Just looking']);
    if (c !== 0) return;
    if (G.S.coins < 8) return say('osric', "Eight copper, friend. Come back when your purse is heavier!");
    G.addCoins(-8); G.give('sunstone'); F().sunstone = true;
    await say('osric', "Hold it up with a lit lantern and see how the darkness runs! It soaks up sunshine all day long.");
  };
  ACT.tilda = async () => {
    const f = F();
    if (G.S.q.lantern === 'active' && !has('wick') && !f.lanternReady && !has('lanternWick')) {
      await L('Good morning, Tilda. Do you have a linen wick for my lantern?');
      await say('tilda', 'For the Light-Bearer? Of course! Twisted linen — it burns clean and true. One copper, if you can spare it.');
      if (G.S.coins > 0) G.addCoins(-1); else await say('tilda', 'No copper? Never mind, dear. Bring me back a story from the forest instead.');
      G.give('wick'); return;
    }
    await say('tilda', pick(['Bolts of bright cloth from Wockville! Wool, linen and silk.', 'That cloak of yours — such fine embroidery. Your mother had golden hands.', 'Mind the geese, dear. Duchess bit my bonnet clean off on Tuesday.']));
  };
  ACT.kids = async () => {
    const f = F();
    if (f.ballReturned) return say(Math.random() < 0.5 ? 'kid1' : 'kid2', pick(["Thank you, Light-Bearer! We're playing on the green now, so we don't squash Marigold's fruit.", 'Can you jump that high every day?', "When I grow up I'm going to carry a lantern too!"]));
    if (has('ball')) return USE.kids('ball');
    await say('kid1', "Our ball's stuck up in the big oak tree! It's ever so high.");
    await say('kid2', "You're tall. Can you jump for it? Pleeease?");
    f.kidsAsked = true; startQuest('ball');
    await G.tip('jump');
  };
  USE.kids = async (item) => {
    if (item !== 'ball') return false;
    G.take('ball'); F().ballReturned = true; G.emote('kid1', '♥'); G.emote('kid2', '♥');
    await say('kid1', 'Our ball! Thank you, thank you!');
    await say('kid2', "We'll play here on the green from now on. We promise not to kick it into Marigold's fruit.");
    await say('kid1', 'Here — a shiny copper from my piggy bank!');
    G.addCoins(1); finishQuest('ball');
    return true;
  };
  ACT.ballTree = async () => {
    if (F().ballDown) return nar('A grand old oak, glowing orange with autumn leaves.');
    if (!F().kidsAsked) return think('A ball is wedged up in the branches of the old oak. It must belong to those two children on the green.');
    await think("Pip and Nell's ball is wedged in the low branches, just out of reach. If I stand right underneath and jump…");
    if (G.S.flags.tip_jump) G.toast('{Press:jump} to jump!'); await G.tip('jump');
  };
  ACT.ballTreeJump = async () => {
    if (F().ballDown) return;
    F().ballDown = true; G.sfx('leaf'); G.sfx('pop'); G.refresh();
    for (let i = 0; i < 12; i++) G.particles({ kind: 'leaf', x: G.player.x + (Math.random() - 0.5) * 30, y: G.player.y - 40 - Math.random() * 10, vx: (Math.random() - 0.5) * 10, vy: 10 + Math.random() * 20, ph: Math.random() * 6, c: ['#e0902a', '#e8c040', '#c05030'][i % 3], t: 3 });
    G.give('ball'); startQuest('ball');
    await think('Got it! Down came the ball — and half the leaves on the tree. It must belong to Pip and Nell, the children on the green. I should give it back to them.');
  };
  // ---- A Shoe for Clover (side story)
  ACT.bertram = async () => {
    const f = F();
    if (has('horseshoe')) return USE.bertram('horseshoe');
    if (f.shod) return say('bertram', "Clover's right as rain now. She'll pull your wagon all the way, Light-Bearer.");
    if (f.departed) return say('bertram', 'Poor Clover. Next time, eh?');
    if (!f.knowFountain) {
      await say('bertram', "Oh, Light-Bearer, what a morning! Clover's meant to pull your guild wagon today — but she took fright at the geese, bolted round the fountain, and her shoe flew clean off! I heard it go *plop*, right into the water.");
      await say('bertram', "The fountain's deep in the middle and cold as winter. My old arms can't reach, and I've no tackle for fishing.");
      await L('If I can fish it out, can you fit it again?');
      await say('bertram', f.gotNail ? "Quick as a wink — I've nails aplenty." : "Quick as a wink — I've nails aplenty. Well… I had. One rolled off somewhere by the trough.");
      f.knowFountain = true; startQuest('clover');
      await think('Something to fish with… I need a hook, and a line strong enough to pull up a horseshoe.');
      return stringSnaps();
    }
    await say('bertram', "Any luck with the horseshoe? It's sat at the bottom of the fountain, sure as eggs.");

  };
  // Just as Luminara needs a line, Fredrick's lute string snaps across the square (the camera pans to show it).
  async function stringSnaps() {
    const f = F(); if (f.stringSnapped || f.gotString) return;
    const fr = G.npc('fredrick'); if (!fr) return;
    f.stringSnapped = true;
    G.sfx('lute'); await G.camTo(fr.x, fr.y - 20);
    G.sfx('snap'); G.emote('fredrick', '!'); await G.wait(500);
    await say('fredrick', 'Oh, fiddlesticks! My lute string just snapped — right in the middle of my best verse!');
    await G.camTo(null);
  }
  USE.bertram = async (item) => {
    if (item !== 'horseshoe') return false;
    G.take('horseshoe'); F().shod = true;
    await say('bertram', "You found it! Light-Bearer, you're a marvel!");
    G.sfx('door'); await G.wait(250); G.sfx('ding'); await G.wait(250); G.sfx('ding');
    G.emote('clover', '♥');
    await say('bertram', "There we are — good as new. Clover will pull your wagon all the way to Lesterfield and back.");
    G.addCoins(2); finishQuest('clover');
    return true;
  };
  USE.clover = async (item) => { if (item !== 'horseshoe') return false; await think('Bertram should be the one to fit it.'); return true; };
  ACT.clover = async () => {
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
      return think("It's too deep and cold to reach by hand.");
    }
    if (!f.wished) {
      const c = await G.choice('luminara', '*The fountain sparkles in the sunlight. Coins glitter on the bottom.*', ['Toss in a copper and make a wish', 'Just admire it']);
      if (c === 0 && G.S.coins > 0) { G.addCoins(-1); G.sfx('splash'); f.wished = true; await think('I wish… that everyone I love stays safe, always.'); G.addXP(3); }
      else if (c === 0) await think("I haven't a single copper to toss in. Another time.");
      return;
    }
    await nar('The fountain sparkles. Water splashes softly from the top.');
  };
  USE.fountain = async (item) => {
    if (item === 'luteString' || item === 'bentNail') {
      await think("On its own, that won't fish anything out.");
      return true;
    }
    if (item !== 'hookLine') return false;
    if (F().gotShoe) { await think("I've already fished out the horseshoe."); return true; }
    G.sfx('splash'); await nar('Luminara lowered the hook into the fountain, slowly, slowly… a tug!');
    G.take('hookLine'); F().gotShoe = true; G.give('horseshoe'); G.addCoins(3);
    await think("Clover's horseshoe! And a few coppers somebody wished upon. I'm sure they won't mind.");
    return true;
  };
  ACT.noticeBoard = async () => nar('Notices flutter on the board:\n• CARAVAN TO BRUSHWOOD & LESTERFIELD — leaves this morning. Light-Bearer leading.\n• LOST: One goose. Answers to "Duchess". Bites.\n• BEWARE: Strange creatures sighted in the Dark Forest. Travel with a guide!');
  ACT.mapTable = async () => {
    await nar('A map of the Kingdom of Krax. Kraxenville sits in the north-east. The road runs south to Brushwood, Wockville and Lesterfield. The Dark Forest sprawls across the middle of the kingdom, with the mountains of Vosmos to the north — where a great volcano smokes.');
    await nar('Someone has drawn a little glowing door in the far west of the forest, with a question mark beside it.');
    journalAdd('realm'); F().sawMap = true;
    await G.tip('map');
    G.openPanel('map');
  };
  ACT.tavernDoor = async () => nar('Laughter and singing spill out of the tavern. It is far too rowdy for this early in the day.');
  ACT.coachDoor = async () => nar('The Coach House stables. It smells of hay and horses. Bertram is out in the yard.');
  ACT.hallDoor = async () => nar("The Merchant's Hall is closed — a sign says COUNTING. PLEASE DO NOT DISTURB.");
  ACT.manorDoor = async () => nar("Lord Aldermere's grand front door. You'd better not knock without being invited.");
  ACT.pemberton = async () => say('pemberton', pick(['Good morning. His Lordship is not receiving visitors today, but you may admire the garden.', 'Lord Aldermere is very particular about his roses. Please do not sniff them too hard.']));
  ACT.villagerA = async () => say('vA', pick(["They say a magic door has opened in the Dark Forest. My cousin's goat went missing near the Ruined Keep. Coincidence? I think not!", 'Lovely day for it, Light-Bearer.', "Have you seen a goose called Duchess? Nobody likes her, but we'd like her back."]));
  ACT.villagerC = async () => say('vC', pick(['Strange creatures in the Dark Forest, they say. Walking about where no creature ought to walk.', "The guild pays well, but I wouldn't walk that forest for all the copper in Krax."]));
  ACT.villagerB = async () => {
    const f = F(), n = G.S.leaves.length, N = STORY.TOTAL_LEAVES;
    if (!G.S.q.leaves) {
      await say('vB', 'When I was a girl, we hunted for golden leaves every autumn. Lucky, they are!');
      await say('vB', `They say there are ${N} hidden about Kraxenville and the leafy lane. Bring me all ${N} and I'll tell you something about your mother.`);
      G.questStart('leaves');
      if (n > 0 && n < N) return say('vB', `Oh! You've found ${n} already? Clever thing. Keep looking!`);
      if (n < N) return;
    }
    if (f.leavesDone) return say('vB', 'Remember, dear: a light shared is a light doubled.');
    if (n >= N) {
      f.leavesDone = true;
      await say('vB', `All ${N}! Oh, look how they shine. You have the eyes of a true adventurer.`);
      await say('vB', "Here's what I promised: a light shared is a light doubled. Your mother used to say that, you know. She sewed by my window when you were small.");
      await say('vB', "And this… she left it on my windowsill the last time she came. I've kept it safe for you all these years.");
      G.give('thimble'); G.S.maxHearts = Math.min(9, G.S.maxHearts + 1); G.S.hearts = G.S.maxHearts; G.hud();
      G.notice("Mother's thimble gives you courage: <b>+1 heart</b>", 'thimble', { kind: 'lvl' });
      G.addCoins(5); G.questDone('leaves'); journalAdd('maud'); return;
    }
    await say('vB', `${n} golden leaf${n === 1 ? '' : 'ves'} so far! Keep looking — they like quiet corners and the shade of big trees.`);
  };

  // ---- the Iron Cauldron: tallow for the lantern
  ACT.innkeeper = async () => {
    const f = F();
    if (G.S.q.lantern === 'active' && !has('tallow') && !f.lanternReady && !has('lanternTallow')) {
      await L('Brenna, could I have a little tallow for my lantern? It has burned right down.');
      await say('innkeeper', "Of course, love — we render it from the fat of cattle right here in the kitchen. Burns slow and steady. Here's a fresh pot.");
      G.give('tallow');
      if (has('wick') || has('lanternWick')) await think('Tallow and wick — now to put them in my lantern.');
      return;
    }
    await say('innkeeper', pick(["Welcome to the Iron Cauldron! Stew's on, fire's lit.", "That cauldron's been simmering since my grandmother's day. Never once gone cold.", 'Off with the caravan today, Light-Bearer? Mind how you go in that forest.']));
  };
  ACT.patron = async () => say('patron', pick(['Rabbit stew in Lesterfield is good, but nothing beats Brenna\'s.', "Heard the guild's sending a strongbox south today. Wonder what's in it?"]));

  // ---- the Merchants' Guild: Gerald, Aldric and Ronald, and Guild Master Henry
  async function crewScene() {
    const f = F(); if (f.metCrew) return; f.metCrew = true;
    await nar('Luminara arrived at the Kraxenville Guild. There was a sign hanging from the side of the guild house. It was dark green and in the shape of a shield, with a golden star at the top and two large axes crossed over one another in the centre. That was the emblem of the guild.');
    await nar('Wagon loaders were pacing back and forth, lifting barrels and crates and hauling them onto the backs of the wagons.');
    await say('gerald', "Whoa, hold up! There isn't any more room for that cask on the wagon! It will have to wait until the next trip.");
    await say('aldric', 'I can make it fit.');
    await say('ronald', 'I doubt that.');
    await L('Are we setting off soon, or is there more cargo to be loaded onto the wagons?');
    await say('gerald', 'We need an extra pair of hands. Why don\'t you hop on and help?');
    await nar('Rarely did Gerald do any hard work for the guild. Whenever work needed to be done, he would order people around and point his finger about. Not one person in the guild could remember a time when he was actually doing anything productive.');
    startQuest('journey');
    await think("The cargo is in a muddle. If I move things around, I'm sure everything will fit. ({Act:the wagon}.)");
  }
  ACT.crew = async (t) => {
    const f = F(), who = t.id;
    if (!f.metCrew) return crewScene();
    if (who === 'gerald') return geraldTalk();
    if (who === 'aldric') return say('aldric', f.cargoDone ? "Told you I could make it fit. Well — you made it fit." : 'I can make it fit. I just need a little help!');
    if (who === 'ronald') return say('ronald', f.cargoDone ? "Hmph. Well, I'll be. It all fits." : 'I doubt that cask is going anywhere today.');
  };
  async function geraldTalk() {
    const f = F();
    if (!f.cargoDone) return say('gerald', "Well? Those wagons won't load themselves. Off you go — I'll supervise.");
    const left = [];
    if (!f.gotStrongbox) left.push("Guild Master Henry wants a word inside — something about a strongbox");
    if (!f.lanternReady) left.push("you'll want your lantern ready for the forest");
    if (!f.pieEaten) left.push("have you eaten? It's a long road, and I'll not have you fainting on my wagons");
    if (!f.metFredrick) left.push("and Fredrick was asking after you by the fountain — says he's writing a song about that gateway");
    if (left.length) return say('gerald', 'Nearly ready. But ' + left.join('; ') + '.');
    return departure();
  }
  ACT.cargo = async () => {
    const f = F();
    if (!f.metCrew) return crewScene();
    if (f.cargoDone) return nar('Barrels and crates, packed snugly and roped down tight.');
    await nar('The wagon bed is a muddle of crates, casks and barrels — and one great cask is left over on the ground.');
    await G.cargoPuzzle();
    f.cargoDone = true; G.sfx('done'); G.addXP(15);
    await nar('Luminara assisted with rearranging the cargo until all the barrels fit neatly onto the wagons.');
    await say('aldric', 'See? I said it would fit!');
    await say('ronald', 'You said *you* could make it fit.');
    await think('*This is going to set us back a bit and shorten our travelling time.*');
  };
  ACT.henry = async () => {
    const f = F();
    if (!f.gotStrongbox) {
      await say('henry', "Ah, Luminara — the Light-Bearer! The caravan leaves for Brushwood and Lesterfield this morning, and I have a special task for you.");
      await say('henry', 'This strongbox must be delivered to Jorren, at the Lesterfield Tavern. You are to be the guild carrier of it. Keep it safe… and do not open it.');
      G.give('strongbox');
      await say('henry', 'And here is its key. Keep it somewhere safer still.');
      G.give('guildKey');
      await nar('It looked expensive, crafted with impeccable skill from high-quality oak, trimmed with iron, with strong metal handles. The lock appeared to be slightly rusted, as it had obviously been exposed to the elements. It made a soft rattling sound.');
      await nar('Luminara kept the key in her leather satchel, as it was the safest place to hold it.');
      f.gotStrongbox = true; journalAdd('strongbox'); startQuest('journey');
      if (!f.metCrew) await say('henry', 'Gerald and the loaders are outside with the wagons. Off you go!');
      return;
    }
    await say('henry', pick(['Keep that strongbox safe, Light-Bearer.', 'Jorren will be waiting for it in Lesterfield.', "I've heard the rumours about the Dark Forest. Keep your lantern bright."]));
  };
  SELF.strongbox = async () => { G.sfx('crack'); await nar('Luminara gave the strongbox a gentle shake. Something inside made a soft rattling sound.'); await think('I wonder what is inside… No. I promised to keep it safe, and not open it.'); };
  const temptation = async () => { F().tempted = (F().tempted || 0) + 1; await nar('The temptation to look was there, but Luminara respected the request.'); await think('Henry said not to open it. And I always keep my word.'); };

  async function departure() {
    const f = F();
    await say('gerald', 'Right then! Everything stowed? Good. Good work, everyone — especially me.');
    await nar('Luminara checked that the cargo was secured in place and waited until the rest of the caravan crew were ready to depart from the guild. One final call remained before the journey would begin.');
    await say('aldric', "All right, we are set to go. The sky is clear this morning. Let's not waste any time. First stop: Brushwood.");
    f.departed = true; G.questDone('totown'); finishQuest('journey');
    G.questStart('brushwood');
    await G.fade(true, 800);
    G.loadMap('road', 'north');
    G.setParty(caravanParty());
    await G.fade(false, 800);
    G.music('town');
    await nar('Luminara led Aldric and Ronald along the road with the caravan. She held the horse\'s reins securely, and looked at the open road ahead.');
    await say('luminara', 'Hiyah!');
    await nar('And off they journeyed along the rocky road towards Brushwood. The sound of horse hooves hitting the road made a steady clip-clop.');
    if (!f.shod) await think(f.knowFountain ? 'Poor Clover had to stay behind with a bare hoof — old Biscuit is pulling my wagon today. Slowly.' : "Old Biscuit is pulling my wagon today, instead of Clover. Slowly. I wonder what happened to Clover?");
  }
  function caravanParty() {
    const f = F();
    return [
      { kind: 'drive', id: f.shod ? 'clover' : 'biscuit', char: f.shod ? 'horse' : 'horseCream', name: f.shod ? 'Clover' : 'Biscuit' },
      { id: 'aldric', kind: 'rig', char: 'horseDark', driver: 'aldric', name: 'Aldric', color: '#4a7a9a', gap: 90 },
      { id: 'ronald', kind: 'rig', char: 'horseGrey', driver: 'ronald', name: 'Ronald', color: '#7a5a3a', gap: 90 },
    ];
  }

  // ---- combining
  const COMBOS = {
    'sugar+teaTin': async () => { G.take('teaTin'); G.take('sugar'); G.sfx('combine'); G.give('teaBlend', true); G.notice('Combined into <b>Sweet Tea Blend</b>', 'teaBlend', { kind: 'item', desc: ITEMS.teaBlend.desc }); await think('Floral green tea, sweetened with sugar. Just how I like it. Now for the stove!'); },
    'bentNail+luteString': async () => { G.take('bentNail'); G.take('luteString'); G.sfx('combine'); G.give('hookLine', true); G.notice('Combined into <b>Hook and Line</b>', 'hookLine', { kind: 'item', desc: ITEMS.hookLine.desc }); await think("I tied the lute string to the bent nail. A hook and line! Now, the fountain…"); },
    'lantern+tallow': async () => { G.take('lantern'); G.take('tallow'); G.sfx('combine'); G.give('lanternTallow', true); G.notice('Lantern filled with <b>tallow</b>', 'tallow', { kind: 'item', desc: ITEMS.lanternTallow.desc }); await think('Fresh tallow. Now it just needs a wick.'); },
    'lantern+wick': async () => { G.take('lantern'); G.take('wick'); G.sfx('combine'); G.give('lanternWick', true); G.notice('New <b>wick</b> threaded', 'wick', { kind: 'item', desc: ITEMS.lanternWick.desc }); await think('A new wick. Now it just needs tallow.'); },
    'lanternTallow+wick': async () => { G.take('lanternTallow'); G.take('wick'); readyLantern(); },
    'lanternWick+tallow': async () => { G.take('lanternWick'); G.take('tallow'); readyLantern(); },
    'tallow+wick': async () => { await think("They belong in my lantern. I should combine each of them with the lantern."); },
    'guildKey+strongbox': temptation,
  };
  async function readyLantern() {
    G.sfx('combine'); G.give('lanternReady', true); F().lanternReady = true; G.notice('Your lantern is <b>ready for the road</b>', 'lantern', { kind: 'item', desc: ITEMS.lanternReady.desc });
    finishQuest('lantern');
    await think('Tallow and a twisted linen wick. My lantern is ready to light the way through the Dark Forest.');
  }

  // ---- using items on themselves
  Object.assign(SELF, {
    honeyCake: async () => {
      if (G.S.hearts >= G.S.maxHearts) return think("I'm feeling brave enough right now. I'll save the honey cake for when I need it.");
      G.take('honeyCake'); G.sfx('munch'); G.S.hearts = G.S.maxHearts; G.hud(); return think('Mmm, sticky and sweet. I feel much braver now!');
    },
    thimble: () => nar("Luminara held her mother's silver thimble. It was warm from her pocket, and for a moment she could almost hear her mother humming as she sewed."),
    sunstone: () => { G.sfx('magic'); return nar('The sunstone glows warm and golden in your hand, like a little piece of a summer afternoon.'); },
    pie: () => nearPieShop() ? eatPie() : think("I'd rather sit down to eat it properly — on the bench outside the pie shop."),
    teaCup: () => think("Not yet — I want to drink it in my chair outside, watching the sun rise."),
    compass: () => nar("Luminara held her father's compass close to her heart. The needle trembled, then settled, pointing the way."),
    rations: () => F().pouchFilled && G.M.id === 'brushwood' ? eatRations() : think("I'll save my rations for a break on the road."),
  });

  // ================================================================ THE ROAD TO BRUSHWOOD
  // A tiny fox scurries across the path in front of them — a rare sight to see.
  const ZONES = {
    foxCrossing: () => {
      const fox = G.addNPC({ id: 'fox', char: 'fox', x: 9, y: 21, dir: 'right', name: 'Little Fox', act: 'fox', color: '#c8602a', voice: 2 });
      fox.speed = 70; G.sfx('leaf');
      G.toast('A tiny fox scurries across the path!');
      (async () => {
        await G.walk('fox', 12, 21, 70); G.face('fox', 'up');
        await G.wait(6500);
        if (!G.npc('fox')) return;
        await G.walk('fox', 22, 21, 90); G.removeNPC('fox');
        if (!F().foxSeen) F().foxMissed = true;
      })();
    },
    guildYard: () => crewScene(),
  };
  ACT.fox = async () => {
    if (F().foxSeen) return;
    F().foxSeen = true; G.emote('fox', '♥');
    await nar('Luminara stopped quietly and watched the tiny fox. It sat on the path for a moment, its bright eyes looking right back at her.');
    await think('*That was a rare sight to see.*');
    journalAdd('fox'); G.addXP(10);
  };

  // ================================================================ BRUSHWOOD
  async function arriveBrushwood() {
    const f = F(); if (f.atBrushwood) return;
    f.atBrushwood = true;
    G.setParty([]); G.refresh();
    await nar('As Luminara, Aldric and Ronald approached Brushwood, they still had plenty of time. They continued further into town until they saw the Brushwood Tavern.');
    await nar('Two men came to greet them. Kalen was carrying carrots, and Winston was carrying a pail of water.');
    await say('kalen', 'Your horses must be hungry.');
    G.give('carrots'); G.give('pail');
    await nar('Aldric, Ronald and the tavern keepers unloaded the wagons, while Luminara cared for the horses.');
    await think('A carrot and a long drink of water for each of the three horses.');
  }
  const HORSES = ['horseL', 'juniper', 'bramble'];
  ACT.horseB = async (t) => {
    const f = F(), id = t.id, n = t.ent ? t.ent.name : 'the horse';
    if (!f.atBrushwood) return;
    if (f['fed_' + id]) return nar(`${n} munches happily, swishing its tail.`);
    if (!has('carrots') || !has('pail')) return nar(`${n} looks hungry and thirsty.`);
    f['fed_' + id] = true; G.sfx('munch'); G.emote(id, '♥');
    await nar(`Luminara gave ${n} a carrot and a long drink of water from the pail.`);
    if (HORSES.every(h => f['fed_' + h])) {
      f.horsesDone = true; G.take('carrots'); G.take('pail'); G.addXP(10);
      await say('aldric', "That's three of four barrels in! Give us a hand with the last one, Light-Bearer?");
    }
  };
  USE.horseB = async (item, t) => { if (item !== 'carrots' && item !== 'pail') return false; await ACT.horseB(t); return true; };
  ACT.lastBarrel = async () => {
    const f = F();
    if (!f.horsesDone) return nar('Aldric and Ronald are unloading the barrels. The horses still need looking after.');
    if (f.lastBarrel) return nar('The wagons are empty now, apart from the strongbox, safe in your care.');
    await G.fade(true, 400); G.sfx('door'); await G.wait(500); await G.fade(false, 400);
    f.lastBarrel = true;
    await nar('Luminara helped unload the last barrel from the wagons and bring it into the tavern. They had unloaded all four barrels, and took a quick break to fill their water pouches.');
    await think('The well is just over there.');
  };
  ACT.well = async () => {
    const f = F();
    if (!f.lastBarrel) return nar('An old stone well with a little roof. The water looks cool and clear.');
    if (f.pouchFilled) return nar('The water in the well is cool and clear.');
    f.pouchFilled = true; G.sfx('splash');
    await nar('Luminara filled her water pouch at the well.');
    if (has('rations')) await eatRations();
  };
  async function eatRations() {
    if (!has('rations')) return;
    G.take('rations'); G.sfx('munch'); F().ateRations = true;
    await nar('Luminara snacked on some of the travelling rations she had prepared earlier: nuts and dried fruit.');
    await say('winston', 'What a lovely day it is today. I wish you good travels. We must be due for rain any day soon — the crops need a lot of water for this harvest season.');
  }
  ACT.kalen = async () => say('kalen', F().horsesDone ? 'Those horses look happier already!' : 'Carrots for the horses — one each, mind!');
  ACT.winston = async () => {
    const f = F();
    if (!f.lastBarrel) return say('winston', 'Mind the barrels — that ale has come all the way from Kraxenville!');
    if (!f.paid) {
      f.paid = true; G.addCoins(6);
      await say('winston', 'All four barrels, safe and sound. Here are your coins, with thanks to the guild.');
      return;
    }
    await say('winston', 'Safe travels, Light-Bearer.');
  };
  ACT.aldricB = async () => {
    const f = F();
    if (!(f.horsesDone && f.lastBarrel && f.pouchFilled && f.paid)) {
      const left = [];
      if (!f.horsesDone) left.push('the horses fed and watered');
      if (f.horsesDone && !f.lastBarrel) left.push('that last barrel in');
      if (f.lastBarrel && !f.pouchFilled) left.push('your water pouch filled at the well');
      if (f.lastBarrel && !f.paid) left.push("Winston's coins collected");
      return say('aldric', 'Nearly done! Just ' + left.join(', ') + '.');
    }
    return chapterEnd();
  };
  ACT.ronaldB = async () => say('ronald', pick(['My right wheel is wobbling again. Old wagon, old wheel.', 'Lesterfield before dark, if the weather holds. I doubt it will.']));
  ACT.brushTavern = async () => nar('The Brushwood Tavern. The barrels from Kraxenville are stacked inside the door.');

  async function chapterEnd() {
    const f = F();
    await say('aldric', "Let's be off, shall we? It's a long trip to Lesterfield. We don't want to be late.");
    await nar('The caravan companions prepared their horses and continued on their way. They collected their coins, returned to their horses, and went along the road — towards the Dark Forest.');
    G.questDone('brushwood');
    f.ch1Done = true; G.S.chapterDone = Math.max(G.S.chapterDone || 0, 1);
    await G.fade(true, 1200);
    await nar('End of Chapter One', { big: true });
    G.save();
    await G.chapterSummary(STORY.summaryHTML(G.S, 1));
    const next = STORY.nextChapter(1);
    if (next) { G.S.chapter = 2; G.save(); await nar('Next: Chapter Two — The Dark Forest', { big: true }); }
    else await nar('Next: Chapter Two — The Dark Forest\n(coming soon)', { big: true });
    G.showCredits([
      '#Luminara the Light-Bearer', 'Chapter One', '', '',
      '#Story & World', 'Lisa', '', '',
      '#Made with love by', 'Dad', '', '',
      '#Starring', 'Luminara, the Light-Bearer', 'Fredrick the Bard', 'Guild Master Henry', 'Gerald, Aldric & Ronald', 'Mistress Pell', 'Bertram & Clover', 'Marigold, Osric & Tilda', 'Pip & Nell', 'Old Maud', 'Brenna of the Iron Cauldron', 'Kalen & Winston of Brushwood', 'and a tiny fox', '', '',
      `#Your journey`, `Level ${G.S.lvl} · ${G.S.xp} experience`, '', '',
      '#Played by', G.S.playerName || '', '', '', '#To be continued…', 'Chapter Two: The Dark Forest', '', '', '',
    ]);
    await G.fade(false, 400);
  }

  // ================================================================ GATES & ARRIVALS
  const GATES = {
    cottageDoor: () => {
      const f = F();
      if (!f.hasSatchel) return "I'd better find my satchel before I go anywhere.";
      if (!f.teaMade && !f.teaDrunk) return 'Tea first! I always start the day with a cup of tea in my chair outside.';
      return true;
    },
    laneSouth: () => {
      const f = F();
      if (!f.teaDrunk) return "Before I set off, I'd love to drink my tea in my chair by the door, and watch the sun come up.";
      const miss = [];
      if (!f.cloak) miss.push('my cloak'); if (!f.gotCompass) miss.push("Father's compass"); if (!f.hasLantern) miss.push('my lantern'); if (!f.gotRations) miss.push('my travelling rations');
      return miss.length ? "I can't leave yet — I still need " + miss.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.' : true;
    },
    southRoad: () => F().departed ? true : "The road south to Brushwood. The caravan will take it later — I should see the guild first.",
    westGate: () => 'The west road leads straight into the Dark Forest. Our caravan goes by Brushwood first.',
    roadNorth: () => 'The caravan is heading south, to Brushwood. No turning back now!',
    brushSouth: () => F().atBrushwood && F().paid ? 'Aldric is ready to go — I should tell him.' : 'The road on to Lesterfield. We have work to do here first.',
  };
  const onEnter = {
    town: async () => {
      if (!F().arrivedTown) await arriveTown();
      if (F().departed && !F().atBrushwood) { G.loadMap('road', 'north'); G.setParty(caravanParty()); }
    },
    road: async () => { if (F().departed && !F().atBrushwood && !(G.S.party && G.S.party.length)) G.setParty(caravanParty()); },
    hillside: async () => {
      const f = F();
      if (f.teaDrunk && morningDone(G.S) && !f.laneThought) { f.laneThought = true; await nar('She heard the crunching of the leaves which had fallen from the majestic trees along the way. They were yellow, orange and brown in colour.'); }
    },
    brushwood: arriveBrushwood,
  };

  // ================================================================ GOALS
  function goal() {
    const f = F();
    if (!f.hasSatchel) return ['Find your satchel', 'cottage', 8, 7];
    if (!f.teaMade) return !has('teaBlend') ? ['Make sweet tea: find tea and sugar, then combine them', 'cottage', has('teaTin') ? 6 : 10, 3] : ['Use your sweet tea blend on the stove', 'cottage', 8, 3];
    if (!f.teaDrunk) return ['Drink your tea in the chair outside', 'hillside', 17, 7];
    if (!f.cloak) return ['Put on your blue cloak (wardrobe)', 'cottage', 3, 3];
    if (!f.gotCompass) return f.gotKey ? ['Use the brass key on your safekeeping box', 'cottage', 2, 4] : ['Find the key to your safekeeping box', 'cottage', 1, 4];
    if (!f.hasLantern) return ['Take your lantern from the table', 'cottage', 5, 6];
    if (!f.gotRations) return ['Pack your travelling rations (pantry barrel)', 'cottage', 1, 8];
    if (!f.arrivedTown) return ['Walk down the leafy lane to Kraxenville', 'town', 19, 4];
    if (!f.departed) {
      if (f.metCrew && !f.cargoDone) return ['Help fit the cargo onto the wagon', 'town', 30, 12];
      if (!f.pieBought) return ['Buy a pie at the bakery — down the alley, south of the market', 'town', 30, 37];
      if (!f.pieEaten) return ['Eat your pie on the bench outside the pie shop', 'town', 24, 38];
      if (!f.metFredrick) return ['Find Fredrick the bard by the fountain', 'town', 27, 23];
      if (!f.metCrew) return ["Go to the Merchants' Guild — the caravan is outside", 'town', 30, 14];
      if (!f.cargoDone) return ['Help fit the cargo onto the wagon', 'town', 30, 12];
      if (!f.gotStrongbox) return ['See Guild Master Henry inside the guild', 'guild', 7, 3];
      if (!f.lanternReady) {
        if ((has('tallow') || has('lanternTallow')) && (has('wick') || has('lanternWick'))) return ['Combine the tallow and wick with your lantern', null];
        if (!has('tallow') && !has('lanternTallow')) return ['Get tallow for your lantern (Iron Cauldron kitchen)', 'cauldron', 13, 4];
        return ['Get a linen wick (cloth stall in the market)', 'town', 22, 26];
      }
      return ['Tell Gerald you are ready to set off', 'town', 31, 15];
    }
    if (!f.atBrushwood) return ['Lead the caravan down the road to Brushwood', 'brushwood', 16, 4];
    if (!f.horsesDone) return ['Feed and water the three horses', 'brushwood', 12, 11];
    if (!f.lastBarrel) return ['Help bring in the last barrel (wagon)', 'brushwood', 18, 9];
    if (!f.pouchFilled) return ['Fill your water pouch at the well', 'brushwood', 24, 12];
    if (!f.paid) return ['Collect the coins from Winston', 'brushwood', 19, 13];
    if (!f.ch1Done) return ['Tell Aldric you are ready to go on', 'brushwood', 15, 13];
    return ['Chapter One complete! Chapter Two is coming soon…', null];
  }

  STORY.register({
    n: 1, title: 'The Light-Bearer', subtitle: 'Chapter One · The Light-Bearer',
    items: ITEMS, quests: QUESTS, act: ACT, use: USE, combos: COMBOS, gates: GATES, onEnter, self: SELF, speakers: SPEAKERS, zones: ZONES, caravan: caravanParty,
    partyFor: id => id === 'brushwood' && !F().atBrushwood ? [] : null,   // the wagons pull up outside the tavern
    leaves: ['hill1', 'hill2', 'town1', 'town2', 'manor'],
    intro, goal,
    musicFor: id => id === 'road' ? 'town' : null,
    tintFor: id => (id === 'cottage' || id === 'hillside') && !F().teaDrunk ? 'dawn' : id === 'brushwood' ? 'gold' : null,
    darkFor: id => id === 'cottage' && !F().teaDrunk ? 0.28 : null,
    journal: {
      mother: ['The Blue Cloak', "Mother made my cloak from fine sheep's wool and stitched the embroidery along the hood herself. She finished it before she passed, when I was nineteen. We shared a deep, unbreakable bond. I wear it every day in the colder seasons."],
      father: ["Father's Compass", 'Father left for war when I was nine and never came home. He was a courageous man, a renowned warrior, who protected every innocent creature with his trusty axe, Doomcleaver. Before he went, he gave me this compass. Whenever the sadness comes, I hold it close.'],
      butterflies: ['Precious Moments', 'Butterflies and birds perched on the big rocks along the lane. If only there were some way to capture moments like these…'],
      song: ["Fredrick's Warning", '"Doors of mystery should never be opened unless the traveller has a key." — an old song, as sung by Fredrick the bard.'],
      realm: ['The Kingdom of Krax', 'Kraxenville lies in the north-east. The road runs south through Brushwood and Wockville to Lesterfield. The Dark Forest fills the middle of the kingdom, with the Ruined Keep inside it. To the north rise the mountains of Vosmos, and a volcano smokes among them.'],
      strongbox: ['The Strongbox', 'Guild Master Henry made me the guild carrier of a precious strongbox, for Jorren at the Lesterfield Tavern. Oak, trimmed with iron, slightly rusted, and it rattles softly. I must keep it safe and not open it. The key rests in my satchel.'],
      maud: ["Old Maud's Secret", '"A light shared is a light doubled." Mother used to say that. She sewed by Maud\'s window when I was small. Maud kept Mother\'s silver thimble for me all these years.'],
      fox: ['A Rare Sight', 'On the road to Brushwood, a tiny fox scurried across the path in front of us, and stopped to look at me. That was a rare sight to see.'],
    },
    creatures: s => [
      ...(s.flags.foxSeen ? ['<b>Fox</b> — tiny, quick and shy. A rare sight on the Brushwood road.'] : []),
    ],
    mainBeats: [
      ['A New Dawn', "Tea at sunrise, her mother's blue cloak, her father's compass, and rations packed for the road."],
      ['Into Kraxenville', "A hot beef and pepper pie, a daydream of dragons, and Fredrick's warning: doors of mystery should never be opened unless the traveller has a key."],
      ['The Journey', 'Luminara made the cargo fit, Guild Master Henry trusted her with a mysterious strongbox and its key, and her lantern was readied for the dark.'],
      ['First Stop: Brushwood', 'The horses were fed and watered, the last barrel carried in, and the long road to Lesterfield lay ahead.'],
    ],
    sideStories: [
      { title: 'Precious Moments', done: s => s.flags.bf_rock1 && s.flags.bf_rock2 && s.flags.bf_rock3,
        yes: 'She stopped to admire the butterflies on all three rocks: moments she will always treasure.',
        no: 'Some of the butterflies fluttered away before Luminara stopped to admire them.', miss: 'a journal memory and 20 experience' },
      { title: 'The Runaway Ball', done: s => s.flags.ballReturned,
        yes: 'Pip and Nell got their ball back, and played happily on the green all morning.',
        no: "Pip and Nell's ball stayed stuck in the old oak. The green was very quiet that day.", miss: "Pip's shiny copper and 20 experience" },
      { title: 'A Wish at the Fountain', done: s => s.flags.wished,
        yes: 'Luminara wished that everyone she loves would stay safe, always.', no: 'No wish was made at the fountain.', miss: '3 experience' },
      { title: 'A Shoe for Clover', done: s => s.flags.shod,
        yes: 'Clover got her shoe back, and proudly pulled Luminara\'s wagon all the way to Brushwood.',
        no: s => s.flags.knowFountain ? 'Clover stayed behind with a bare hoof, and slow old Biscuit pulled Luminara\'s wagon instead.' : "Clover stayed behind in the Coach House with a missing shoe. Luminara never found out why.", miss: "Bertram's 2 copper, the fountain's 3 copper and 25 experience" },
      { title: "Old Maud's Golden Leaves", done: s => s.flags.leavesDone,
        yes: "Old Maud shared a memory of Luminara's mother, and gave her Mother's silver thimble.",
        no: s => s.q.leaves ? `Only ${s.leaves.length} of 5 golden leaves were found, so Old Maud's memory of Luminara's mother stays untold.` : "Old Maud never got to share her memory of Luminara's mother.",
        miss: "Mother's silver thimble (+1 heart), 5 copper and 40 experience" },
      { title: 'A Rare Sight', done: s => s.flags.foxSeen,
        yes: 'A tiny fox scurried across the road, and Luminara stopped to watch it. A rare sight to see.',
        no: 'A tiny fox darted across the road and was gone before Luminara could stop to watch it.', miss: 'a journal memory and 10 experience' },
    ],
  });
})();
