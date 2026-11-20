# Luminara the Light-Bearer: project guide

A browser game of **Lisa's book, *Luminara the Light-Bearer***, made for her by her dad (Matt). Lisa is his adult daughter.
Everything (pixel art, animation, music, sound) is generated in code: there are no image or sound files in the game.
It plays at **https://matt-gday.github.io/luminara-dragonhold/** (GitHub Pages, served from `main`, repo root).
Repo: github.com/Matt-gday/luminara-dragonhold. Work goes straight to `main` (no PRs unless Matt asks).

**Start here:** read `docs/STATUS.md` (what's done, what's half-done, known bugs, next steps in priority order),
then `docs/chapter-2-plan.md` (the design for the chapter being built).

---

## The vision and the tone

- A gift. The aim is for Lisa to recognise her own story and writing come to life, and to be delighted by small surprises.
- Pokémon-style three-quarter view pixel art, speech bubbles, point-and-click and keyboard play.
- An adventure game with a little RPG: quests with nested sub-quests, a satchel (inventory) where items are **used** on
  things or **combined** with each other, puzzles, gentle levelling (experience, hearts, lantern light), copper coins.
- Warm, cosy, autumnal and a little magical; never scary or punishing. Fainting just wakes you nearby.
- Each chapter is about **20–40 minutes**, like Chapter One (Matt said its length "was great").
- Side stories are optional but carry emotional weight. The end-of-chapter summary tells what happened in every side
  story, including the ones you missed, in very short story beats.

## Story sources and rules

- **The source is Lisa's book** (13 chapters). Follow it scene by scene, and use her wording for narration wherever possible.
  - Where to find it: Matt's Gmail, an email from Lisa titled "Luminara entire book plus images - handy maps"
    (Nov 16 2026), attachment "Luminara the Light-Bearer - Game File.odt". (Early on, Matt thought the "Game File" was
    something else and said not to use it; he later confirmed it **is** Lisa's full book and is the source.)
  - **Do not commit the book text to this repo.** The repo is public. Keep a copy outside the repo if you need it.
- **Lisa doesn't review anything.** She just plays the game. Never send her drafts or questions.
  Additions (side stories, puzzles, small characters) are welcome surprises, **as long as nothing contradicts her story.**
- **Fix typos and grammar in her text quietly**, in the game. A list of known book typos is in docs/chapter-2-plan.md.
- **Chapter plan:** game ch1 = book 1–2 (done) · ch2 = book 3–6 (in progress) · ch3 = book 7–8 · ch4 = book 9–11 · ch5 = book 12–13.
  Each chapter is designed first in `docs/chapter-N-plan.md`, then built in stages.
- **Unfinished chapters stay hidden.** A chapter being built is registered with `preview: true`. It's hidden from normal
  players (Lisa) and only appears in a browser that has opened the game once with `?preview` (`?nopreview` turns it off).
  Remove `preview: true` when the chapter is finished. When a chapter goes live, saves that finished the previous chapter
  automatically move on to it (`STORY.advance`).

### What was changed or removed, and why
- **The first version** (before Lisa's book arrived) had an invented plot: Guildmaster Hollis, a friend called Elowen,
  Tobias, waystones, the Owl's riddle, the **Thornheart**, goblinites in the forest and a gateway ending. When the book
  arrived, Matt asked for a **full rebuild** from it. All of that invented plot was **removed**. Some old art and engine
  code from it is still in the files, unused (see "Old code" in docs/STATUS.md). The Thornheart is **not** in the game.
- ***The Three Dragons*** (Sianna, Yennefer, Rosanna, Aurelina) is Lisa's **separate children's story** and will be a
  separate game. Keep it out of Luminara's game entirely.
- **The castle on the title screen stays.** It is **Dragonhold**, from Lisa's own images. (A keep sits inside a castle's walls.)

### Lisa's world (from her texts, emails, maps and book)
- **Kingdom of Krax:** Kraxenville (north-east), Brushwood, Wockville, Lesterfield; a big forest between Wockville and Lesterfield.
- **The Dark Forest** fills the middle of the kingdom, with the **Ruined Keep** inside it and the **Gateway** in the far west.
- **Vosmos:** mountains to the north and north-west, with a **volcano in the north centre**.
- **Dragonhold:** a grey basalt-stone castle with many towers and red banners bearing a black dragon, on a hill above pine
  forest, snowy mountains behind, the volcano to the right.

### Characters so far
- **Luminara, the Light-Bearer:** long hazelnut-brown hair (braided), deep navy-blue wool cloak her late mother made
  (gold embroidery along the hood and front), golden lantern, father's compass (he died at war when she was nine; his
  axe was "Doomcleaver"), leather satchel. Practical, curious, kind, keeps her word. Loves floral green tea with sugar
  and beef-and-pepper pie. Works as a carrier for the Kraxenville Merchants' Guild.
