# Mystery Box & Quiz System -- Design Spec

## Overview

New gameplay feature for Kapibara Blast: a Mystery Box appears on every level containing an optional vocabulary quiz (Polish-to-English). Better quiz scores yield better rewards, including a new freeze bomb mechanic and unlockable capybara skins.

Target audience: children 6-10 years old.

All code stays in the monolithic `index.html`.

---

## 1. Mystery Box on the Map

### New Tile Type
- `MYSTERY_BOX (7)` -- a special interactable tile.
- Indestructible by bombs (not treated as CRATE).
- Passable -- player walks onto it to interact (like powerup pickup).
- One per level, single use (disappears after interaction).

### Spawn Rules
- Placed during `startLevel()`, after map generation.
- Position: random FLOOR tile in the upper-left quadrant (columns 1-6, rows 1-5).
- If no FLOOR tile available in that zone, replace a random CRATE in that quadrant.
- Must not overlap with player start position (1,1) or the 3x3 safe zone corners.
- Appears on all levels including boss levels.

### Visual
- Brown crate base (similar to CRATE) with a large yellow `?` symbol.
- Subtle pulsing animation (scale oscillation ~5%) to attract attention.
- Distinct from regular crates so the player notices it.

---

## 2. Interaction Flow

### Trigger
Player steps onto the MYSTERY_BOX tile. The tile is consumed (set to FLOOR) and the game transitions to the quiz flow.

### Choice Screen
- Game state transitions to `quiz`.
- Dark overlay (rgba, same style as pause/menu screens).
- Title: "TAJEMNICZA SKRZYNKA" (centered, large font).
- Drawing of the mystery box with `?` in the center.
- Two Canvas-rendered buttons:
  - **"PODEJMIJ WYZWANIE"** -- starts the 10-question quiz.
  - **"WEZ ZWYKLA NAGRODE"** -- gives a random powerup from the existing pool (PU_RANGE, PU_SPEED, PU_LIFE, PU_BOMBS, PU_SHIELD, PU_GHOST, PU_DETONATOR, PU_MEGA) and returns to gameplay.

### Input Handling
- Click/touch hitbox detection on Canvas-rendered buttons.
- Reuse the same pattern as the existing name-input and menu click handling.

---

## 3. Quiz System

### Game State
- New state: `quiz` added alongside existing states (menu, playing, paused, levelintro, levelcomplete, dead, gameover).
- When `state === 'quiz'`: game update loop is frozen (no robot movement, no timers, no bombs), only quiz rendering and input active.

### Quiz Sub-states
Track quiz progress with internal variables:
- `quizPhase`: 'choice' | 'question' | 'feedback' | 'result'
- `quizQuestionIndex`: 0-9
- `quizCorrectCount`: number of correct answers
- `quizCurrentWord`: current word object
- `quizOptions`: array of 4 answer strings
- `quizSelectedAnswer`: index of clicked answer (or -1)
- `quizFeedbackTimer`: countdown for feedback display (~1 second)

### Question Display
- Top: "Pytanie 3/10" + "Poprawne: 2"
- Center-top: procedural Canvas drawing of the word (~150x150px area)
- Center: Polish word in large text (e.g., "KOT")
- Bottom: 4 answer buttons in a 2x2 grid with English words (e.g., "CAT", "DOG", "FISH", "BIRD")

### Answer Feedback
- Correct: button flashes green, short procedural "ding" sound.
- Incorrect: selected button flashes red, correct button flashes green, short "buzz" sound.
- After ~1 second, advance to next question.

### Results Screen
- Large text: "WYNIK: 7/10"
- Reward description and icon (or "Zwykla nagroda" for <6).
- Particle animation for reward reveal.
- Procedural fanfare sound (extended powerup jingle).
- "KONTYNUUJ" button to return to gameplay.

---

## 4. Word Database

### Structure
Array of word objects embedded in the code:
```javascript
const QUIZ_WORDS = [
  { pl: 'kot', en: 'cat', category: 'animals', draw: drawWordCat },
  { pl: 'pies', en: 'dog', category: 'animals', draw: drawWordDog },
  // ... 80-100 entries
];
```

