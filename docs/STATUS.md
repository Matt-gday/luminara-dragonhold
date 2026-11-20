# Where things stand (handover, 20 Nov 2026)

## Finished and live (what Lisa can play)
- **Chapter One, "The Light-Bearer"** (book chapters 1–2), rebuilt from Lisa's book. Main story, six side stories,
  hints for every step, chapter summary (including missed side stories), credits. Tested end to end, out of order,
  with saves and reloads, on desktop and phone sizes.
- **Engine and UI:**
  - Click-to-continue notice cards, sticky hint toasts, and the optional Hint system.
  - Name tags for people you've met; NPCs face you until you walk away; side-on spacing.
  - One-time tips with phone wording.
  - Three save slots, autosave, offline home-screen app, pause menu, D-pad toggle, mute when the tab is hidden.
- **Title screen** (agreed design):
  - Lisa's Dragonhold centred under the glowing title (option B, light rays).
  - Luminara with her lantern on the left, dragons overhead, lumina wisps and leaves; tap the sky for a wisp.
  - Menu on the right; the chapter line above it; Continue shows name · place · level.
- **Recent fixes:** black bars after the credits, the dark strip on the title, the hook-and-line hints (Fredrick's
  string now snaps on camera), the guild door colour in hints, empty-purse lines.

## Half done: Chapter Two, "The Dark Forest" (hidden preview)
Design: `docs/chapter-2-plan.md` (four stages, decisions agreed with Matt, book typo list).
**Hidden from Lisa** with `preview: true` in `js/ch2.js`. To see it, open the game once with `?preview`.
- **Stage 1, the Dark Forest (book ch3): built and tested.** Two places: `forest_path` and `forest_bog`.
  - Ronald's wheel (barrels off, flat rock to prop the wagon, barrels back).
  - The flint-and-steel mini-game: the first strike always fails, "CLICK, CLACK!"
  - The lantern is lit; Raise Light and its tip now matter.
  - The lumina wisp (side story: try to catch it).
  - The misty bog, with rain, the owls (side story with a flying daydream), and mist burned back by raising the
    lantern at the waymarker (further with the sunstone).
  - "Awooooo…" and the upright deer; a sun shower.
  - A finished Chapter One save carries on into Chapter Two when preview is on.
- **Stage 1 ends at a placeholder:** the bog's south exit says "Lesterfield lies just beyond the trees. (The rest of
  Chapter Two is still being written!)". The quest "The Dark Forest" can't complete until Stage 2 adds Lesterfield.
- **Stages 2–4 are designed but not built:**
  - Lesterfield: tavern, cellar puzzle, Jorren, the key changing shape, rabbit stew, Gus and the stables, silver coins.
  - The Inn: Gwendolyn, the bookshelf, the Book of Aetheryon, Kalora's map copied by lantern light.
  - Market Morning: Helena, Madame Beatrice, plum jam, the musicians' song, the Enchanted Library; then the chapter end.

## Known bugs and rough edges
1. **Chapter Two placeholder ending** (above). Expected until Stage 2.
2. **Quest log clutter in Chapter Two:** all of Chapter One's finished quests are still listed under Chapter Two's.
   Group or collapse quests by chapter before Chapter Two goes live.
3. **The pause menu's "Chapter Summary"** only knows Chapter One. Make it list each finished chapter.
4. **Letterbox bars:** on screens that aren't a matching 16:9 size, there are thin black bars (pixel-perfect scaling).
   This is by design. Possible improvements: colour the bars, or show more of the world on wider screens.
5. **Only emulated phones have been tested** (Playwright's iPhone 13 landscape), not a real phone or iPad.
6. **Saves are kept per address:** the website, `localhost` and a double-clicked `index.html` each have separate saves.
7. **Old code from the first draft is still in the files**, unused. It's harmless, but worth tidying:
   - Goblinites in the forest (`goblins`, `scareGoblin`, `drawGoblin`). Keep the goblinite art for Chapter Four
     (the book's two-headed goblinite).
   - Waystones (`wsId`).
   - `setFollowers` and the "aurelina" glow. These are **Three Dragons remnants: remove them.**
   - Sprites: thornheart, vines, portalFrame, stoneCircle, gateArch.
   - Characters: friend, tobias (still used for Old Tom), guildmaster, aldermere, monster.
   - The `deep_forest` check in `loadMap`.

## Next steps, in priority order
1. **Matt play-tests Chapter Two Stage 1** with `?preview` and gives feedback (pacing, the flint game, the mist).
2. **Build Stage 2, Lesterfield** (book ch4), following the plan:
   - Silver coins (10 copper = 1 silver). Lorden pays the guild wage, 6 silver.
   - The cellar push puzzle, with a one-time tip.
   - Jorren's test (the hair in the chest). The key changes shape: new icon and journal entry. The letter for the guild master.
   - Rabbit stew by the fire.
   - Gus at the stables: 3 silver. He asks about the upright deer.
   - Replace the placeholder exit with the Lesterfield map and the "Delivery to Lesterfield" quest.
3. **Build Stage 3, the Inn** (book ch5): Gwendolyn (1 silver), the three books, dinner, the Book of Aetheryon,
   Kalora's map found at night and copied against the lit lantern, morning, the goodbye hug.
4. **Build Stage 4, Market Morning** (book ch6): Helena's hug, the blue stone necklace, Madame Beatrice (1 silver),
   plum jam, the musicians' song verses, the bookshop "missed on the first pass", the key opening the book (1 silver),
   Helena carrying the book to the stables. Then the chapter end: summary, credits, `ch2Done`, "Next: Chapter Three".
5. **Release Chapter Two:**
   - Remove `preview: true`.
   - Fix the quest log grouping and the chapter summary menu.
   - Run every check, and test that a save that finished Chapter One moves on to Chapter Two.
   - Update the README.
6. **Plan Chapter Three** (book 7–8: the road blocked, bandits, Savaric, the hatchlings, Henry's quest, the cottage and
   "Hackoola Baloo") in `docs/chapter-3-plan.md`, in the same style.
7. **Tidy the old first-draft code** listed above.
8. Optional polish: fill the letterbox bars; test on a real phone.
