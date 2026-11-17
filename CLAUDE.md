# Luminara the Light-Bearer: project guide

A browser game for Lisa's story, made by her dad. Everything (art, music, sound) is generated in code.
It plays at https://matt-gday.github.io/luminara-dragonhold/ (GitHub Pages, from `main`, repo root).

## Story rules
- Use only material Lisa sent herself: her emails and texts. Never use the "Game File" documents Dad sent her.
- *The Three Dragons* (Sianna, Yennefer, Rosanna, Aurelina) is a **separate children's game**. Keep it out of Luminara's game.
- Lisa's world: Kingdom of Krax (Kraxenville NE, Brushwood, Wockville, Lesterfield; a big forest between Wockville and
  Lesterfield), the Dark Forest with the Ruined Keep, the Gateway, and Vosmos (mountains N and NW, volcano in the north centre).
- Her blonde friend's name is still unknown: it's `friendName` in `newState()` (js/game.js).

## Edge cases and order of play (check every chapter before shipping)
Players wander. For every quest step, ask: *what if they do this first, last, twice, or skip the person who explains it?*
- Any item, person or puzzle someone can reach early must make sense on its own. The person or object they meet first should
  explain the situation and start the quest (e.g. the children give the ball quest; jumping at the tree also starts it).
- Characters must react to what has **actually** happened, not to the order the designer expected: never thank someone
  for a quest they weren't given, and never reference a meeting that hasn't happened.
- Quest steps that only apply on some routes use `hide:` so the log never shows impossible steps.
- `goal()` must never point backwards at something skipped. Gate old goals on later progress (see the pie / `metHollis` check).
- Repeat interactions need sensible repeat lines. Closing the app mid-scene must be safe (arrival scenes replay via `onEnter`).
- Every new feature, button or mechanic gets a one-time tip (`TIPS` in js/game.js) when it first matters,
  with touch wording on phones.
- Speech from someone off-screen must stay readable (the off-screen bubble arrow handles it; pan the camera for key moments).

## Before every commit
- `python3 build.py` (regenerates luminara-single-file.html).
- Automated playthrough of the whole chapter with no errors, reachability check of every target on every map,
  and a check of any out-of-order route touched by the change.
- Look at screenshots on desktop (1280×720) and phone landscape.

## Code map
`js/gfx.js` art · `js/maps.js` places · `js/story.js` quests, dialogue, goals · `js/game.js` engine, UI, tips, saves ·
`js/audio.js` music/sfx · `sw.js` offline cache · `manifest.webmanifest` home-screen app.