### Categories
- **animals** (~15 words): kot/cat, pies/dog, ryba/fish, ptak/bird, kon/horse, mysz/mouse, kaczka/duck, krolik/rabbit, zaba/frog, motyl/butterfly, lew/lion, slon/elephant, zyrafa/giraffe, niedzwiedz/bear, krowa/cow
- **food** (~15 words): jablko/apple, chleb/bread, mleko/milk, ser/cheese, ciasto/cake, banan/banana, truskawka/strawberry, jajko/egg, lody/ice cream, pizza/pizza, marchewka/carrot, pomidor/tomato, cukierek/candy, woda/water, sok/juice
- **objects** (~15 words): dom/house, pilka/ball, ksiazka/book, klucz/key, krzeslo/chair, stol/table, lozko/bed, auto/car, rower/bike, zegar/clock, parasol/umbrella, buty/shoes, czapka/hat, torba/bag, lampa/lamp
- **nature** (~15 words): drzewo/tree, kwiat/flower, slonce/sun, gwiazda/star, chmura/cloud, deszcz/rain, snieg/snow, gora/mountain, rzeka/river, morze/sea, trawa/grass, ksiezyc/moon, ogien/fire, kamien/rock, tęcza/rainbow
- **body** (~10 words): reka/hand, noga/leg, glowa/head, oko/eye, ucho/ear, nos/nose, usta/mouth, serce/heart, palec/finger, stopa/foot
- **colors** (~10 words): czerwony/red, niebieski/blue, zielony/green, zolty/yellow, bialy/white, czarny/black, rozowy/pink, fioletowy/purple, pomaranczowy/orange, brazowy/brown

### Procedural Drawings
Each word has a dedicated draw function: `drawWordCat(ctx, cx, cy, size)`.

Style guidelines:
- Simple geometric shapes (circles, rectangles, triangles, arcs).
- Bold, saturated colors.
- Large and readable at 150x150px.
- Consistent art style across all drawings.
- Each function: 5-15 lines of Canvas drawing code.

### Question Selection
- 10 words randomly selected per quiz (no repeats within one quiz).
- Wrong answers: 3 random words from the same category preferred; fallback to other categories if not enough in the same category.
- No duplicate answers within one question.

---

## 5. Reward System

### Reward Tiers

| Score | Tier | Reward Pool |
|-------|------|-------------|
| 0-5/10 | Bronze | Random powerup from existing pool (same as "take normal box") |
| 6-7/10 | Silver | Remote bomb (detonator for current level) OR +2 lives |
| 8-9/10 | Gold | Mega bomb (one use) |
| 10/10 | Diamond | +1 max life (cap 7) OR new skin unlock OR freeze bomb (20s) |

### Reward Selection
Within each tier, the reward is randomly selected from the pool. For 10/10: if all skins are unlocked, reroll to another reward in the diamond pool.

### Reward Mechanics

**Remote bomb (Silver):** Sets `playerDetonator = true` for the current level only. Resets on level transition.

**+2 lives (Silver):** `lives = Math.min(lives + 2, maxLives)`. Does not increase the max cap.

**Mega bomb (Gold):** Sets `playerMega = true`. Next bomb placed has unlimited range. Already exists in game.

**+1 max life (Diamond):** Increases `maxLives` by 1 (hard cap at 7) and grants that extra life immediately.

**New skin (Diamond):** Unlocks a random locked skin. Saved to localStorage. Player notified which skin was unlocked with a preview drawing.

**Freeze bomb (Diamond):** New mechanic. Sets `freezeTimer = 20.0` (seconds). Effect:
- All robots stop moving and stop placing bombs.
- Robot rendering: blue-tinted overlay on each robot sprite.
- Snowflake particles emitted from frozen robots (subtle).
- Timer displayed in HUD (e.g., "MRÓZ: 15s").
- Timer counts down during gameplay (not during pause).
- When timer reaches 0, robots resume normal behavior.
- Effect persists across the current level only.

---

## 6. Capybara Skin System

### Available Skins

| ID | Name | Visual Elements | Particle Effect |
|----|------|----------------|-----------------|
| `default` | Kapibara | Current look, no additions | None |
| `explorer` | Odkrywca | Cork safari hat, backpack, compass necklace | Dust motes |
| `knight` | Rycerz | Silver helmet with visor, shield, cape | Sparks |
| `pirate` | Pirat | Black skull hat, eye patch, saber | Water droplets |
| `astronaut` | Kosmonauta | White bubble helmet, spacesuit, antenna | Bubbles |
| `wizard` | Czarodziej | Purple pointy hat, wand, stars on robe | Star sparkles |
| `ninja` | Ninja | Black mask, belt, shuriken on back | Smoke puffs |

