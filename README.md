# Luminara the Light-Bearer — Chapter One

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
| Raise lantern (scares goblinites) | **Q** | Raise Light button |
| Satchel (use and combine items) | **I** | Satchel button |
| Quest log | **J** | Quests button |
| Map of Krax | **P** | Map button |
| Pause menu | **Esc** | Menu button |
| Sound on/off | **M** | Menu → Options |

The game saves by itself every few seconds, and the moment it's closed, so players carry on exactly where they left off.
**Players & Saves** on the title screen holds three separate save slots, one per player. Each slot has a **Delete** button that asks before deleting. During play, **Menu** (or Esc) pauses the game and leads to Options, How to Play, Players & Saves and Back to Title.

**Add it to your Home Screen:** open the link on a phone or tablet. On an iPhone or iPad, tap Share → *Add to Home Screen*; on Android, use the browser menu → *Add to Home screen* / *Install app*. It then opens full-screen like a normal app, works offline, and keeps its saves.

## What is in Chapter One

The chapter follows *Luminara the Light-Bearer, Chapter 1*, then carries on into the Dark Forest and ends at the Gateway.
*The Three Dragons* is Lisa's separate children's story, so it will be a separate game.

**Places:** Luminara's cottage, the Leafy Lane, Kraxenville (laid out like Lisa's map), the Merchants' Guild, the Iron Cauldron, the edge of the Dark Forest, the deep Dark Forest, the Hollow and the Gateway.

**Map:** press **P** for a map of the Kingdom of Krax. It shows the mountains of Vosmos to the north and west, with the volcano in the middle of them, in the far north.

### Quest tree

Each big quest needs smaller ones done first.

```
A New Dawn             satchel → key under pillow → compass box (USE the key)
                       → cloak → tea + sugar (COMBINE) → stove (USE) → drink outside
Into Kraxenville       pie at the Cookshop → eat it on the bench (daydream!) → Fredrick → the Guild
The Light-Bearer  (main)
 ├─ A Shoe for Clover    Bertram → bent nail + Fredrick's lute string (COMBINE) → fish the fountain
 ├─ The Lord's Seal      Pemberton wants a pepper pie for Lord Aldermere
 │   └─ Not a Pinch of Pepper    Mistress Pell is out → Osric wants nectarines
 │       └─ The Runaway Ball     JUMP to knock the ball out of the oak → children → Marigold
 └─ Oil for the Lantern  {friend} at the Iron Cauldron → lantern + oil (COMBINE)
The Thorn Road (main)     glowing vines block the caravan → jump the log → Dark Forest at night
 ├─ Light the Waystones  three waystones (cross the stream on stepping stones) → the mist melts
 ├─ The Owl's Riddle     (side) Old Hoots tells of the Thornheart
 └─ The Thornheart       focus your lantern (timing game) → free the young possum → the road clears
The Gateway               the caravan goes on → the Gateway… to be continued
Side quests: Precious Moments (butterflies), The Bard's Song, Golden Leaves (8 hidden)
```

Luminara levels up as she helps people. Each level gives her more courage (hearts) and more lantern light. Goblinites in the forest run from a raised lantern. Fainting is gentle: she just wakes up at the edge of the area.

## Code layout

| File | What it holds |
|---|---|
| `js/gfx.js` | Pixel-art generator: characters, dragons, creatures, buildings, tiles, item icons |
| `js/maps.js` | Every location, built with a small map-building toolkit |
| `js/story.js` | Items, quests, every conversation and puzzle (the file to edit for story changes) |
| `js/game.js` | Engine: movement, jumping, lighting, speech bubbles, satchel, quest log, saving, title screen |
| `js/audio.js` | Synthesised music and sound effects |
| `build.py` | Rebuilds `luminara-single-file.html` after any change (`python3 build.py`) |

**Renaming the friend:** the blonde friend's name is in `newState()` in `js/game.js` (`friendName: 'Elowen'`). It is used everywhere she is mentioned.

*Story & world by Lisa. Made with love by Dad.*
