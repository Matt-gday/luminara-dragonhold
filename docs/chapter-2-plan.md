# Chapter Two: The Dark Forest — design plan

**Progress:** Stage 1 (the Dark Forest) built and tested. Next: Stage 2 (Lesterfield), Stage 3 (the Inn), Stage 4 (Market Morning).
Preview it with `?preview` on the game's address.

From Lisa's book, chapters 3 (The Dark Forest), 4 (Lesterfield), 5 (The Inn) and 6 (The Book).
Target length: the same as Chapter One (about 20–40 minutes, depending on side stories).

Marked **[invented]** = not in the book (all approved; see Decisions at the end). Everything else follows the book.

---

## How the chapter starts

- A Chapter One save that has finished (`ch1Done`) shows **Continue: Chapter Two** on the title screen.
  New players still start at Chapter One.
- Carried over from Chapter One: the strongbox and its key, the lantern (ready but not lit), flint and steel,
  the compass, level, hearts, coins, journal, and anything optional (sunstone, thimble, honey cake).
- Opening narration (the book's first lines, typo-fixed): *"Tall black spruce trees enclosed the travellers as they
  journeyed through the Dark Forest. There was a faint smell of damp moss in the crisp cold air. A mist emerged, and a
  chill breeze swept across their path."*
- The caravan follows Luminara again: her horse and wagon, then Aldric and Ronald.

## Places (8, similar to Chapter One's 7)

| Place | What's there |
|---|---|
| **Dark Forest: the path** | Black spruce, moss, white mushrooms, slippery soil. Ronald's wheel. Lighting the lantern. The lumina wisp. |
| **Dark Forest: the boggy turn** | Rain, mud, mist. The owls. The "Awooo" and the upright deer silhouette. Sunlight breaks through near the exit. |
| **Lesterfield** (town) | Cobbled streets, overhanging buildings. Weaponsmith, Lesterfield Tavern, Inn and Stables, market square (stalls, musicians), the Enchanted Library bookshop. |
| **Lesterfield Tavern** | Fire, bread and roast smells, Lorden at the front bench, stairs up, steps down to the cellar. |
| **Tavern cellar** | Cobblestone, wine rack along one wall, ale corner. |
| **Jorren's room** (upstairs) | Small table, pipe, papers, a guest room door. |
| **Lesterfield Inn** | Front bench (Gwendolyn), dining room, Luminara's guest room (bookshelf, small table, writing tools, bed). |
| **Enchanted Library** (inside) | Piles of second-hand books, window, the bookkeeper. |

The stables can be part of the Lesterfield map (outdoor yard), like the caravan yard in Kraxenville.

---

## Main quests

### 1. The Dark Forest
*Book ch3.*

**Scene: Ronald's wheel.** Partway along the path: *"Stop!" Ronald hollered.* *"My right wheel is loose."* (Set up
in Chapter One: "My right wheel is wobbling again.") *"Come and help me with the wheel. I need the barrels off the
back of my wagon."*
- Puzzle: take the barrels off Ronald's wagon (click each, or a short reverse of the cargo puzzle), then help
  with the wheel, then load the barrels back on.
- **[invented, small]** For the wheel itself: Aldric needs something to wedge the wagon up while Ronald works.
  A fallen branch or a flat rock on the path does it. One item, one use. It keeps it a puzzle rather than a click.
- Aldric: *"At least it's not as though the wheel has come off, Ron."*
- Luminara: *"Why don't we stay in Lesterfield tonight?"* (Aldric and Ronald nod.)

**Scene: lighting the lantern.** Dark clouds block the sunlight, and the scene darkens.
- The goal says to light the lantern. Using the flint on the lantern (or the lantern on itself) starts a short
  **flint-and-steel mini-game**: strike at the right moment. The first strike fails, as in the book (*CLICK,
  CLACK!* "There was no fire, so she tried again."), the second catches (*SCRAPE, CLICK!*), then a few taps
  to blow on the ember.