### Rendering
- Base capybara body drawn by existing `drawCapybara()` remains the same.
- Each skin has a decorator function: `drawSkinExplorer(ctx, x, y, facing, frame)` that draws accessories on top of the base body.
- Particle effects are subtle (1-2 particles per second) to avoid distracting from gameplay.

### Data Structure
```javascript
const SKINS = [
  { id: 'default', name: 'Kapibara', unlocked: true, draw: drawSkinDefault, particles: null },
  { id: 'explorer', name: 'Odkrywca', unlocked: false, draw: drawSkinExplorer, particles: 'dust' },
  { id: 'knight', name: 'Rycerz', unlocked: false, draw: drawSkinKnight, particles: 'sparks' },
  { id: 'pirate', name: 'Pirat', unlocked: false, draw: drawSkinPirate, particles: 'drops' },
  { id: 'astronaut', name: 'Kosmonauta', unlocked: false, draw: drawSkinAstronaut, particles: 'bubbles' },
  { id: 'wizard', name: 'Czarodziej', unlocked: false, draw: drawSkinWizard, particles: 'stars' },
  { id: 'ninja', name: 'Ninja', unlocked: false, draw: drawSkinNinja, particles: 'smoke' },
];
```

### Persistence
- `localStorage` key: `kapibara_skins` -- JSON array of unlocked skin IDs.
- `localStorage` key: `kapibara_active_skin` -- ID of currently selected skin.
- Loaded on game start, saved on unlock or selection change.

### Skin Selection Menu
- New option in main menu: "SKINY" button.
- Grid display of all skins:
  - Unlocked: full color capybara preview with skin name.
  - Locked: gray silhouette with padlock icon.
  - Active skin: highlighted border (gold/yellow).
- Click/tap to select an unlocked skin.
- "WRÓĆ" button to return to main menu.

---

## 7. Audio

All sounds procedural (Web Audio API), consistent with existing audio system.

| Event | Sound |
|-------|-------|
| Mystery box pickup | Mystical chime (ascending arpeggio, reverb) |
| Quiz correct answer | Short high "ding" (sine, 800Hz, 0.1s) |
| Quiz wrong answer | Low "buzz" (square, 200Hz, 0.15s) |
| Quiz reward reveal | Extended fanfare (C-E-G-C chord, 0.5s) |
| Freeze bomb activation | Crystalline shimmer (high sine sweep + noise) |
| Skin unlock | Special jingle (longer arpeggio, 0.8s) |

---

## 8. Save System Integration

### Existing Save Data Extension
`buildSaveData()` and `loadGameState()` need to include:
- `freezeTimer` -- remaining freeze time (if active)
- `quizUsedThisLevel` -- boolean, whether mystery box was already used
- `playerDetonatorFromQuiz` -- boolean, to track quiz-granted detonator separately

### New localStorage Keys
- `kapibara_skins` -- array of unlocked skin IDs
- `kapibara_active_skin` -- current skin ID

---

## 9. Technical Notes

### Code Organization (within index.html)
New code sections to add, placed logically near related existing code:
1. **Constants section:** MYSTERY_BOX tile type, quiz state vars, SKINS array, QUIZ_WORDS array
2. **Word drawing functions:** ~80-100 small functions (after existing drawing code)
3. **Quiz rendering:** drawQuizChoice(), drawQuizQuestion(), drawQuizFeedback(), drawQuizResult()
4. **Quiz logic:** startQuiz(), handleQuizClick(), advanceQuizQuestion(), calculateReward()
5. **Skin rendering:** drawSkin*() functions (6 decorator functions)
6. **Skin menu:** drawSkinMenu(), handleSkinMenuClick()
7. **Freeze mechanic:** integration into robot update loop and robot drawing
8. **Mystery box:** spawn logic in startLevel(), rendering in drawMap(), interaction in player update

### Estimated Code Addition
- Word database + draw functions: ~1500-2000 lines
- Quiz UI + logic: ~300 lines
- Reward system: ~100 lines
- Skin system + menu: ~400 lines
- Freeze mechanic: ~50 lines
- Audio: ~60 lines
- Mystery box (spawn/render/interact): ~80 lines
- **Total: ~2500-3000 lines** (bringing index.html to ~5600-6100 lines)