- **Chapter One (book 1–2):** Fredrick the bard (lute; warns "doors of mystery should never be opened unless the
  traveller has a key"); Guild Master Henry (gives the strongbox and its key); Gerald the lazy foreman; Aldric
  ("I can make it fit") and Ronald ("I doubt that"), the wagon loaders who travel with her; Kalen and Winston at the
  Brushwood Tavern. **Invented for the game:** Mistress Pell (baker), Marigold (fruit), Osric (spices, sells the
  sunstone), Tilda (cloth, gives the wick), Brenna (Iron Cauldron cook, gives tallow), Bertram and his horse Clover,
  Pip and Nell (the ball), Old Maud (golden leaves, gives Mother's thimble), Pemberton, Hamish, Old Tom, a tiny fox.
- **Chapter Two onwards (book 3–6), coming:** Lorden (Lesterfield Tavern), Jorren (the strongbox test), Augustus "Gus"
  (stablemaster, childhood friend), **Gwendolyn "Gwen"** (golden hair, blue eyes; Luminara's dear friend at the
  Lesterfield Inn; `friendName` in js/game.js), Helena, Madame Beatrice and her crow, the bookkeeper of the Enchanted
  Library. Later: Kalora (signs a hidden map), Savaric the dragon tamer, Aetheryon (great spirit / black dragon).

### Storylines so far
- **Chapter One "The Light-Bearer" (live):** the morning at the cottage (satchel, sweet tea drunk outside at sunrise,
  Mother's cloak, Father's compass, lantern, rations) → Kraxenville (pie and a daydream of dragons, Fredrick) → the
  caravan yard (cargo puzzle, Henry's strongbox and key: keep it safe, don't open it) → fixing the lantern (tallow +
  linen wick) → "Hiyah!" down the road (a tiny fox) → Brushwood (feed and water the horses, the last barrel, the well,
  Winston's coins) → summary, credits.
  Side stories: Precious Moments (butterflies), The Runaway Ball, A Wish at the Fountain, A Shoe for Clover,
  Old Maud's Golden Leaves, A Rare Sight (the fox).
- **Chapter Two "The Dark Forest" (stage 1 of 4 built, hidden):** Ronald's loose wheel, lighting the lantern with flint
  and steel, the lumina wisp (the origin of her name), the misty bog, the owls, mist burned back by the raised lantern,
  "Awooooo…" and the deer that walks upright, a sun shower near Lesterfield. Stages 2–4 are designed in the plan.

## Agreed rules (always / never)

### Order of play and edge cases (check every chapter before shipping)
Players wander. For every quest step, ask: *what if they do this first, last, twice, or skip the person who explains it?*
- Any item, person or puzzle someone can reach early must make sense on its own. The person or object met first explains
  the situation and starts the quest (e.g. the children give the ball quest; jumping at the tree also starts it).
- Characters react to what has **actually** happened: never thank someone for a quest they weren't given, never refer
  to a meeting that hasn't happened, never let Luminara know something she hasn't learned (e.g. Clover's shoe).
- Quest steps that only apply on some routes use `hide:` so the log never shows impossible steps.
- `goal()` must never point backwards at something skipped (see the `metCrew` cargo check in ch1).
- Repeat interactions need sensible repeat lines. Closing the app mid-scene must be safe (arrival scenes replay via
  `onEnter`; the caravan is restored on entering a place).
- **Nothing the story needs may cost more than the player can be sure to have** (the pie goes on credit, Tilda's wick
  is free with no copper). Empty-purse choices get a kind line, never silence.

### Hints, not hand-holding
- Don't hand-hold. Let players make connections themselves (Fredrick's lute string snaps on camera; nobody says
  "ask Fredrick", and Luminara doesn't spell it out).
- Every quest step gets a `hint:` — `[nudge, clearer hint]` (or a function of game state) — shown only when the player
  presses **Hint** next to a quest in Quests. It first asks "Need a hint? Working it out yourself is half the fun!",
  then gives the nudge; asking again on the same step gives the clearer hint, and that's the limit.
- Hints describe just the next step, and must match what's **actually on screen** (colours, landmarks): e.g. the guild
  door is brown, beside a green shield with crossed axes.
- Tutorial lines early in Chapter One (e.g. "I should use my little brass key on it") are fine: they teach controls.

### UI and feel
- **Nothing important vanishes on a timer.** Quests, items, levels, journal entries, coins and golden leaves use
  `G.notice()`: they collect into one card the player must tap **Continue** on, shown before the next line of dialogue
  (with a short guard so mashing doesn't skip it). `G.toast()` is only for small hints, which stay until tapped or until
  the player's next action; quick feedback (Sound on, splash) passes a short duration.
- Every new feature, button or mechanic gets a one-time tip (`TIPS` in js/game.js) when it first matters, with touch
  wording on phones ("tap" instead of key names).
- Name tags show on hover/facing, only for characters already met ("?" otherwise). No quest details in name tags.
- People turn to face Luminara while talking, **keep facing her until she walks away** (about 3 tiles), then turn back
  to their usual direction. Wanderers don't stroll off while she's with them.
- Side-on conversations keep at least one clear pixel between faces (Luminara takes a small step back; no "kissing").
- Speech from someone off-screen stays readable (off-screen bubble arrow); pan the camera for key moments.
- Cinema bars appear during scenes; they are cleared on the title and credits screens.
- Autosave every few seconds and when the app is closed or hidden; 3 save slots (Players & Saves) with delete-with-warning;
  Menu/Esc pause menu (Options, How to Play, Players & Saves, Chapter Summary, Back to Title); D-pad can be hidden in
  Options (tap-to-walk works); sound mutes when the tab is hidden; works offline and as a home-screen app.
- Old saves from before the rebuild get a "Start fresh" card (`SAVE_VERSION`). Bump it if a save's meaning changes.

### Title screen (agreed)
- Lisa's **Dragonhold** in the centre, its tallest tower **directly under the title**; the volcano smoking on the right;
  snowy peaks; pine forest; dusk light with torches at the gate.
- **Luminara on the left** on her own hill with her lantern glowing (as Lisa's email says: "Luminara is on the left…
  with dragons flying overhead"). Dragons fly overhead.
- Lumina wisps drift up from the forest, autumn leaves fall; tapping the sky releases a wisp.
- Title style **option B**: "Luminara" in glowing white-gold with slowly turning light rays (still when the device asks
  for reduced motion), and "THE LIGHT-BEARER" between two fine gold lines.
- The chapter line ("Chapter One · Complete", "Chapter Two · The Dark Forest") is a small heading **above the menu**.
  The menu is on the right; **Continue** shows player name · place · level.

### Art style
- 320×180 game pixels, scaled up in whole/half steps (crisp pixels; small letterbox bars on odd screen shapes are expected).
- 16-px tiles; characters 22×36 with a dark outline (`#1c1424`), faux cast shadows, lighting/darkness with lantern glow.
- Autumn palette for Kraxenville; dark spruce, mud, white mushrooms and mist for the Dark Forest.
- UI: parchment panels, brown borders, gold accents, the "Jersey 10" pixel font (ligatures off).
- Draw new characters to match Lisa's references (see below) where she has given one.

## Lisa's artwork and how it's used
She sent reference images by email (in Matt's Gmail). They are **references only**: nothing from them is embedded in
the game; all art is drawn in code to match them.
- Email "Luminara" (Nov 16 2026): a Dragonhold reference sheet (view from the road, main entrance with red dragon
  banners, outer bailey, great hall, staircase, living quarters, a room) → the title screen castle; and Luminara with
  Gwendolyn at the Iron Cauldron (stew, bread, lantern) → Luminara's and Gwen's looks.
- Email "Luminara entire book plus images - handy maps" (Nov 16 2026): map of Kraxenville (the town layout), full map
  of the Kingdom of Krax (the in-game map), Kraxenville Guild House logo (green shield, gold star, crossed axes),
  "Luminara and her lantern" (her look), the Gateway, a Goblinite and "other monster" (for later chapters), plus the book.
- Emails "Location Details" and "Map in case you need it": more Kraxenville layout.
- Her texts (forwarded as screenshots): the volcano is north-centre in Vosmos; a big forest between Wockville and
  Lesterfield; the Three Dragons story is the separate children's game.

## How the code is organised
| File | What it holds |
|---|---|
| `index.html` | The page: canvas, all CSS (UI, tips, cards, modals, title), and the script tags (load order matters: audio, gfx, maps, story, ch1, ch2, game). |
| `js/gfx.js` | All pixel art, drawn in code: characters (`CHAR`), sprites (`SPR`), item icons (`ICONS`), ground tiles, trees, houses. |
| `js/maps.js` | Every place, built with a small toolkit (`B()`: fill, path, house, tree/pine, spr, npc, exit, spawn, zone, keep, keepRoad, scatter, fog). |
| `js/story.js` | The story engine shared by all chapters: registries, `register()`, the interaction router, goals and the compass (`LINKS`), journal, chapter summary, chapter preview/advance. |
| `js/ch1.js`, `js/ch2.js` | One file per chapter: items, quests (with hints), every conversation and puzzle (`ACT`, `USE`, `COMBOS`, `SELF`), zones, gates, arrivals, `goal()`, journal, summary beats. Calls `STORY.register({ n, ... })`. |
| `js/game.js` | The engine: movement, jumping, camera, lighting, rain/fog, speech bubbles and narration, satchel/quests/map panels, tips, notice cards, hints, saves and slots, title screen, credits, party/followers, cargo puzzle, flint mini-game, debug hooks (`G.dbg`). |
| `js/audio.js` | Synthesised music tracks and sound effects (WebAudio). |
| `sw.js` | Offline cache (network first). **Add new files to it and bump `CACHE`.** |
| `manifest.webmanifest`, icons | Home-screen app. |
| `build.py` | Bundles everything into **`luminara-single-file.html`** (the whole game in one file you can email or double-click). Run it before every commit. |
| `tests/` | Automated checks with Playwright (see below). `tests/out/` holds screenshots and a dialogue transcript (git-ignored). |
| `docs/` | `STATUS.md` (where things stand), `chapter-2-plan.md` (current chapter design). |

Adding a chapter: create `js/chN.js` calling `STORY.register({ n: N, preview: true, ... })` (copy the shape of ch2.js),
add it to `index.html` and `sw.js`, add its places to `js/maps.js` and its links to `STORY.LINKS`.
Action/item/flag names are shared across chapters, so use names that don't clash.

## Running it on Windows
- **Quickest:** double-click `index.html`. It runs straight from the file. (Saves made this way are kept separately from
  saves on the website or on localhost, and offline mode doesn't apply.)
- **Like the real site:** in the project folder run `py -m http.server 8000` (or `npm run serve`) and open
  http://localhost:8000/ — add `?preview` to see Chapter Two.
- **Rebuild the single file:** `py build.py` (or `python build.py`; needs Python 3).
- **Publish:** commit and push to `main`; GitHub Pages updates in a minute or two.

## Testing (before every commit)
One-time setup: install Node.js (LTS), then in the project folder run `npm install` and `npx playwright install chromium`.
- `npm test` runs every check in `tests/` (about 10 minutes) and says which need a look.
- Single checks: `node tests/ch1play.js` (whole Chapter One), `node tests/ch1order.js` (out-of-order routes),
  `node tests/reach.js` (everything reachable), `node tests/audit.js` (every interaction has code),
  `node tests/ending.js` (Chapter One ending into Chapter Two), `node tests/ch2play.js` (Chapter Two so far),
  `node tests/shots.js`, `ch2shots.js`, `titlenew.js` (desktop and phone screenshots into `tests/out/`).
- Tests use the debug hooks in `G.dbg` (auto-advance dialogue, act on a target, place the player, exits, reachability).
  Expected "unreachable" results in reach.js: the exit blocked by Ronald's stuck wagon, the bog exit hidden by mist,
  and the hidden wagon after the wheel is fixed.
- Before every commit: `py build.py`; the playthrough of the whole chapter with no errors; the reachability check;
  a check of any out-of-order route touched; **look at screenshots on desktop (1280×720) and phone landscape.**
- Commit messages: plain English, explain what changed for the player.