- Narration from the book: lighting it from the tinder, closing the glass door, snuffing the tinder with moist dirt.
- Turns on `lanternLit`: the lantern glow, the light bar and **Raise Light** (Q) appear. A one-time tip explains them.
- She checks the map and compass ("the right southwest direction towards Lesterfield"), so the compass points the way.

**Scene: the lumina.** A small glowing green light crosses the path, *"no larger than a grapefruit"*, bobbing,
then surging forward. Narration from the book about the lumina, *"which was the origin of her name"*.
Main beat (journal entry). Trying to catch it is a side story (below).

**Scene: the boggy turn.** Rain begins (*"a gentle pitter-patter"*), the ground gets boggy and the party slows.
- **Raise Light has a purpose here:** mist hides the turn off the path. Raising the lantern reveals the trail
  (stones or a worn track). The sunstone from Chapter One, if bought, shows it from further away. That's its
  first payoff. **[invented]**
- The owls on a branch (side story below).
- The horse snorts at noises from the northwest: *"Awooooo..."* The camera pans to a faint silhouette of a deer
  **standing on its hind legs, walking upright**. Main beat: unavoidable, because Gus asks about it later.
- Sun breaks through the clouds (*"a sun shower was better than pouring rain"*) and the path opens to Lesterfield.

### 2. Delivery to Lesterfield
*Book ch4.*

- Arrival: bustling town; the weaponsmith straightening a long broadsword (*metallic scraping*), with Luminara's
  thought: *"Perhaps it would be used by a knight or a great warrior."*
- **The cellar:** unload the final barrels into the wine cellar. *"The crew heaved the heavy barrels over to the corner
  with the rest of the ale."* **[invented]** A small push puzzle: slide 3 ale barrels into the ale corner
  without blocking each other (3–5 moves; Start again button). A new mechanic, so it gets a one-time tip.
- **The strongbox:** carry it in. Lorden, the bartender: *"Over there. Up the stairs."* Creaking stairs (sound).
- **Jorren:** seated at a small table, smoking a pipe, organising papers. *"You have the key?"*
  - The key has **changed shape**: from round with a jagged edge to square with softer edges. Its icon and
    description change; journal entry.
  - Inside: scrap metal. *"You have passed the test. Well done."* The hair in the side of the chest.
  - If the player tried to open the strongbox in Chapter One (`tempted`), Luminara thinks she's glad she didn't.
  - He gives her **a letter for the guild master** and returns the key: *"As this key nears magical objects it will
    change shape… Take good care of it."* *"We trust you, Light-Bearer."*
  - Luminara: *"A quest. How exciting!"*
- **Rabbit stew** by the fire (kitchen maid brings it; restores hearts).
- **The stables:** Augustus, "Gus", the stablemaster with his pitchfork, beard, leather apron and calloused hands.
  Childhood friends (they played ball and "touch"). Ronald: *"The horses have been fed and need only a place to stay
  for the night."* Gus asks what they saw in the forest. Luminara tells him about the upright deer, and he says
  the creatures may have come from the gateway. Pay Gus 3 silver.

### 3. A Night at the Inn
*Book ch5.*

- **Gwendolyn** at the front bench, beaming. A warm hug. Golden hair, blue eyes; she plays with her hair as she
  speaks. Their conversation about the gateway follows the book, including *"I would love to go on an adventure with you
  sometime…"* Book a night: 1 silver.
- **The guest room:** put the lantern on the small table. The **bookshelf** has the three titles from the book:
  *Masters of the Dragons*, *Needlepoint and Embroidery*, and *Survival Guide to the Dark Forest*.
  Reading the Survival Guide is the main step; the others are optional (side story).
- **Dinner** downstairs (something light, as she has eaten recently).
- **Night:** dark room, lantern light. *The Book of Aetheryon, Part I*: Aetheryon, the great spirit, bringer of life,
  said to take the form of a mighty black dragon in the high heavens. Journal entry. Sleep (fade).
- **In the middle of the night:** she wakes; the book is still out. A **map** between the middle pages, signed
  **Kalora**. *"Who was Kalora?"*
