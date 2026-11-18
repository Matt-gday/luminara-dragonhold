# Luminara the Light-Bearer: project guide

A browser game for Lisa's story, made by her dad. Everything (art, music, sound) is generated in code.
It plays at https://matt-gday.github.io/luminara-dragonhold/ (GitHub Pages, from `main`, repo root).

## Story rules
- The source is Lisa's book *Luminara the Light-Bearer* (13 chapters; Dad emailed it as "Full book game file").
  Follow it scene by scene and use her wording for narration.
- Lisa doesn't review anything: she just plays the game. Additions (side stories, puzzles, small characters) are welcome
  surprises, as long as nothing contradicts her story. Fix typos and grammar in her text quietly; never send her drafts.
- Each chapter is designed first in `docs/chapter-N-plan.md` (see docs/chapter-2-plan.md). Keep chapters about as long
  as Chapter One (20–40 minutes).
- Chapter plan: game ch1 = book 1–2 (done), ch2 = book 3–6, ch3 = book 7–8, ch4 = book 9–11, ch5 = book 12–13.
- *The Three Dragons* (Sianna, Yennefer, Rosanna, Aurelina) is a **separate children's game**. Keep it out of Luminara's game.
- Lisa's world: Kingdom of Krax (Kraxenville NE, Brushwood, Wockville, Lesterfield; a big forest between Wockville and
  Lesterfield), the Dark Forest with the Ruined Keep, the Gateway, and Vosmos (mountains N and NW, volcano in the north centre).
- Her friend is Gwendolyn ("Gwen", golden hair, blue eyes), met at the Lesterfield Inn in book chapter 5 (`friendName` in js/game.js).

## Edge cases and order of play (check every chapter before shipping)
Players wander. For every quest step, ask: *what if they do this first, last, twice, or skip the person who explains it?*
- Any item, person or puzzle someone can reach early must make sense on its own. The person or object they meet first should
  explain the situation and start the quest (e.g. the children give the ball quest; jumping at the tree also starts it).
- Characters must react to what has **actually** happened, not to the order the designer expected: never thank someone
  for a quest they weren't given, and never reference a meeting that hasn't happened.
- Quest steps that only apply on some routes use `hide:` so the log never shows impossible steps.
- `goal()` must never point backwards at something skipped. Gate old goals on later progress (see the `metCrew` cargo check in ch1).
- Repeat interactions need sensible repeat lines. Closing the app mid-scene must be safe (arrival scenes replay via `onEnter`).
- Every new feature, button or mechanic gets a one-time tip (`TIPS` in js/game.js) when it first matters,
  with touch wording on phones.
- Don't hand-hold. Let players make connections themselves (e.g. Fredrick's string snaps on camera; nobody says "ask Fredrick").
  Every quest step gets a `hint:` instead: `[nudge, clearer hint]` (or a function of state), shown only if the player
  asks via the Hint button in Quests. Hints describe just the next step.
- Nothing important may vanish on a timer. Quests, items, levels, journal entries and coins use `G.notice()`:
  they collect into a card the player must tap Continue on (shown before the next line of dialogue).
  `G.toast()` is only for short hints, which stay until tapped or until the player's next action.
- Speech from someone off-screen must stay readable (the off-screen bubble arrow handles it; pan the camera for key moments).

## Before every commit
- `python3 build.py` (regenerates luminara-single-file.html).
- Automated playthrough of the whole chapter with no errors, reachability check of every target on every map,
  and a check of any out-of-order route touched by the change.
- Look at screenshots on desktop (1280×720) and phone landscape.

## Code map
`js/gfx.js` art · `js/maps.js` places · `js/story.js` shared story engine · `js/chN.js` one file per chapter
(items, quests, dialogue, goals, summary) · `js/game.js` engine, UI, tips, saves, party, cargo puzzle ·
`js/audio.js` music/sfx · `sw.js` offline cache (add new files and bump `CACHE`) · `manifest.webmanifest` home-screen app.
Changing what a save means? Bump `SAVE_VERSION` in js/game.js so old saves get the "Start fresh" card.
