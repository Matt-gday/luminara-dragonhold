# Luminara the Light-Bearer

A pixel-art adventure game based on Lisa's story about Luminara.
It is a point-and-click adventure with a little RPG mixed in.

All the art, animation, music and sound effects are made by code, so there are no image or sound files.

**▶ Play online: https://matt-gday.github.io/luminara-dragonhold/**

## How to play

- **Play now:** open `index.html` in any modern browser.
- **One file:** `luminara-single-file.html` is the whole game in a single file. You can email it, put it on a USB stick or double-click it.
- **Online:** host this folder with GitHub Pages and share the link.

| Action | Keyboard | Mouse / touch |
|---|---|---|
| Walk | Arrow keys / WASD | Click or tap where to go |
| Talk, look, pick up, open doors | **E** or Enter | Click the person or thing |
| Jump | **Space** | Jump button |
| Satchel (use and combine items) | **I** | Satchel button |
| Quest log | **J** | Quests button |
| Map of Krax | **P** | Map button |
| Pause menu | **Esc** | Menu button |
| Sound on/off | **M** | Menu → Options |

The game saves by itself every few seconds, and the moment it's closed, so players carry on exactly where they left off.
**Players & Saves** on the title screen holds three separate save slots, one per player. Each slot has a **Delete** button that asks before deleting. During play, **Menu** (or Esc) pauses the game and leads to Options, How to Play, Players & Saves and Back to Title.

**Add it to your Home Screen:** open the link on a phone or tablet. On an iPhone or iPad, tap Share → *Add to Home Screen*; on Android, use the browser menu → *Add to Home screen* / *Install app*. It then opens full-screen like a normal app, works offline, and keeps its saves.

## The story

The game follows Lisa's book, *Luminara the Light-Bearer*, scene by scene. Lisa's own words are used for the narration wherever possible.
*The Three Dragons* is Lisa's separate children's story, so it will be a separate game.

| Game chapter | Book chapters | Status |
|---|---|---|
| One: The Light-Bearer | 1 The Light-Bearer, 2 The Journey | **Playable** |
| Two: The Dark Forest | 3 to 6 (the forest, Lesterfield, Gwendolyn, the market) | Being built: stage 1 of 4 done (hidden; open the game with `?preview` to see it) |
| Three: The Dragon Tamer | 7 to 8 (Savaric, the guild's quest, the cottage) | Planned |
| Four: The Gateway | 9 to 11 (the Ruined Keep, the wolves, the gateway) | Planned |
| Five: Vaeloria | 12 to 13 (the cyan realm, locking the gateway) | Planned |

### What is in Chapter One

**Places:** Luminara's cottage, the leafy lane, Kraxenville, the Merchants' Guild and its caravan yard, the Iron Cauldron, the Brushwood road and Brushwood.

```
A New Dawn            satchel → tea + sugar (COMBINE) → stove (USE) → drink it in the chair outside at sunrise
                      → Mother's blue cloak → key under the pillow → Father's compass (USE the key) → lantern → rations
Into Kraxenville      beef and pepper pie → eat it outside the pie shop (daydream of dragons) → Fredrick's warning
The Journey           the caravan yard: Gerald, Aldric ("I can make it fit") and Ronald ("I doubt that")
                      → the cargo puzzle → Guild Master Henry's strongbox and key (keep it safe, don't open it!)
 └─ Light for the Road  tallow from Brenna + a linen wick from Tilda (COMBINE with the lantern)
First Stop: Brushwood  "Hiyah!" → the road (a tiny fox) → Kalen and Winston → feed and water three horses
                      → the last barrel → fill your water pouch → collect the coins → on towards the Dark Forest
Side stories (optional): Precious Moments (butterflies), The Runaway Ball (JUMP), A Wish at the Fountain,
A Shoe for Clover (bent nail + lute string, fish the fountain), Old Maud's Golden Leaves (5 hidden; reward:
Mother's thimble, +1 heart), A Rare Sight (the fox).
```

At the end, a chapter summary tells the story beat of every side story, including what happened to the ones you missed.
Luminara levels up as she helps people. Each level gives her more courage (hearts).

Pixel-art generator: characters, dragons, creatures, buildings, tiles, item icons |
| `js/maps.js` | Every location, built with a small map-building toolkit |
| `js/story.js` | The story engine shared by every chapter: quests, goals and the compass, journal, chapter summary |
| `js/ch1.js`, `js/ch2.js` | One file per chapter: its items, quests, every conversation and puzzle |
| `tests/` | Automated checks (Playwright): `npm install`, `npx playwright install chromium`, then `npm test` |
| `js/game.js` | Engine: movement, jumping, lighting, speech bubbles, satchel, quest log, saving, title screen |
| `js/audio.js` | Synthesised music and sound effects |
| `build.py` | Rebuilds `luminara-single-file.html` after any change (`python3 build.py`) |

**Adding a chapter:** create `js/chN.js` that calls `STORY.register({ n: N, ... })` (copy the shape of `js/ch2.js`), add it to `index.html` and `sw.js`, and add its places to `js/maps.js`.

*Story & world by Lisa. Made with love by Dad.*

For developers: start with `CLAUDE.md` (the project guide) and `docs/STATUS.md` (where things stand and what's next).