- **Copying the map** (puzzle): she copies it and leaves the original. Paper and writing tools are on the table.
  Hold the map against the lantern's glass to trace it: needs the **lit lantern**, the **paper** and the original map.
  Then put the original back in the book and the book back on the shelf. If you try to keep the original, Luminara
  refuses ("It isn't mine to take"). Result: **Kalora's Map (copy)**. Journal entry. (Used in Chapter Four.)
- **Morning:** knotted hair; comb from the satchel, braid. Something quick to eat. Goodbye hug for Gwen.

### 4. Market Morning
*Book ch6.*

- Brisk air: hood up, woollen gloves (narration). Children running, families, birds, musicians.
- **Trinket stall** (necklaces, bracelets, luminous rocks): her mother's **blue stone necklace** is mentioned
  (journal entry, ties to Chapter One's cloak entry).
- **Helena** rushes up and hugs her from behind (scripted when you reach the trinket stall): *"Did I scare you?"*
  She mentions the fortune teller.
- The bookshop is **missed on the first pass**, as in the book ("a second-hand bookshop she had walked past and missed").
  Its sign only catches Luminara's eye once she has been to the stalls. Before then it's just "a dusty shop window".
- **The Enchanted Library:** the bookkeeper has heard about her from Jorren. The locked book from a merchant who was
  *"travelling south from Vosmos"*. **Use the key on the book:** it changes shape again and opens. Small leather book,
  a cross with a sky-blue agate in a green wreath. Helena overhears and asks to see the key.
- Buy the book. It won't fit in the satchel, so **Helena carries it** and follows you (party member) to the stables.
- **End of chapter** at the stables (the last line of book chapter 6). Summary, then "Next: Chapter Three — The Quest".

---

## Side stories (optional, 6, like Chapter One)

| Side story | What happens | Reward |
|---|---|---|
| **The Lumina** | Try to catch the wisp. It always slips just out of reach (darts away when you get close, 3 tries). *"Nobody has ever been able to take hold of one."* | Journal, XP |
| **The Owls** | Stop and watch the rare owl and its mate. *"What are the owls thinking? It'd be such a great experience to be able to fly like a bird."* **[invented]** A short flying daydream (the engine already has a flapping mini-game). | Journal, XP |
| **A Good Read** | Read all three books on the inn shelf. Each gives a short journal entry. The Survival Guide's entry foreshadows the red berries and wolves of later chapters. | Journal, XP |
| **Madame Beatrice** | The fortune teller with her crow and floral perfume. 1 silver. Cards (as in the book): past, present, and *"You will meet a man, and he will lead you through a dangerous place."* (Sets up Savaric in Chapter Three.) | Journal (pays off in Ch3) |
| **Plum Jam** | The jam stall, beeswax on the jars. Plum is her second favourite (blackberry is first; they're out of it). | Item, used in Ch3 **[invented]** |
| **The Song of Aetheryon** | The musicians sing about the ancient spirits, the dragons and Aetheryon. Hear all 3 verses from 3 musicians around the square. **[invented as a collectible]**: Lesterfield's version of the golden leaves. | Journal (song), XP |

## New mechanics (each needs a one-time tip, with touch wording)

- Lighting the lantern (flint mini-game), the light bar, Raise Light.
- Raise Light to reveal hidden paths in mist.
- Barrel push puzzle in the cellar.
- Silver coins (if we add them; see questions).
- Rain (visual only).

## Characters and art

New: Lorden, Jorren (pipe), the kitchen maid, Augustus "Gus", Gwendolyn (golden hair, blue eyes), Helena,
Madame Beatrice (silver jewellery) and her crow, the bookkeeper, the weaponsmith, the musicians, the jam seller,
the trinket seller, owls (2), lumina wisp, the upright deer silhouette.
Items: square key (new icon), letter, paper, Kalora's map, the locked book, plum jam, comb.
Places: spruce forest tiles, mud, mist, mushrooms; stone town; tavern, cellar, inn interiors; bookshop.

## Hints

Every step gets a `[nudge, clearer hint]` pair, as in Chapter One. Examples:
- Ronald's wheel: "The wagon needs holding up." / "Wedge the flat rock by the path under Ronald's wagon."
- Lantern: "It's getting dark." / "Use your flint and steel on your lantern."
- Copying the map: "Light shines through paper." / "Hold the map and paper up to your lit lantern on the table."
- The bookshop: "Did you pass something on the way?" / "Look at the dusty shop window between the jam stall and the stables."

## Edge cases to handle

- Lantern lit before the clouds come? Lighting is only offered once it's dark ("It's bright enough for now").
- Skipping the lumina or owls: they're optional; the deer is unavoidable because Gus asks about it.
- Visiting the stables before the tavern: Gus is friendly but the horses still need the delivery done first
  (Ronald: "Let's finish the delivery first").
- Talking to Jorren without the strongbox: he's expecting a delivery from Kraxenville.
- Going to the inn before the tavern: Gwen is glad to see her, but the room is booked after the delivery.
- Reaching the bookshop with Helena not met: the bookkeeper scene still works; Helena's lines only if she's there.
- Trying to keep Kalora's original map: refused. Copying without the lantern lit: too dark.
- Not enough silver: see the coins question. Nothing required should ever be unaffordable.
- Closing the app at night in the inn: night state and the map scene replay safely.

## Chapter summary (main beats and side stories)

Main: The Dark Forest · Delivery to Lesterfield · A Night at the Inn · Market Morning.
Side: The Lumina · The Owls · A Good Read · Madame Beatrice · Plum Jam · The Song of Aetheryon.

---

## Decisions (agreed with Dad)

1. **Silver coins:** add silver (10 copper = 1 silver). Lorden pays the guild's delivery wage at the tavern
   (6 silver), so the required costs (stables 3, inn 1, the book 1) are always covered.
2. **The book at the Enchanted Library** costs 1 silver.
3. **Unnamed people stay unnamed:** "the bookkeeper", the kitchen maid, the weaponsmith, the musicians and the stall
   keepers, as in the book.
4. **The invented puzzles are approved:** the wheel wedge, the cellar push puzzle, the mist trail and the owl flying
   daydream. So are plum jam being useful in Chapter Three, and the Song of Aetheryon collectible. Additions like
   these are surprises for Lisa, as long as nothing contradicts her story.
5. **Typos in the book are fixed quietly in the game.** Lisa isn't reviewing anything; she'll just play it.
   In this chapter:
   - ch3: "I missed emerged in a chill breeze swept across their path" → "A mist emerged, and a chill breeze swept
     across their path."
   - ch3: "Tall black spruce trees enclose the travellers as they journey" → "enclosed … journeyed" (the rest of
     the book is in the past tense).
   - ch4: "An assortment of alcoholic beverages were stored wooden barrels" → "was stored in wooden barrels".
   - ch4: "It didn't seem to be worth of any value" → "It didn't seem to be of any value".
   - ch5: "Gwendolyn lead her to the guest room" → "led".
   - ch6: "walked passed and missed" → "walked past and missed"; "The Enchanted Libarary" → "The Enchanted Library".
   - ch6: "such a prised possession" → "prized"; "As her hands were quite full, so she asked" → "As her hands were
     quite full, she asked".
   - ch7 (next chapter): "collected the horses and hitch them" → "hitched".

---

## Also for the next session: the title screen

- Keep the castle (it comes from images Lisa sent; they're in her emails to Dad). Look them up first and match the
  title castle to her drawings.
- Add Luminara in the foreground on a hill, lantern raised, looking towards the castle and the Dark Forest, with the
  volcano of Vosmos behind.
- Living touches: lumina wisps drifting up, falling leaves, the lantern flickering; tapping the sky releases a wisp.
- Move the menu to one side so it doesn't cover the castle. "Continue" shows player, place and level.
- Fix the repeated subtitle ("the Light-Bearer" / "Chapter One · The Light-Bearer").

