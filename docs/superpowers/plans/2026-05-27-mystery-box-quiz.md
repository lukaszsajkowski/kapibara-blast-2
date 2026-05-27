# Mystery Box & Quiz System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mystery Box with vocabulary quiz (Polish→English) to every level, with tiered rewards including freeze bomb and unlockable capybara skins.

**Architecture:** Single monolithic `index.html` (currently 3107 lines). All new code added inline — constants near existing constants, state near existing state, drawing functions near existing draw code, etc. Quiz runs as a new game state `quiz` with Canvas-rendered UI. Word database is a flat array of ~80 objects with dedicated draw functions.

**Tech Stack:** Vanilla JS, HTML5 Canvas 2D, Web Audio API (procedural), localStorage.

---

### Task 1: Constants, State Variables & Mystery Box Tile

**Files:**
- Modify: `index.html:206` (after SPIKES constant)
- Modify: `index.html:784-791` (after Phase 3 state block)
- Modify: `index.html:829-843` (reset function)
- Modify: `index.html:940-942` (startLevel function)

- [ ] **Step 1: Add MYSTERY_BOX constant**

After line 206 (`const SPIKES = 6;`), add:

```javascript
const MYSTERY_BOX = 7;
```

- [ ] **Step 2: Add quiz, freeze, and skin state variables**

After line 791 (`let playerSlide = null;`), add:

```javascript
// Mystery Box & Quiz state
let mysteryBoxUsed = false;       // whether box was picked up this level
let quizPhase = 'choice';         // 'choice' | 'question' | 'feedback' | 'result'
let quizQuestionIndex = 0;
let quizCorrectCount = 0;
let quizCurrentWord = null;
let quizOptions = [];
let quizSelectedAnswer = -1;
let quizCorrectAnswer = -1;
let quizFeedbackTimer = 0;
let quizWords = [];               // 10 words selected for current quiz
let quizReward = null;            // { type, label, color } after quiz ends

// Freeze bomb
let freezeTimer = 0;

// Skins
let maxLives = 5;                 // mutable — quiz reward can raise to 7

const SKINS = [
  { id: 'default', name: 'Kapibara', particles: null },
  { id: 'explorer', name: 'Odkrywca', particles: 'dust' },
  { id: 'knight', name: 'Rycerz', particles: 'sparks' },
  { id: 'pirate', name: 'Pirat', particles: 'drops' },
  { id: 'astronaut', name: 'Kosmonauta', particles: 'bubbles' },
  { id: 'wizard', name: 'Czarodziej', particles: 'stars' },
  { id: 'ninja', name: 'Ninja', particles: 'smoke' },
];
let unlockedSkins = ['default'];
let activeSkin = 'default';
let skinMenuOpen = false;
```

- [ ] **Step 3: Add skin persistence helpers**

After the new skin variables, add:

```javascript
const LS_SKINS_KEY = 'kapibara_skins';
const LS_ACTIVE_SKIN_KEY = 'kapibara_active_skin';

function loadSkins() {
  try {
    const raw = localStorage.getItem(LS_SKINS_KEY);
    if (raw) unlockedSkins = JSON.parse(raw);
    activeSkin = localStorage.getItem(LS_ACTIVE_SKIN_KEY) || 'default';
    if (!unlockedSkins.includes(activeSkin)) activeSkin = 'default';
  } catch(e) {}
}

function saveSkins() {
  try {
    localStorage.setItem(LS_SKINS_KEY, JSON.stringify(unlockedSkins));
    localStorage.setItem(LS_ACTIVE_SKIN_KEY, activeSkin);
  } catch(e) {}
}
```

- [ ] **Step 4: Update reset() to clear new state**

In `reset()` (line 829), after `playerSlide=null;` (line 839), add:

```javascript
mysteryBoxUsed=false; freezeTimer=0; maxLives=5;
quizPhase='choice'; quizQuestionIndex=0; quizCorrectCount=0;
quizCurrentWord=null; quizOptions=[]; quizSelectedAnswer=-1; quizCorrectAnswer=-1;
quizFeedbackTimer=0; quizWords=[]; quizReward=null;
```

- [ ] **Step 5: Reset mystery box state in startLevel()**

In `startLevel()` (line 931), after `playerMega=false;` (line 942), add:

```javascript
mysteryBoxUsed = false;
freezeTimer = 0;
```

- [ ] **Step 6: Load skins on game start**

At line 3006 (after `highScoreSaved=false;` in the START section), add:

```javascript
loadSkins();
```

- [ ] **Step 7: Verify game loads without errors**

Open `index.html` in a browser, open DevTools console, confirm no JS errors. Start a game, verify normal gameplay works.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat: add constants and state variables for mystery box, quiz, freeze, and skins"
```

---

### Task 2: Mystery Box Spawn & Rendering

**Files:**
- Modify: `index.html` — `placeMapElements()` function (line 965)
- Modify: `index.html` — `drawMap()` function (line 1951)
- Modify: `index.html` — `solid()` function (line 1041)
- Modify: `index.html` — `solidForRobot()` function (line 1053)
- Modify: `index.html` — `explode()` function (line 1478)

- [ ] **Step 1: Spawn mystery box in placeMapElements()**

At the end of `placeMapElements()`, before the closing `}` (after the spikes block, around line 1002), add:

```javascript
  // Mystery Box — one per level, upper-left quadrant
  const mbCandidates = [];
  for (let y = 1; y <= 5; y++) {
    for (let x = 1; x <= 6; x++) {
      if (map[y][x] === FLOOR) {
        // Skip player start safe zone
        if (x <= 2 && y <= 2) continue;
        mbCandidates.push([x, y]);
      }
    }
  }
  if (mbCandidates.length > 0) {
    const [mx, my] = mbCandidates[Math.floor(Math.random() * mbCandidates.length)];
    map[my][mx] = MYSTERY_BOX;
  } else {
    // Fallback: replace a random crate in upper-left quadrant
    for (let y = 1; y <= 5; y++) {
      for (let x = 1; x <= 6; x++) {
        if (map[y][x] === CRATE) {
          map[y][x] = MYSTERY_BOX;
          return;
        }
      }
    }
  }
```

- [ ] **Step 2: Make MYSTERY_BOX passable in solid()**

In `solid()` (line 1041), the function checks `WALL` and `CRATE`. Mystery box is passable so no changes needed — it's not WALL or CRATE. But we need to make sure bombs don't destroy it. In `explode()` (line 1478), inside the direction loop, after `if (map[ey][ex]===CRATE)` block (line 1488), add a check to skip mystery box:

```javascript
      if (map[ey][ex] === MYSTERY_BOX) {
        if (!bomb.isMega) break; // mystery box blocks explosion but is not destroyed
        continue; // mega blasts past it
      }
```

- [ ] **Step 3: Make robots avoid mystery box tile**

In `solidForRobot()` (line 1053), after `if (t===CRATE && robotType!==RT_GHOST) return true;` (line 1057), add:

```javascript
  if (t === MYSTERY_BOX) return true;
```

- [ ] **Step 4: Draw mystery box in drawMap()**

In `drawMap()` (line 1951), inside the tile loop, after the SPIKES else-if block (around line 1968-1969), add:

```javascript
    } else if (t === MYSTERY_BOX) {
      drawMysteryBox(px, py, t_now);
    }
```

- [ ] **Step 5: Implement drawMysteryBox()**

After `drawCrate()` (line 2115), add:

```javascript
function drawMysteryBox(px, py, t) {
  const pulse = 1 + Math.sin(t * 3) * 0.03;
  const cx = px + TILE / 2, cy = py + TILE / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-cx, -cy);

  // Floor underneath
  ctx.fillStyle = '#141828';
  ctx.fillRect(px, py, TILE, TILE);

  // Crate body
  ctx.fillStyle = '#7a4420';
  ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
  ctx.fillStyle = '#9a6030';
  ctx.fillRect(px + 3, py + 3, TILE - 6, 4);
  ctx.fillRect(px + 3, py + 3, 4, TILE - 6);
  ctx.fillStyle = '#5a3010';
  ctx.fillRect(px + 3, py + TILE - 7, TILE - 6, 4);
  ctx.fillRect(px + TILE - 7, py + 3, 4, TILE - 6);

  // Metal bands
  ctx.fillStyle = '#8899aa';
  ctx.fillRect(px + 6, py + TILE / 2 - 1, TILE - 12, 3);
  ctx.fillRect(px + TILE / 2 - 1, py + 6, 3, TILE - 12);

  // Question mark
  ctx.fillStyle = '#ffe14d';
  ctx.font = `bold ${TILE * 0.55}px 'Courier New'`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffe14d';
  ctx.shadowBlur = 8 + Math.sin(t * 4) * 4;
  ctx.fillText('?', cx, cy + 1);
  ctx.shadowBlur = 0;

  ctx.restore();
}
```

- [ ] **Step 6: Verify mystery box appears on map**

Open `index.html`, start a new game. On level 1, look in the upper-left quadrant (columns 1-6, rows 1-5) for a brown crate with a glowing yellow `?`. Confirm it pulses subtly. Confirm bombs don't destroy it. Confirm player can walk onto it (nothing happens yet).

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add mystery box spawn and rendering on every level"
```

---

### Task 3: Mystery Box Interaction & Quiz State Machine

**Files:**
- Modify: `index.html` — `update()` function (line 1160)
- Modify: `index.html` — `updatePlayer()` function (line 1285)
- Modify: `index.html` — `draw()` function (line 2608)
- Modify: `index.html` — new functions after draw helpers

- [ ] **Step 1: Detect player stepping on mystery box**

In `updatePlayer()`, after the movement block (after `else p.frame=0;` around line 1323), before the bomb planting section, add:

```javascript
  // Mystery box pickup
  if (!mysteryBoxUsed) {
    const ptx = Math.round(p.x / TILE), pty = Math.round(p.y / TILE);
    if (map[pty] && map[pty][ptx] === MYSTERY_BOX) {
      map[pty][ptx] = FLOOR;
      mysteryBoxUsed = true;
      state = 'quiz';
      quizPhase = 'choice';
      sfxMysteryBox();
    }
  }
```

- [ ] **Step 2: Add quiz state to update() — freeze game logic**

In `update()` (line 1160), after the `else if (state==='paused')` block (line 1173-1174), add:

```javascript
  else if (state === 'quiz') {
    // Game frozen — only update quiz feedback timer
    if (quizPhase === 'feedback') {
      quizFeedbackTimer -= dt;
      if (quizFeedbackTimer <= 0) {
        quizQuestionIndex++;
        if (quizQuestionIndex >= 10) {
          quizPhase = 'result';
          quizReward = calculateQuizReward();
          sfxQuizReward();
        } else {
          prepareQuizQuestion();
          quizPhase = 'question';
        }
      }
    }
  }
```

- [ ] **Step 3: Add freeze timer countdown in playing state**

In `update()`, inside the `state==='playing'` block (line 1175), after `spikesTimer += dt;` (line 1177), add:

```javascript
    if (freezeTimer > 0) freezeTimer = Math.max(0, freezeTimer - dt);
```

- [ ] **Step 4: Freeze robots when freezeTimer is active**

In `updateRobots()` (line 1350), at the very beginning of the function, add:

```javascript
  if (freezeTimer > 0) return; // robots frozen
```

- [ ] **Step 5: Add quiz rendering to draw()**

In `draw()` (line 2608), after `if (state==='gameover') drawGameScreen(...)` (line 2702), add:

```javascript
  if (state === 'quiz') drawQuizOverlay(t);
```

- [ ] **Step 6: Implement quiz helper functions**

After `drawPauseScreen()` (around line 2923), add the quiz logic functions:

```javascript
// ════════════════════════════════════════════════════════════════
//  QUIZ SYSTEM
// ════════════════════════════════════════════════════════════════
function startQuiz() {
  // Select 10 random words
  const shuffled = [...QUIZ_WORDS].sort(() => Math.random() - 0.5);
  quizWords = shuffled.slice(0, 10);
  quizQuestionIndex = 0;
  quizCorrectCount = 0;
  quizSelectedAnswer = -1;
  quizCorrectAnswer = -1;
  quizPhase = 'question';
  prepareQuizQuestion();
}

function prepareQuizQuestion() {
  quizCurrentWord = quizWords[quizQuestionIndex];
  quizSelectedAnswer = -1;

  // Build 4 options: 1 correct + 3 wrong
  const sameCategory = QUIZ_WORDS.filter(w => w.category === quizCurrentWord.category && w.en !== quizCurrentWord.en);
  const otherWords = QUIZ_WORDS.filter(w => w.en !== quizCurrentWord.en);
  const wrongPool = sameCategory.length >= 3 ? sameCategory : otherWords;
  const shuffledWrong = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);

  const options = [quizCurrentWord.en, ...shuffledWrong.map(w => w.en)];
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  quizOptions = options;
  quizCorrectAnswer = options.indexOf(quizCurrentWord.en);
}

function handleQuizClick(canvasX, canvasY) {
  if (quizPhase === 'choice') {
    // Two buttons: "PODEJMIJ WYZWANIE" and "WEZ ZWYKLA NAGRODE"
    const btnW = 280, btnH = 50;
    const bx = W / 2 - btnW / 2;
    const by1 = H / 2 + 20, by2 = H / 2 + 85;

    if (canvasX >= bx && canvasX <= bx + btnW) {
      if (canvasY >= by1 && canvasY <= by1 + btnH) {
        startQuiz();
      } else if (canvasY >= by2 && canvasY <= by2 + btnH) {
        // Take normal reward
        const types = [PU_RANGE, PU_SPEED, PU_LIFE, PU_BOMBS, PU_SHIELD, PU_GHOST, PU_DETONATOR, PU_MEGA];
        const type = types[Math.floor(Math.random() * types.length)];
        applyPowerup(type);
        sfxPowerup();
        spawnFloatingText(player.x + TILE / 2, player.y, 'NAGRODA!', '#ffe14d');
        state = 'playing';
      }
    }
  } else if (quizPhase === 'question') {
    // 4 answer buttons in 2x2 grid
    const btnW = 200, btnH = 44;
    const gap = 16;
    const gridX = W / 2 - btnW - gap / 2;
    const gridY = H / 2 + 80;

    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = gridX + col * (btnW + gap);
      const by = gridY + row * (btnH + gap);
      if (canvasX >= bx && canvasX <= bx + btnW && canvasY >= by && canvasY <= by + btnH) {
        quizSelectedAnswer = i;
        if (i === quizCorrectAnswer) {
          quizCorrectCount++;
          sfxQuizCorrect();
        } else {
          sfxQuizWrong();
        }
        quizPhase = 'feedback';
        quizFeedbackTimer = 1.0;
        break;
      }
    }
  } else if (quizPhase === 'result') {
    // "KONTYNUUJ" button
    const btnW = 200, btnH = 50;
    const bx = W / 2 - btnW / 2;
    const by = H / 2 + 120;
    if (canvasX >= bx && canvasX <= bx + btnW && canvasY >= by && canvasY <= by + btnH) {
      applyQuizReward();
      state = 'playing';
    }
  }
}

function calculateQuizReward() {
  const n = quizCorrectCount;
  if (n >= 10) {
    // Diamond tier
    const pool = [];
    pool.push({ type: 'maxlife', label: '+1 MAKS. ZYCIE', color: '#ff44ff' });
    pool.push({ type: 'freeze', label: 'BOMBA MROZU (20s)', color: '#44ddff' });
    const lockedSkins = SKINS.filter(s => !unlockedSkins.includes(s.id));
    if (lockedSkins.length > 0) {
      pool.push({ type: 'skin', label: 'NOWY SKIN!', color: '#ffaa00' });
    }
    return pool[Math.floor(Math.random() * pool.length)];
  } else if (n >= 8) {
    return { type: 'mega', label: 'MEGA BOMBA!', color: '#ff00ff' };
  } else if (n >= 6) {
    const pool = [
      { type: 'detonator', label: 'DETONATOR!', color: '#ff4444' },
      { type: 'lives2', label: '+2 ZYCIA', color: '#44ff88' },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  } else {
    return { type: 'normal', label: 'ZWYKLA NAGRODA', color: '#ffe14d' };
  }
}

function applyQuizReward() {
  if (!quizReward) return;
  switch (quizReward.type) {
    case 'normal': {
      const types = [PU_RANGE, PU_SPEED, PU_LIFE, PU_BOMBS, PU_SHIELD, PU_GHOST, PU_DETONATOR, PU_MEGA];
      applyPowerup(types[Math.floor(Math.random() * types.length)]);
      break;
    }
    case 'detonator':
      playerDetonator = true;
      spawnFloatingText(player.x + TILE / 2, player.y, 'DETONATOR!', '#ff4444');
      break;
    case 'lives2':
      lives = Math.min(lives + 2, maxLives);
      spawnFloatingText(player.x + TILE / 2, player.y, '+2 ZYCIA!', '#44ff88');
      break;
    case 'mega':
      playerMega = true;
      spawnFloatingText(player.x + TILE / 2, player.y, 'MEGA BOMBA!', '#ff00ff');
      break;
    case 'maxlife':
      if (maxLives < 7) {
        maxLives++;
        lives = Math.min(lives + 1, maxLives);
        spawnFloatingText(player.x + TILE / 2, player.y, `MAKS. ZYCIA: ${maxLives}!`, '#ff44ff');
      } else {
        lives = Math.min(lives + 1, maxLives);
        spawnFloatingText(player.x + TILE / 2, player.y, '+1 ZYCIE!', '#44ff88');
      }
      break;
    case 'freeze':
      freezeTimer = 20;
      spawnFloatingText(player.x + TILE / 2, player.y, 'MROZ 20s!', '#44ddff');
      sfxFreeze();
      break;
    case 'skin': {
      const locked = SKINS.filter(s => !unlockedSkins.includes(s.id));
      if (locked.length > 0) {
        const newSkin = locked[Math.floor(Math.random() * locked.length)];
        unlockedSkins.push(newSkin.id);
        saveSkins();
        spawnFloatingText(player.x + TILE / 2, player.y, `SKIN: ${newSkin.name.toUpperCase()}!`, '#ffaa00');
      }
      break;
    }
  }
  hud();
  saveGameState();
}
```

- [ ] **Step 7: Add click handler for quiz**

In the `mousedown` event listener (line 3089), at the top of the handler, add:

```javascript
  if (state === 'quiz') {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    handleQuizClick(canvasX, canvasY);
    return;
  }
```

- [ ] **Step 8: Add touch handler for quiz**

In the canvas `touchstart` handler (line 3085), replace the single preventDefault line with:

```javascript
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (state === 'quiz' && e.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const canvasX = (e.touches[0].clientX - rect.left) * scaleX;
    const canvasY = (e.touches[0].clientY - rect.top) * scaleY;
    handleQuizClick(canvasX, canvasY);
  }
}, {passive:false});
```

- [ ] **Step 9: Verify quiz state transition**

Open game, walk onto mystery box. Game should pause (robots freeze). Nothing renders yet for the quiz overlay (that's Task 4), but confirm no JS errors and state is 'quiz'.

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "feat: add mystery box interaction and quiz state machine with rewards"
```

---

### Task 4: Quiz UI Rendering

**Files:**
- Modify: `index.html` — add `drawQuizOverlay()` and sub-functions

- [ ] **Step 1: Implement drawQuizOverlay()**

Add after the quiz logic functions (after `applyQuizReward()`):

```javascript
function drawQuizOverlay(t) {
  // Dark background
  ctx.fillStyle = 'rgba(5,5,15,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  if (quizPhase === 'choice') {
    drawQuizChoice(t);
  } else if (quizPhase === 'question' || quizPhase === 'feedback') {
    drawQuizQuestion(t);
  } else if (quizPhase === 'result') {
    drawQuizResult(t);
  }
}

function drawQuizChoice(t) {
  // Title
  ctx.fillStyle = '#ffe14d';
  ctx.font = "900 32px 'Courier New'";
  ctx.fillText('TAJEMNICZA SKRZYNKA', W / 2, H / 2 - 80);

  // Mystery box drawing
  const bx = W / 2 - 30, by = H / 2 - 70;
  ctx.save();
  ctx.fillStyle = '#7a4420';
  ctx.fillRect(bx, by, 60, 60);
  ctx.fillStyle = '#ffe14d';
  ctx.font = "bold 36px 'Courier New'";
  ctx.fillText('?', W / 2, H / 2 - 25);
  ctx.restore();

  // Buttons
  const btnW = 280, btnH = 50;
  const bxBtn = W / 2 - btnW / 2;

  // Button 1: Challenge
  const by1 = H / 2 + 20;
  ctx.fillStyle = '#1a4422';
  rr(bxBtn, by1, btnW, btnH, 6); ctx.fill();
  ctx.strokeStyle = '#44ff88';
  ctx.lineWidth = 2;
  rr(bxBtn, by1, btnW, btnH, 6); ctx.stroke();
  ctx.fillStyle = '#44ff88';
  ctx.font = "bold 16px 'Courier New'";
  ctx.fillText('PODEJMIJ WYZWANIE', W / 2, by1 + 30);

  // Button 2: Normal reward
  const by2 = H / 2 + 85;
  ctx.fillStyle = '#2a2a1a';
  rr(bxBtn, by2, btnW, btnH, 6); ctx.fill();
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 2;
  rr(bxBtn, by2, btnW, btnH, 6); ctx.stroke();
  ctx.fillStyle = '#ffe14d';
  ctx.font = "bold 16px 'Courier New'";
  ctx.fillText('WEZ ZWYKLA NAGRODE', W / 2, by2 + 30);

  // Hint
  ctx.fillStyle = '#556';
  ctx.font = "13px 'Courier New'";
  ctx.fillText('10 PYTAN — IM WIECEJ, TYM LEPSZA NAGRODA!', W / 2, H / 2 + 160);
}

function drawQuizQuestion(t) {
  const isFeedback = quizPhase === 'feedback';

  // Header
  ctx.fillStyle = '#889';
  ctx.font = "16px 'Courier New'";
  ctx.fillText(`PYTANIE ${quizQuestionIndex + 1}/10`, W / 2 - 100, 50);
  ctx.fillStyle = '#44ff88';
  ctx.fillText(`POPRAWNE: ${quizCorrectCount}`, W / 2 + 100, 50);

  // Word drawing area
  if (quizCurrentWord && quizCurrentWord.draw) {
    ctx.save();
    quizCurrentWord.draw(ctx, W / 2, H / 2 - 60, 120);
    ctx.restore();
  }

  // Polish word
  ctx.fillStyle = '#fff';
  ctx.font = "900 36px 'Courier New'";
  ctx.fillText(quizCurrentWord.pl.toUpperCase(), W / 2, H / 2 + 50);

  // 4 answer buttons (2x2 grid)
  const btnW = 200, btnH = 44;
  const gap = 16;
  const gridX = W / 2 - btnW - gap / 2;
  const gridY = H / 2 + 80;

  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const bx = gridX + col * (btnW + gap);
    const by = gridY + row * (btnH + gap);

    let bg = '#1a1a2e';
    let border = '#445';
    let textColor = '#ccc';

    if (isFeedback) {
      if (i === quizCorrectAnswer) {
        bg = '#0a3a0a'; border = '#44ff88'; textColor = '#44ff88';
      } else if (i === quizSelectedAnswer && i !== quizCorrectAnswer) {
        bg = '#3a0a0a'; border = '#ff4444'; textColor = '#ff4444';
      }
    }

    ctx.fillStyle = bg;
    rr(bx, by, btnW, btnH, 5); ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    rr(bx, by, btnW, btnH, 5); ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = "bold 16px 'Courier New'";
    ctx.fillText(quizOptions[i].toUpperCase(), bx + btnW / 2, by + 28);
  }
}

function drawQuizResult(t) {
  // Score
  ctx.fillStyle = quizCorrectCount >= 6 ? '#44ff88' : '#ff8844';
  ctx.font = "900 42px 'Courier New'";
  ctx.fillText(`WYNIK: ${quizCorrectCount}/10`, W / 2, H / 2 - 80);

  // Reward info
  if (quizReward) {
    ctx.fillStyle = quizReward.color;
    ctx.font = "bold 24px 'Courier New'";
    ctx.fillText(quizReward.label, W / 2, H / 2 - 20);

    // Tier label
    let tierLabel = '';
    if (quizCorrectCount >= 10) tierLabel = 'DIAMENTOWA NAGRODA';
    else if (quizCorrectCount >= 8) tierLabel = 'ZLOTA NAGRODA';
    else if (quizCorrectCount >= 6) tierLabel = 'SREBRNA NAGRODA';
    else tierLabel = 'BRAZOWA NAGRODA';

    ctx.fillStyle = '#889';
    ctx.font = "14px 'Courier New'";
    ctx.fillText(tierLabel, W / 2, H / 2 + 20);
  }

  // Sparkle particles around reward
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + t * 2;
    const r = 60 + Math.sin(t * 3 + i) * 10;
    const sx = W / 2 + Math.cos(angle) * r;
    const sy = H / 2 - 30 + Math.sin(angle) * r * 0.5;
    ctx.fillStyle = quizReward ? quizReward.color : '#ffe14d';
    ctx.globalAlpha = 0.5 + Math.sin(t * 5 + i) * 0.3;
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + Math.sin(t * 4 + i) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Continue button
  const btnW = 200, btnH = 50;
  const bx = W / 2 - btnW / 2;
  const by = H / 2 + 120;
  ctx.fillStyle = '#1a2a1a';
  rr(bx, by, btnW, btnH, 6); ctx.fill();
  ctx.strokeStyle = '#44ff88';
  ctx.lineWidth = 2;
  rr(bx, by, btnW, btnH, 6); ctx.stroke();
  ctx.fillStyle = '#44ff88';
  ctx.font = "bold 16px 'Courier New'";
  ctx.fillText('KONTYNUUJ', W / 2, by + 30);
}
```

- [ ] **Step 2: Verify quiz UI renders**

Open game, walk onto mystery box. Should see "TAJEMNICZA SKRZYNKA" screen with two buttons. Click "PODEJMIJ WYZWANIE" — nothing visible yet because QUIZ_WORDS is empty (defined in Task 5). Click "WEZ ZWYKLA NAGRODE" — should give a random powerup and return to gameplay.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add quiz overlay UI rendering (choice, question, result screens)"
```

---

### Task 5: Word Database (Part 1 — Data & First 40 Draw Functions)

**Files:**
- Modify: `index.html` — add QUIZ_WORDS array and first ~40 draw functions

- [ ] **Step 1: Add QUIZ_WORDS array and first 40 word entries**

After the SKINS-related code (after `saveSkins()` function), add the word database. Each entry has a draw function that renders a simple procedural image.

```javascript
// ════════════════════════════════════════════════════════════════
//  QUIZ WORD DATABASE
// ════════════════════════════════════════════════════════════════

// Draw helper for word illustrations
function wordBg(ctx, cx, cy, size) {
  // Optional: subtle circle background
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

const QUIZ_WORDS = [
  // ── ANIMALS ──
  { pl: 'kot', en: 'cat', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Head
    ctx.fillStyle = '#e8a040';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy - r * 0.6); ctx.lineTo(cx - r * 0.4, cy - r * 1.3); ctx.lineTo(cx - r * 0.05, cy - r * 0.7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.8, cy - r * 0.6); ctx.lineTo(cx + r * 0.4, cy - r * 1.3); ctx.lineTo(cx + r * 0.05, cy - r * 0.7); ctx.fill();
    // Eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = '#ff8888';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
    // Whiskers
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy + r * 0.2); ctx.lineTo(cx - r * 0.9, cy + r * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy + r * 0.3); ctx.lineTo(cx - r * 0.9, cy + r * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.2, cy + r * 0.2); ctx.lineTo(cx + r * 0.9, cy + r * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.2, cy + r * 0.3); ctx.lineTo(cx + r * 0.9, cy + r * 0.35); ctx.stroke();
  }},
  { pl: 'pies', en: 'dog', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#c08040';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Floppy ears
    ctx.beginPath(); ctx.ellipse(cx - r * 0.85, cy + r * 0.1, r * 0.3, r * 0.55, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.85, cy + r * 0.1, r * 0.3, r * 0.55, 0.3, 0, Math.PI * 2); ctx.fill();
    // Snout
    ctx.fillStyle = '#d8a060';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.3, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.15, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.15, r * 0.11, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.fill();
    // Tongue
    ctx.fillStyle = '#ff6666';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.55, r * 0.12, r * 0.18, 0, 0, Math.PI); ctx.fill();
  }},
  { pl: 'ryba', en: 'fish', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Body
    ctx.fillStyle = '#4488ff';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.2, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.beginPath(); ctx.moveTo(cx + r * 1.1, cy); ctx.lineTo(cx + r * 1.7, cy - r * 0.5); ctx.lineTo(cx + r * 1.7, cy + r * 0.5); ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
    // Fin
    ctx.fillStyle = '#3366cc';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.6); ctx.lineTo(cx - r * 0.3, cy - r * 1.1); ctx.lineTo(cx + r * 0.3, cy - r * 0.6); ctx.closePath(); ctx.fill();
  }},
  { pl: 'ptak', en: 'bird', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    // Body
    ctx.fillStyle = '#ee5533';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.3, r * 0.9, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.5, r * 0.5, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.55, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.55, r * 0.07, 0, Math.PI * 2); ctx.fill();
    // Beak
    ctx.fillStyle = '#ffaa22';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.85, cy - r * 0.45); ctx.lineTo(cx - r * 1.2, cy - r * 0.35); ctx.lineTo(cx - r * 0.85, cy - r * 0.25); ctx.closePath(); ctx.fill();
    // Wing
    ctx.fillStyle = '#cc3311';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.15, cy + r * 0.1, r * 0.6, r * 0.35, 0.3, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.beginPath(); ctx.moveTo(cx + r * 0.8, cy + r * 0.2); ctx.lineTo(cx + r * 1.4, cy - r * 0.1); ctx.lineTo(cx + r * 1.3, cy + r * 0.4); ctx.closePath(); ctx.fill();
  }},
  { pl: 'kon', en: 'horse', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Body
    ctx.fillStyle = '#b07030';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.2, r * 1.1, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Head (elongated)
    ctx.beginPath(); ctx.ellipse(cx - r * 0.8, cy - r * 0.6, r * 0.35, r * 0.55, -0.4, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.9, cy - r * 0.7, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Mane
    ctx.fillStyle = '#5a3010';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.9); ctx.quadraticCurveTo(cx - r * 0.1, cy - r * 1.1, cx + r * 0.2, cy - r * 0.3); ctx.lineTo(cx - r * 0.3, cy - r * 0.4); ctx.closePath(); ctx.fill();
    // Legs
    ctx.fillStyle = '#b07030';
    ctx.fillRect(cx - r * 0.6, cy + r * 0.6, r * 0.2, r * 0.6);
    ctx.fillRect(cx + r * 0.4, cy + r * 0.6, r * 0.2, r * 0.6);
  }},
  { pl: 'mysz', en: 'mouse', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.16;
    // Body
    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.8, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Big ears
    ctx.fillStyle = '#999';
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.7, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.7, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.7, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.7, r * 0.25, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = '#ff8888';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + r * 0.7, cy + r * 0.2); ctx.quadraticCurveTo(cx + r * 1.5, cy + r * 0.6, cx + r * 1.2, cy - r * 0.2); ctx.stroke();
  }},
  { pl: 'kaczka', en: 'duck', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    ctx.fillStyle = '#eecc33';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.2, r * 0.9, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.5, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8822';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.8, cy - r * 0.35, r * 0.3, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.6, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Wing
    ctx.fillStyle = '#ddbb22';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.2, cy + r * 0.1, r * 0.55, r * 0.3, 0.2, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'krolik', en: 'rabbit', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    ctx.fillStyle = '#ddd';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.3, r * 0.7, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, r * 0.45, 0, Math.PI * 2); ctx.fill();
    // Long ears
    ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 1.3, r * 0.15, r * 0.55, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy - r * 1.3, r * 0.15, r * 0.55, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.25, cy - r * 1.3, r * 0.08, r * 0.4, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy - r * 1.3, r * 0.08, r * 0.4, 0.1, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.35, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.2, cy - r * 0.35, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'zaba', en: 'frog', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#44bb44';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.9, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    // Eyes on top
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.55, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.4, cy - r * 0.55, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.55, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.4, cy - r * 0.55, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.55, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.4, cy - r * 0.55, r * 0.07, 0, Math.PI * 2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#227722'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r * 0.4, 0.1, Math.PI - 0.1); ctx.stroke();
  }},
  { pl: 'motyl', en: 'butterfly', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    // Wings
    ctx.fillStyle = '#ff66aa';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.6, cy - r * 0.3, r * 0.5, r * 0.7, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.6, cy - r * 0.3, r * 0.5, r * 0.7, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff88cc';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.5, cy + r * 0.4, r * 0.35, r * 0.45, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.5, cy + r * 0.4, r * 0.35, r * 0.45, 0.2, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.1, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Antennae
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.5); ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 1.2, cx - r * 0.5, cy - r * 1.0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.5); ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 1.2, cx + r * 0.5, cy - r * 1.0); ctx.stroke();
  }},
  { pl: 'lew', en: 'lion', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Mane
    ctx.fillStyle = '#cc7722';
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.fill();
    // Face
    ctx.fillStyle = '#eebb44';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = '#884422';
    ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.05); ctx.lineTo(cx - r * 0.1, cy + r * 0.2); ctx.lineTo(cx + r * 0.1, cy + r * 0.2); ctx.closePath(); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#884422'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.2); ctx.lineTo(cx, cy + r * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - r * 0.1, cy + r * 0.4, r * 0.1, -Math.PI * 0.5, Math.PI * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + r * 0.1, cy + r * 0.4, r * 0.1, Math.PI * 0.8, Math.PI * 1.5); ctx.stroke();
  }},
  { pl: 'slon', en: 'elephant', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#8899aa';
    // Body
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.9, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill();
    // Ear
    ctx.fillStyle = '#778899';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.95, cy - r * 0.2, r * 0.35, r * 0.5, -0.2, 0, Math.PI * 2); ctx.fill();
    // Trunk
    ctx.fillStyle = '#8899aa';
    ctx.strokeStyle = '#8899aa'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.05); ctx.quadraticCurveTo(cx - r * 1.1, cy + r * 0.8, cx - r * 0.7, cy + r * 0.9); ctx.stroke();
    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.35, r * 0.06, 0, Math.PI * 2); ctx.fill();
    // Tusk
    ctx.fillStyle = '#ffffee';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy + r * 0.1); ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 0.5, cx - r * 0.5, cy + r * 0.45); ctx.lineTo(cx - r * 0.45, cy + r * 0.15); ctx.closePath(); ctx.fill();
  }},
  { pl: 'zyrafa', en: 'giraffe', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.15;
    // Neck
    ctx.fillStyle = '#eeaa33';
    ctx.fillRect(cx - r * 0.25, cy - r * 1.8, r * 0.5, r * 1.8);
    // Body
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.3, r * 0.8, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.ellipse(cx, cy - r * 1.8, r * 0.3, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    // Spots
    ctx.fillStyle = '#cc7711';
    ctx.beginPath(); ctx.arc(cx - r * 0.1, cy - r * 0.8, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.1, cy - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy + r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.1, cy - r * 1.85, r * 0.05, 0, Math.PI * 2); ctx.fill();
    // Horns
    ctx.strokeStyle = '#eeaa33'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.15, cy - r * 2.0); ctx.lineTo(cx - r * 0.15, cy - r * 2.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.15, cy - r * 2.0); ctx.lineTo(cx + r * 0.15, cy - r * 2.3); ctx.stroke();
    ctx.fillStyle = '#cc7711';
    ctx.beginPath(); ctx.arc(cx - r * 0.15, cy - r * 2.3, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy - r * 2.3, r * 0.06, 0, Math.PI * 2); ctx.fill();
    // Legs
    ctx.fillStyle = '#eeaa33';
    ctx.fillRect(cx - r * 0.5, cy + r * 0.6, r * 0.18, r * 0.6);
    ctx.fillRect(cx + r * 0.3, cy + r * 0.6, r * 0.18, r * 0.6);
  }},
  { pl: 'niedzwiedz', en: 'bear', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.beginPath(); ctx.arc(cx - r * 0.6, cy - r * 0.65, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.6, cy - r * 0.65, r * 0.25, 0, Math.PI * 2); ctx.fill();
    // Snout
    ctx.fillStyle = '#A67B5B';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.2, r * 0.4, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.12, r * 0.12, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'krowa', en: 'cow', category: 'animals', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Body
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.9, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Spots
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - r * 0.1, r * 0.25, r * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy + r * 0.1, r * 0.2, r * 0.15, -0.2, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - r * 0.6, cy - r * 0.4, r * 0.35, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.7, cy - r * 0.5, r * 0.06, 0, Math.PI * 2); ctx.fill();
    // Nostrils
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.6, cy - r * 0.2, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - r * 0.65, cy - r * 0.18, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.55, cy - r * 0.18, r * 0.04, 0, Math.PI * 2); ctx.fill();
    // Horns
    ctx.strokeStyle = '#ddcc88'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy - r * 0.65); ctx.lineTo(cx - r * 0.95, cy - r * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.65); ctx.lineTo(cx - r * 0.25, cy - r * 0.9); ctx.stroke();
  }},

  // ── FOOD ──
  { pl: 'jablko', en: 'apple', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#dd2222';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.fillStyle = '#ff6666';
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
    // Stem
    ctx.strokeStyle = '#6b3e1e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + 2, cy - r * 1.4); ctx.stroke();
    // Leaf
    ctx.fillStyle = '#44aa44';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy - r * 1.2, r * 0.25, r * 0.1, 0.5, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'chleb', en: 'bread', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#daa555';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.1, r * 0.55, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + r * 1.1, cy + r * 0.3);
    ctx.ellipse(cx, cy + r * 0.3, r * 1.1, r * 0.15, 0, 0, Math.PI);
    ctx.closePath(); ctx.fill();
    // Top crust
    ctx.fillStyle = '#c89040';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.1, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
    // Score lines
    ctx.strokeStyle = '#b07830'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.15); ctx.lineTo(cx - r * 0.2, cy - r * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.2); ctx.lineTo(cx + r * 0.1, cy - r * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy - r * 0.15); ctx.lineTo(cx + r * 0.5, cy - r * 0.35); ctx.stroke();
  }},
  { pl: 'mleko', en: 'milk', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    // Carton
    ctx.fillStyle = '#eeeeff';
    ctx.fillRect(cx - r * 0.55, cy - r * 0.5, r * 1.1, r * 1.3);
    // Top triangle
    ctx.fillStyle = '#ddddef';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy - r * 0.5); ctx.lineTo(cx, cy - r * 1.0); ctx.lineTo(cx + r * 0.55, cy - r * 0.5); ctx.closePath(); ctx.fill();
    // Blue stripe
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(cx - r * 0.55, cy, r * 1.1, r * 0.35);
    // Text
    ctx.fillStyle = '#4488ff';
    ctx.font = `bold ${r * 0.35}px 'Courier New'`;
    ctx.textAlign = 'center';
    ctx.fillText('MILK', cx, cy - r * 0.1);
  }},
  { pl: 'ser', en: 'cheese', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Wedge
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy + r * 0.4); ctx.lineTo(cx + r * 0.8, cy + r * 0.4); ctx.lineTo(cx + r * 0.3, cy - r * 0.5); ctx.closePath(); ctx.fill();
    // Side
    ctx.fillStyle = '#eebb22';
    ctx.beginPath(); ctx.moveTo(cx + r * 0.8, cy + r * 0.4); ctx.lineTo(cx + r * 0.3, cy - r * 0.5); ctx.lineTo(cx + r * 0.5, cy - r * 0.35); ctx.lineTo(cx + r * 1.0, cy + r * 0.4); ctx.closePath(); ctx.fill();
    // Holes
    ctx.fillStyle = '#eebb22';
    ctx.beginPath(); ctx.arc(cx - r * 0.2, cy + r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.1, cy - r * 0.15, r * 0.06, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'ciasto', en: 'cake', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Bottom layer
    ctx.fillStyle = '#cc8844';
    ctx.fillRect(cx - r * 0.9, cy, r * 1.8, r * 0.6);
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.9, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    // Top layer
    ctx.fillStyle = '#dd9955';
    ctx.fillRect(cx - r * 0.7, cy - r * 0.5, r * 1.4, r * 0.5);
    ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.5, r * 0.7, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    // Frosting
    ctx.fillStyle = '#ffdddd';
    ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.5, r * 0.7, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    // Cherry
    ctx.fillStyle = '#dd2222';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.7, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#44aa44'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.8); ctx.lineTo(cx + r * 0.1, cy - r * 0.95); ctx.stroke();
  }},
  { pl: 'banan', en: 'banana', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#ffdd33';
    ctx.lineWidth = r * 0.4; ctx.strokeStyle = '#ffdd33'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.5, r * 0.9, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
    // Tips
    ctx.fillStyle = '#aa8822';
    ctx.beginPath(); ctx.arc(cx - r * 0.65, cy - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.7, cy + r * 0.05, r * 0.06, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'jajko', en: 'egg', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#fff8ee';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.55, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.15, cy - r * 0.2, r * 0.15, r * 0.25, -0.2, 0, Math.PI * 2); ctx.fill();
    // Shadow
    ctx.fillStyle = '#eedfcc';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.1, cy + r * 0.3, r * 0.3, r * 0.12, 0.1, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'lody', en: 'ice cream', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    // Cone
    ctx.fillStyle = '#daa555';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx, cy + r * 1.2); ctx.lineTo(cx + r * 0.5, cy); ctx.closePath(); ctx.fill();
    // Cross-hatch on cone
    ctx.strokeStyle = '#c89040'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy + r * 0.2); ctx.lineTo(cx + r * 0.2, cy + r * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.35, cy + r * 0.2); ctx.lineTo(cx - r * 0.2, cy + r * 0.8); ctx.stroke();
    // Scoops
    ctx.fillStyle = '#ff8899';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffddaa';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.5, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#88ccff';
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy - r * 0.5, r * 0.35, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'marchewka', en: 'carrot', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#ff8833';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy - r * 0.4); ctx.lineTo(cx, cy + r * 0.9); ctx.lineTo(cx + r * 0.35, cy - r * 0.4); ctx.closePath(); ctx.fill();
    // Lines
    ctx.strokeStyle = '#dd6622'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy); ctx.lineTo(cx + r * 0.2, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.12, cy + r * 0.3); ctx.lineTo(cx + r * 0.12, cy + r * 0.3); ctx.stroke();
    // Greens
    ctx.strokeStyle = '#44aa44'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.4); ctx.lineTo(cx - r * 0.3, cy - r * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.4); ctx.lineTo(cx, cy - r * 1.0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.4); ctx.lineTo(cx + r * 0.3, cy - r * 0.85); ctx.stroke();
  }},
  { pl: 'pomidor', en: 'tomato', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#dd3322';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ee5544';
    ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
    // Stem
    ctx.fillStyle = '#44aa44';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.ellipse(cx + Math.cos(a) * r * 0.2, cy - r * 0.85 + Math.sin(a) * r * 0.15, r * 0.15, r * 0.06, a, 0, Math.PI * 2);
    }
    ctx.fill();
  }},
  { pl: 'cukierek', en: 'candy', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.16;
    // Wrapper ends
    ctx.fillStyle = '#ff44aa';
    ctx.beginPath(); ctx.moveTo(cx - r * 1.3, cy - r * 0.3); ctx.lineTo(cx - r * 0.7, cy); ctx.lineTo(cx - r * 1.3, cy + r * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + r * 1.3, cy - r * 0.3); ctx.lineTo(cx + r * 0.7, cy); ctx.lineTo(cx + r * 1.3, cy + r * 0.3); ctx.closePath(); ctx.fill();
    // Body
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.7, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // Stripes
    ctx.fillStyle = '#ff88cc';
    ctx.fillRect(cx - r * 0.1, cy - r * 0.45, r * 0.2, r * 0.9);
    ctx.fillRect(cx - r * 0.5, cy - r * 0.35, r * 0.15, r * 0.7);
  }},
  { pl: 'woda', en: 'water', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Glass
    ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.6); ctx.lineTo(cx - r * 0.35, cy + r * 0.6); ctx.lineTo(cx + r * 0.35, cy + r * 0.6); ctx.lineTo(cx + r * 0.4, cy - r * 0.6); ctx.stroke();
    // Water
    ctx.fillStyle = 'rgba(68,150,255,0.4)';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.38, cy - r * 0.2); ctx.lineTo(cx - r * 0.35, cy + r * 0.6); ctx.lineTo(cx + r * 0.35, cy + r * 0.6); ctx.lineTo(cx + r * 0.38, cy - r * 0.2); ctx.closePath(); ctx.fill();
    // Bubbles
    ctx.fillStyle = 'rgba(200,230,255,0.5)';
    ctx.beginPath(); ctx.arc(cx - r * 0.1, cy + r * 0.2, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy + r * 0.35, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.05, cy, r * 0.05, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'sok', en: 'juice', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    // Box
    ctx.fillStyle = '#ff8833';
    ctx.fillRect(cx - r * 0.5, cy - r * 0.7, r * 1.0, r * 1.4);
    // Top
    ctx.fillStyle = '#ff6622';
    ctx.fillRect(cx - r * 0.5, cy - r * 0.7, r * 1.0, r * 0.25);
    // Straw
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + r * 0.15, cy - r * 0.7); ctx.lineTo(cx + r * 0.15, cy - r * 1.1); ctx.lineTo(cx + r * 0.35, cy - r * 1.2); ctx.stroke();
    // Orange circle label
    ctx.fillStyle = '#ffaa22';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.3, 0, Math.PI * 2); ctx.fill();
    // Leaf on orange
    ctx.fillStyle = '#44aa44';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.2, cy - r * 0.05, r * 0.12, r * 0.06, 0.5, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'pizza', en: 'pizza', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Slice triangle
    ctx.fillStyle = '#ffcc66';
    ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.8); ctx.lineTo(cx - r * 0.7, cy - r * 0.5); ctx.lineTo(cx + r * 0.7, cy - r * 0.5); ctx.closePath(); ctx.fill();
    // Crust
    ctx.strokeStyle = '#daa555'; ctx.lineWidth = r * 0.15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy - r * 0.5); ctx.lineTo(cx + r * 0.7, cy - r * 0.5); ctx.stroke();
    // Sauce
    ctx.fillStyle = '#dd4422';
    ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.5); ctx.lineTo(cx - r * 0.5, cy - r * 0.35); ctx.lineTo(cx + r * 0.5, cy - r * 0.35); ctx.closePath(); ctx.fill();
    // Pepperoni
    ctx.fillStyle = '#cc2211';
    ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, r * 0.08, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'truskawka', en: 'strawberry', category: 'food', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#dd2244';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.3); ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 0.6, cx, cy + r * 0.8); ctx.quadraticCurveTo(cx + r * 0.6, cy + r * 0.6, cx + r * 0.5, cy - r * 0.3); ctx.closePath(); ctx.fill();
    // Seeds
    ctx.fillStyle = '#ffee88';
    for (let i = 0; i < 6; i++) {
      const sx = cx + (Math.random() - 0.5) * r * 0.6;
      const sy = cy + r * (-0.1 + Math.random() * 0.6);
      ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.04, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Leaves
    ctx.fillStyle = '#44aa44';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy - r * 0.35); ctx.lineTo(cx - r * 0.1, cy - r * 0.6); ctx.lineTo(cx, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.1, cy - r * 0.55); ctx.lineTo(cx + r * 0.4, cy - r * 0.35);
    ctx.closePath(); ctx.fill();
  }},

  // ── OBJECTS ──
  { pl: 'dom', en: 'house', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Walls
    ctx.fillStyle = '#ddaa77';
    ctx.fillRect(cx - r * 0.7, cy - r * 0.1, r * 1.4, r * 0.9);
    // Roof
    ctx.fillStyle = '#cc3322';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.9, cy - r * 0.1); ctx.lineTo(cx, cy - r * 0.9); ctx.lineTo(cx + r * 0.9, cy - r * 0.1); ctx.closePath(); ctx.fill();
    // Door
    ctx.fillStyle = '#885533';
    ctx.fillRect(cx - r * 0.15, cy + r * 0.2, r * 0.3, r * 0.6);
    // Door knob
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(cx + r * 0.08, cy + r * 0.5, r * 0.04, 0, Math.PI * 2); ctx.fill();
    // Window
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(cx + r * 0.25, cy + r * 0.1, r * 0.3, r * 0.25);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + r * 0.25, cy + r * 0.1, r * 0.3, r * 0.25);
    ctx.beginPath(); ctx.moveTo(cx + r * 0.4, cy + r * 0.1); ctx.lineTo(cx + r * 0.4, cy + r * 0.35); ctx.stroke();
  }},
  { pl: 'pilka', en: 'ball', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Stripe
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, -0.3, Math.PI + 0.3); ctx.stroke();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'ksiazka', en: 'book', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Pages
    ctx.fillStyle = '#fff8ee';
    ctx.fillRect(cx - r * 0.6, cy - r * 0.5, r * 1.2, r * 0.9);
    // Cover
    ctx.fillStyle = '#3355aa';
    ctx.fillRect(cx - r * 0.7, cy - r * 0.55, r * 1.4, r * 0.15);
    ctx.fillRect(cx - r * 0.7, cy + r * 0.35, r * 1.4, r * 0.15);
    // Spine
    ctx.fillRect(cx - r * 0.7, cy - r * 0.55, r * 0.1, r * 1.05);
    // Title lines
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(cx - r * 0.3, cy - r * 0.1, r * 0.6, r * 0.06);
    ctx.fillRect(cx - r * 0.2, cy + r * 0.05, r * 0.4, r * 0.04);
  }},
  { pl: 'klucz', en: 'key', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = r * 0.15; ctx.lineCap = 'round';
    // Shaft
    ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy); ctx.lineTo(cx + r * 0.4, cy); ctx.stroke();
    // Head (ring)
    ctx.beginPath(); ctx.arc(cx + r * 0.65, cy, r * 0.3, 0, Math.PI * 2); ctx.stroke();
    // Teeth
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx - r * 0.5, cy + r * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy); ctx.lineTo(cx - r * 0.2, cy + r * 0.25); ctx.stroke();
  }},
  { pl: 'krzeslo', en: 'chair', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#885533';
    // Seat
    ctx.fillRect(cx - r * 0.55, cy, r * 1.1, r * 0.15);
    // Back
    ctx.fillRect(cx + r * 0.35, cy - r * 0.8, r * 0.15, r * 0.8);
    ctx.fillRect(cx - r * 0.5, cy - r * 0.8, r * 1.0, r * 0.15);
    // Front legs
    ctx.fillRect(cx - r * 0.5, cy + r * 0.15, r * 0.12, r * 0.6);
    ctx.fillRect(cx + r * 0.38, cy + r * 0.15, r * 0.12, r * 0.6);
  }},
  { pl: 'auto', en: 'car', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Body
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(cx - r * 1.0, cy - r * 0.1, r * 2.0, r * 0.55);
    // Roof
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.1); ctx.lineTo(cx - r * 0.3, cy - r * 0.55); ctx.lineTo(cx + r * 0.5, cy - r * 0.55); ctx.lineTo(cx + r * 0.6, cy - r * 0.1); ctx.closePath(); ctx.fill();
    // Windows
    ctx.fillStyle = '#88ccff';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 0.05); ctx.lineTo(cx - r * 0.25, cy - r * 0.45); ctx.lineTo(cx + r * 0.4, cy - r * 0.45); ctx.lineTo(cx + r * 0.5, cy - r * 0.05); ctx.closePath(); ctx.fill();
    // Wheels
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(cx - r * 0.55, cy + r * 0.45, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.55, cy + r * 0.45, r * 0.2, 0, Math.PI * 2); ctx.fill();
    // Hubcaps
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(cx - r * 0.55, cy + r * 0.45, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.55, cy + r * 0.45, r * 0.08, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'rower', en: 'bike', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.strokeStyle = '#cc3333'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    // Wheels
    ctx.beginPath(); ctx.arc(cx - r * 0.6, cy + r * 0.2, r * 0.4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + r * 0.6, cy + r * 0.2, r * 0.4, 0, Math.PI * 2); ctx.stroke();
    // Frame
    ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy + r * 0.2); ctx.lineTo(cx, cy - r * 0.3); ctx.lineTo(cx + r * 0.6, cy + r * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.3); ctx.lineTo(cx - r * 0.3, cy + r * 0.2); ctx.stroke();
    // Handlebars
    ctx.beginPath(); ctx.moveTo(cx - r * 0.15, cy - r * 0.5); ctx.lineTo(cx + r * 0.15, cy - r * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.3); ctx.lineTo(cx, cy - r * 0.5); ctx.stroke();
    // Seat
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.15, cy - r * 0.3, r * 0.15, r * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'zegar', en: 'clock', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Face
    ctx.fillStyle = '#fff8ee';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2); ctx.stroke();
    // Hour markers
    ctx.fillStyle = '#333';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, r * 0.04, 0, Math.PI * 2); ctx.fill();
    }
    // Hands
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.3, cy - r * 0.35); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - r * 0.1, cy - r * 0.55); ctx.stroke();
    // Center dot
    ctx.fillStyle = '#ff3333';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.06, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'parasol', en: 'umbrella', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Canopy
    ctx.fillStyle = '#dd3344';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.9, Math.PI, 0); ctx.closePath(); ctx.fill();
    // Scallops
    ctx.fillStyle = '#0a0a16';
    for (let i = 0; i < 4; i++) {
      const sx = cx - r * 0.9 + (i + 0.5) * r * 0.45;
      ctx.beginPath(); ctx.arc(sx, cy - r * 0.1, r * 0.22, 0, Math.PI); ctx.fill();
    }
    // Handle
    ctx.strokeStyle = '#885533'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.1); ctx.lineTo(cx, cy + r * 0.8); ctx.stroke();
    // Hook
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy + r * 0.8, r * 0.15, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  }},
  { pl: 'lampa', en: 'lamp', category: 'objects', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Base
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.7, r * 0.4, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    // Pole
    ctx.fillStyle = '#666';
    ctx.fillRect(cx - r * 0.06, cy - r * 0.2, r * 0.12, r * 0.9);
    // Shade
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy - r * 0.2); ctx.lineTo(cx - r * 0.5, cy - r * 0.7); ctx.lineTo(cx + r * 0.5, cy - r * 0.7); ctx.lineTo(cx + r * 0.2, cy - r * 0.2); ctx.closePath(); ctx.fill();
    // Glow
    ctx.save(); ctx.globalAlpha = 0.2;
    const g = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy - r * 0.3, r * 0.6);
    g.addColorStop(0, '#ffffaa'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }},
];
```

This is 40 words (15 animals + 13 food + 12 objects). The remaining words (nature, body, colors) are in Task 6.

- [ ] **Step 2: Verify quiz works with current words**

Open game, walk onto mystery box, click "PODEJMIJ WYZWANIE". Should see quiz questions with procedural drawings. Answer 10 questions, see result screen with reward. Click "KONTYNUUJ" to return to gameplay.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add word database with 40 words and procedural drawings (animals, food, objects)"
```

---

### Task 6: Word Database (Part 2 — Remaining 40 Draw Functions)

**Files:**
- Modify: `index.html` — append to QUIZ_WORDS array

- [ ] **Step 1: Add nature, body, and color words**

Append to the `QUIZ_WORDS` array (before the closing `];`):

```javascript
  // ── NATURE ──
  { pl: 'drzewo', en: 'tree', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Trunk
    ctx.fillStyle = '#885533';
    ctx.fillRect(cx - r * 0.2, cy, r * 0.4, r * 0.8);
    // Crown
    ctx.fillStyle = '#33aa44';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#44bb55';
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.1, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.35, cy, r * 0.35, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'kwiat', en: 'flower', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    // Stem
    ctx.strokeStyle = '#44aa44'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.2); ctx.lineTo(cx, cy + r * 0.9); ctx.stroke();
    // Leaf
    ctx.fillStyle = '#44aa44';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy + r * 0.6, r * 0.2, r * 0.08, 0.5, 0, Math.PI * 2); ctx.fill();
    // Petals
    ctx.fillStyle = '#ff6688';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.35, cy - r * 0.1 + Math.sin(a) * r * 0.35, r * 0.22, r * 0.12, a, 0, Math.PI * 2); ctx.fill();
    }
    // Center
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.18, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'slonce', en: 'sun', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Rays
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.65, cy + Math.sin(a) * r * 0.65);
      ctx.lineTo(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1);
      ctx.stroke();
    }
    // Sun
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
    // Face
    ctx.fillStyle = '#ff8833';
    ctx.beginPath(); ctx.arc(cx - r * 0.15, cy - r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy - r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r * 0.15, 0.1, Math.PI - 0.1); ctx.stroke();
  }},
  { pl: 'gwiazda', en: 'star', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      ctx.lineTo(cx + Math.cos(a2) * r * 0.4, cy + Math.sin(a2) * r * 0.4);
    }
    ctx.closePath(); ctx.fill();
  }},
  { pl: 'chmura', en: 'cloud', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    ctx.fillStyle = '#ddeeff';
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.4, cy, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy + r * 0.15, r * 0.35, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'deszcz', en: 'rain', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    // Cloud
    ctx.fillStyle = '#8899aa';
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.5, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.5, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.65, r * 0.4, 0, Math.PI * 2); ctx.fill();
    // Drops
    ctx.fillStyle = '#4488ff';
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * r * 0.35;
      const dy = r * (0.1 + (i % 2) * 0.3);
      ctx.beginPath(); ctx.moveTo(cx + dx, cy + dy - r * 0.1); ctx.quadraticCurveTo(cx + dx - r * 0.06, cy + dy + r * 0.1, cx + dx, cy + dy + r * 0.15); ctx.quadraticCurveTo(cx + dx + r * 0.06, cy + dy + r * 0.1, cx + dx, cy + dy - r * 0.1); ctx.fill();
    }
  }},
  { pl: 'snieg', en: 'snow', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    // Snowman
    ctx.fillStyle = '#eeeeff';
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.4, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.65, r * 0.25, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx - r * 0.1, cy - r * 0.7, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.1, cy - r * 0.7, r * 0.04, 0, Math.PI * 2); ctx.fill();
    // Nose
    ctx.fillStyle = '#ff8833';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.6); ctx.lineTo(cx + r * 0.2, cy - r * 0.55); ctx.lineTo(cx, cy - r * 0.52); ctx.closePath(); ctx.fill();
    // Buttons
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.3, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.04, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'gora', en: 'mountain', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Mountain
    ctx.fillStyle = '#667788';
    ctx.beginPath(); ctx.moveTo(cx - r * 1.1, cy + r * 0.6); ctx.lineTo(cx, cy - r * 0.8); ctx.lineTo(cx + r * 1.1, cy + r * 0.6); ctx.closePath(); ctx.fill();
    // Snow cap
    ctx.fillStyle = '#eeeeff';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.35); ctx.lineTo(cx, cy - r * 0.8); ctx.lineTo(cx + r * 0.3, cy - r * 0.35); ctx.lineTo(cx + r * 0.15, cy - r * 0.25); ctx.lineTo(cx - r * 0.1, cy - r * 0.3); ctx.closePath(); ctx.fill();
    // Second mountain
    ctx.fillStyle = '#556677';
    ctx.beginPath(); ctx.moveTo(cx + r * 0.2, cy + r * 0.6); ctx.lineTo(cx + r * 0.8, cy - r * 0.3); ctx.lineTo(cx + r * 1.3, cy + r * 0.6); ctx.closePath(); ctx.fill();
  }},
  { pl: 'rzeka', en: 'river', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#4488cc';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy - r * 0.9);
    ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 0.4, cx - r * 0.2, cy);
    ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 0.3, cx + r * 0.1, cy + r * 0.7);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.7);
    ctx.quadraticCurveTo(cx - r * 0.3, cy + r * 0.3, cx + r * 0.2, cy);
    ctx.quadraticCurveTo(cx + r * 0.8, cy - r * 0.4, cx + r * 0.1, cy - r * 0.9);
    ctx.closePath(); ctx.fill();
    // Waves
    ctx.strokeStyle = '#66aaee'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.1, cy - r * 0.3); ctx.quadraticCurveTo(cx + r * 0.1, cy - r * 0.4, cx + r * 0.2, cy - r * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy + r * 0.3); ctx.quadraticCurveTo(cx, cy + r * 0.2, cx + r * 0.15, cy + r * 0.3); ctx.stroke();
  }},
  { pl: 'morze', en: 'sea', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Water
    ctx.fillStyle = '#2266aa';
    ctx.fillRect(cx - r * 1.0, cy, r * 2.0, r * 0.7);
    // Sky
    ctx.fillStyle = '#88bbff';
    ctx.fillRect(cx - r * 1.0, cy - r * 0.7, r * 2.0, r * 0.7);
    // Waves
    ctx.fillStyle = '#3377bb';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(cx - r * 0.8 + i * r * 0.5, cy, r * 0.15, Math.PI, 0); ctx.fill();
    }
    // Sun
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath(); ctx.arc(cx + r * 0.6, cy - r * 0.4, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'trawa', en: 'grass', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.strokeStyle = '#44aa44'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const bx = cx - r * 0.7 + i * r * 0.23;
      const h = r * (0.5 + Math.random() * 0.5);
      const lean = (Math.random() - 0.5) * r * 0.3;
      ctx.strokeStyle = i % 2 === 0 ? '#44aa44' : '#55bb55';
      ctx.beginPath(); ctx.moveTo(bx, cy + r * 0.3); ctx.quadraticCurveTo(bx + lean * 0.5, cy - h * 0.5, bx + lean, cy + r * 0.3 - h); ctx.stroke();
    }
  }},
  { pl: 'ksiezyc', en: 'moon', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.fill();
    // Shadow to make crescent
    ctx.fillStyle = '#0a0a16';
    ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.1, r * 0.55, 0, Math.PI * 2); ctx.fill();
    // Stars around
    ctx.fillStyle = '#ffffaa';
    ctx.beginPath(); ctx.arc(cx + r * 0.8, cy - r * 0.6, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.7, cy + r * 0.5, r * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.5, cy + r * 0.7, r * 0.03, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'ogien', en: 'fire', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Outer flame
    ctx.fillStyle = '#ff4400';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.9); ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 0.2, cx + r * 0.4, cy + r * 0.5); ctx.quadraticCurveTo(cx, cy + r * 0.7, cx - r * 0.4, cy + r * 0.5); ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 0.2, cx, cy - r * 0.9); ctx.fill();
    // Inner flame
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.5); ctx.quadraticCurveTo(cx + r * 0.3, cy, cx + r * 0.2, cy + r * 0.4); ctx.quadraticCurveTo(cx, cy + r * 0.5, cx - r * 0.2, cy + r * 0.4); ctx.quadraticCurveTo(cx - r * 0.3, cy, cx, cy - r * 0.5); ctx.fill();
    // Core
    ctx.fillStyle = '#ffee66';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.2, r * 0.12, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'kamien', en: 'rock', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#888888';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy + r * 0.3); ctx.lineTo(cx - r * 0.5, cy - r * 0.4); ctx.lineTo(cx + r * 0.1, cy - r * 0.5); ctx.lineTo(cx + r * 0.6, cy - r * 0.2); ctx.lineTo(cx + r * 0.7, cy + r * 0.3); ctx.closePath(); ctx.fill();
    // Highlight
    ctx.fillStyle = '#999';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.3, cy - r * 0.1); ctx.lineTo(cx, cy - r * 0.35); ctx.lineTo(cx + r * 0.3, cy - r * 0.15); ctx.lineTo(cx + r * 0.1, cy + r * 0.1); ctx.closePath(); ctx.fill();
    // Crack
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.1, cy - r * 0.2); ctx.lineTo(cx + r * 0.05, cy + r * 0.1); ctx.lineTo(cx + r * 0.2, cy + r * 0.2); ctx.stroke();
  }},
  { pl: 'tecza', en: 'rainbow', category: 'nature', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    const colors = ['#ff0000','#ff8800','#ffff00','#44ff44','#4444ff','#8800ff'];
    for (let i = 0; i < colors.length; i++) {
      ctx.strokeStyle = colors[i]; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * (0.9 - i * 0.1), Math.PI, 0); ctx.stroke();
    }
  }},

  // ── BODY ──
  { pl: 'reka', en: 'hand', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#e8b888';
    // Palm
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.1, r * 0.45, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // Fingers
    for (let i = 0; i < 4; i++) {
      const fx = cx - r * 0.3 + i * r * 0.2;
      ctx.beginPath(); ctx.ellipse(fx, cy - r * 0.45, r * 0.08, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Thumb
    ctx.beginPath(); ctx.ellipse(cx - r * 0.5, cy, r * 0.2, r * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'noga', en: 'leg', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    ctx.fillStyle = '#e8b888';
    ctx.fillRect(cx - r * 0.2, cy - r * 0.9, r * 0.4, r * 1.4);
    // Knee
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.22, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    // Foot
    ctx.fillStyle = '#dd9966';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.1, cy + r * 0.6, r * 0.35, r * 0.15, 0.1, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'glowa', en: 'head', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#e8b888';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.fill();
    // Hair
    ctx.fillStyle = '#553322';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.72, Math.PI, 0); ctx.fill();
    // Eyes
    ctx.fillStyle = '#3366aa';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#cc6644'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, r * 0.15, 0.2, Math.PI - 0.2); ctx.stroke();
  }},
  { pl: 'oko', en: 'eye', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // White
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.8, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // Iris
    ctx.fillStyle = '#3388cc';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill();
    // Pupil
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2); ctx.fill();
    // Highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - r * 0.1, cy - r * 0.12, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // Outline
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.8, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }},
  { pl: 'ucho', en: 'ear', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#e8b888';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.4, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Inner ear
    ctx.fillStyle = '#ddaa88';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.05, cy, r * 0.25, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // Canal
    ctx.strokeStyle = '#cc9977'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx + r * 0.05, cy + r * 0.1, r * 0.15, Math.PI * 0.3, Math.PI * 1.5); ctx.stroke();
  }},
  { pl: 'nos', en: 'nose', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#e8b888';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.3, cx + r * 0.3, cy + r * 0.5); ctx.lineTo(cx - r * 0.3, cy + r * 0.5); ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.3, cx, cy - r * 0.7); ctx.fill();
    // Nostrils
    ctx.fillStyle = '#cc9977';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.12, cy + r * 0.35, r * 0.08, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.12, cy + r * 0.35, r * 0.08, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    // Bridge highlight
    ctx.strokeStyle = '#f0c8a8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.5); ctx.lineTo(cx, cy + r * 0.15); ctx.stroke();
  }},
  { pl: 'usta', en: 'mouth', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    // Lips
    ctx.fillStyle = '#dd5566';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy); ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 0.3, cx, cy - r * 0.15); ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 0.3, cx + r * 0.6, cy); ctx.quadraticCurveTo(cx + r * 0.2, cy + r * 0.35, cx, cy + r * 0.25); ctx.quadraticCurveTo(cx - r * 0.2, cy + r * 0.35, cx - r * 0.6, cy); ctx.fill();
    // Teeth hint
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - r * 0.3, cy - r * 0.05, r * 0.6, r * 0.1);
    // Line between lips
    ctx.strokeStyle = '#cc3344'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy); ctx.quadraticCurveTo(cx, cy + r * 0.05, cx + r * 0.5, cy); ctx.stroke();
  }},
  { pl: 'serce', en: 'heart', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.22;
    ctx.fillStyle = '#ff2244';
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.6);
    ctx.bezierCurveTo(cx - r * 1.2, cy - r * 0.2, cx - r * 0.5, cy - r * 0.9, cx, cy - r * 0.3);
    ctx.bezierCurveTo(cx + r * 0.5, cy - r * 0.9, cx + r * 1.2, cy - r * 0.2, cx, cy + r * 0.6);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#ff6688';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.35, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'palec', en: 'finger', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.18;
    ctx.fillStyle = '#e8b888';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.2, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Nail
    ctx.fillStyle = '#ffddcc';
    ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.55, r * 0.15, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Knuckle lines
    ctx.strokeStyle = '#cc9977'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.12, cy + r * 0.1); ctx.lineTo(cx + r * 0.12, cy + r * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.1, cy - r * 0.15); ctx.lineTo(cx + r * 0.1, cy - r * 0.15); ctx.stroke();
  }},
  { pl: 'stopa', en: 'foot', category: 'body', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s);
    const r = s * 0.2;
    ctx.fillStyle = '#e8b888';
    // Foot shape
    ctx.beginPath(); ctx.ellipse(cx + r * 0.1, cy + r * 0.1, r * 0.6, r * 0.3, 0.1, 0, Math.PI * 2); ctx.fill();
    // Heel
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy + r * 0.05, r * 0.25, 0, Math.PI * 2); ctx.fill();
    // Toes
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(cx + r * 0.5 + i * (-r * 0.1), cy - r * 0.1 + Math.abs(i - 2) * r * 0.04, r * (0.09 - i * 0.008), 0, Math.PI * 2); ctx.fill();
    }
  }},

  // ── COLORS ──
  { pl: 'czerwony', en: 'red', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#ff2222'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6666'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'niebieski', en: 'blue', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#2244ff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6688ff'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'zielony', en: 'green', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#22cc44'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#66ee88'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'zolty', en: 'yellow', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#ffdd22'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffee66'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'bialy', en: 'white', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#eeeeee'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.stroke();
  }},
  { pl: 'czarny', en: 'black', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#222222'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#444444'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'rozowy', en: 'pink', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#ff88aa'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffbbcc'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'fioletowy', en: 'purple', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#8833cc'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#aa66ee'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'pomaranczowy', en: 'orange', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#ff8822'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffaa55'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
  { pl: 'brazowy', en: 'brown', category: 'colors', draw(ctx, cx, cy, s) {
    wordBg(ctx, cx, cy, s); const r = s * 0.2;
    ctx.fillStyle = '#885533'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#aa7755'; ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }},
];
```

- [ ] **Step 2: Full quiz playthrough test**

Open game, walk onto mystery box, complete a full 10-question quiz. Verify:
- Drawings render correctly for each category
- Wrong answers are plausible (same category preferred)
- Score tracks correctly
- Reward applies correctly based on tier

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add remaining 40 words (nature, body, colors) to quiz database"
```

---

### Task 7: Audio & Freeze Visual Effects

**Files:**
- Modify: `index.html` — audio section (after existing sfx functions)
- Modify: `index.html` — robot rendering in draw() for freeze effect
- Modify: `index.html` — HUD for freeze timer

- [ ] **Step 1: Add procedural audio functions**

After the existing audio functions (around line 756, after `toggleMusicMute()`), add:

```javascript
function sfxMysteryBox() {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
  osc.connect(gain); gain.connect(sfxGain);
  osc.start(t); osc.stop(t + 0.4);
}

function sfxQuizCorrect() {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.setValueAtTime(1000, t + 0.05);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
  osc.connect(gain); gain.connect(sfxGain);
  osc.start(t); osc.stop(t + 0.15);
}

function sfxQuizWrong() {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.setValueAtTime(150, t + 0.08);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  osc.connect(gain); gain.connect(sfxGain);
  osc.start(t); osc.stop(t + 0.2);
}

function sfxQuizReward() {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.1);
    gain.gain.setValueAtTime(0, t + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.3);
  });
}

function sfxFreeze() {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2000, t);
  osc.frequency.exponentialRampToValueAtTime(4000, t + 0.3);
  osc.frequency.exponentialRampToValueAtTime(1500, t + 0.6);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
  osc.connect(gain); gain.connect(sfxGain);
  osc.start(t); osc.stop(t + 0.6);
  // Noise shimmer
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(0.04, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 3000;
  noise.connect(hp); hp.connect(nGain); nGain.connect(sfxGain);
  noise.start(t); noise.stop(t + 0.5);
}
```

- [ ] **Step 2: Add freeze visual effect on robots**

In `draw()` (around line 2630-2644), where robots are rendered, wrap the robot drawing with a freeze tint. Replace the robot rendering block with:

```javascript
  // Robots
  robots.forEach(r=>{
    if (!r.alive || isNaN(r.x) || isNaN(r.y)) return;
    ctx.save();
    if (r.isMini) {
      const cx = r.x+TILE/2, cy = r.y+TILE/2;
      ctx.translate(cx, cy);
      ctx.scale(0.6, 0.6);
      ctx.translate(-cx, -cy);
      drawRobot(cx, cy, r.facing, r.frame, t, r.type, r.hitFlash, r.hp);
    } else {
      drawRobot(r.x+TILE/2, r.y+TILE/2, r.facing, r.frame, t, r.type, r.hitFlash, r.hp);
    }
    // Freeze overlay
    if (freezeTimer > 0) {
      const rx = r.isMini ? r.x + TILE * 0.2 : r.x;
      const ry = r.isMini ? r.y + TILE * 0.2 : r.y;
      const rs = r.isMini ? TILE * 0.6 : TILE;
      ctx.fillStyle = 'rgba(100,180,255,0.3)';
      ctx.fillRect(rx + 2, ry + 2, rs - 4, rs - 4);
    }
    ctx.restore();
  });
```

- [ ] **Step 3: Add freeze timer to HUD**

In `hud()` function (line 1011), after the bombTxt line, add freeze display:

```javascript
  // Freeze timer in HUD
  if (freezeTimer > 0) {
    $bomb.textContent = bombTxt + ` ❄${Math.ceil(freezeTimer)}s`;
  }
```

- [ ] **Step 4: Update maxLives references**

In `isMaxedOut()` (line 1542), change `return lives >= 5;` to:

```javascript
  if (type===PU_LIFE)   return lives >= maxLives;
```

In `applyPowerup()` (line 1553), change the PU_LIFE line to:

```javascript
  if (type===PU_LIFE)   { lives = Math.min(lives+1, maxLives); score+=50; hud(); }
```

- [ ] **Step 5: Verify freeze and audio**

Start game, get 10/10 on quiz with freeze reward. Confirm:
- Robots freeze for 20 seconds
- Blue tint appears on frozen robots
- HUD shows freeze countdown
- Sound effects play for all quiz events

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add quiz audio, freeze visual effects, and HUD freeze timer"
```

---

### Task 8: Skin System (Rendering & Menu)

**Files:**
- Modify: `index.html` — drawCapybara() integration
- Modify: `index.html` — new skin draw functions
- Modify: `index.html` — skin menu in drawMenuScreen()
- Modify: `index.html` — input handling for skin menu

- [ ] **Step 1: Add skin decorator functions**

After the QUIZ_WORDS array, add skin rendering functions:

```javascript
// ════════════════════════════════════════════════════════════════
//  CAPYBARA SKINS
// ════════════════════════════════════════════════════════════════
function drawSkinAccessories(ctx, cx, cy, facing, frame, t) {
  const skinObj = SKINS.find(s => s.id === activeSkin);
  if (!skinObj || activeSkin === 'default') return;

  const S = TILE * 0.86;
  const bob = frame === 1 ? 2 : 0;

  switch (activeSkin) {
    case 'explorer': {
      // Safari hat
      ctx.fillStyle = '#c8a050';
      ctx.beginPath(); ctx.ellipse(0, -S * 0.38 + bob, S * 0.32, S * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b89040';
      ctx.beginPath();
      ctx.moveTo(-S * 0.18, -S * 0.38 + bob); ctx.lineTo(-S * 0.12, -S * 0.52 + bob);
      ctx.lineTo(S * 0.12, -S * 0.52 + bob); ctx.lineTo(S * 0.18, -S * 0.38 + bob);
      ctx.closePath(); ctx.fill();
      // Hat band
      ctx.fillStyle = '#885533';
      ctx.fillRect(-S * 0.18, -S * 0.4 + bob, S * 0.36, S * 0.03);
      break;
    }
    case 'knight': {
      // Helmet
      ctx.fillStyle = '#aabbcc';
      ctx.beginPath(); ctx.arc(0, -S * 0.3 + bob, S * 0.2, Math.PI, 0); ctx.fill();
      ctx.fillRect(-S * 0.2, -S * 0.3 + bob, S * 0.4, S * 0.08);
      // Visor slit
      ctx.fillStyle = '#334';
      ctx.fillRect(-S * 0.12, -S * 0.26 + bob, S * 0.24, S * 0.025);
      // Plume
      ctx.fillStyle = '#dd3333';
      ctx.beginPath(); ctx.ellipse(0, -S * 0.48 + bob, S * 0.04, S * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'pirate': {
      // Bandana
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(0, -S * 0.32 + bob, S * 0.2, Math.PI, 0); ctx.fill();
      // Skull
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, -S * 0.38 + bob, S * 0.06, 0, Math.PI * 2); ctx.fill();
      // Eye patch
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(facing * S * 0.08, -S * 0.2 + bob, S * 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(facing * S * 0.08, -S * 0.2 + bob); ctx.lineTo(facing * S * 0.18, -S * 0.32 + bob); ctx.stroke();
      break;
    }
    case 'astronaut': {
      // Helmet bubble
      ctx.save();
      ctx.strokeStyle = 'rgba(200,220,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -S * 0.22 + bob, S * 0.24, 0, Math.PI * 2); ctx.stroke();
      // Visor reflection
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#88ccff';
      ctx.beginPath(); ctx.arc(-S * 0.05, -S * 0.26 + bob, S * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Antenna
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -S * 0.44 + bob); ctx.lineTo(S * 0.05, -S * 0.55 + bob); ctx.stroke();
      ctx.fillStyle = '#ff4444';
      ctx.beginPath(); ctx.arc(S * 0.05, -S * 0.55 + bob, S * 0.03, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'wizard': {
      // Pointy hat
      ctx.fillStyle = '#7733bb';
      ctx.beginPath();
      ctx.moveTo(-S * 0.2, -S * 0.32 + bob); ctx.lineTo(0, -S * 0.65 + bob); ctx.lineTo(S * 0.2, -S * 0.32 + bob);
      ctx.closePath(); ctx.fill();
      // Stars on hat
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath(); ctx.arc(-S * 0.05, -S * 0.42 + bob, S * 0.025, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(S * 0.08, -S * 0.38 + bob, S * 0.02, 0, Math.PI * 2); ctx.fill();
      // Hat brim
      ctx.fillStyle = '#6622aa';
      ctx.beginPath(); ctx.ellipse(0, -S * 0.32 + bob, S * 0.24, S * 0.04, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'ninja': {
      // Mask
      ctx.fillStyle = '#222';
      ctx.fillRect(-S * 0.16, -S * 0.26 + bob, S * 0.32, S * 0.1);
      // Eye slit
      ctx.fillStyle = '#fff';
      ctx.fillRect(-S * 0.12, -S * 0.24 + bob, S * 0.24, S * 0.03);
      // Headband tail
      ctx.strokeStyle = '#dd2222'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-facing * S * 0.16, -S * 0.22 + bob);
      ctx.quadraticCurveTo(-facing * S * 0.3, -S * 0.18 + bob, -facing * S * 0.35, -S * 0.28 + bob);
      ctx.stroke();
      break;
    }
  }
}
```

- [ ] **Step 2: Integrate skins into drawCapybara()**

In `drawCapybara()` (line 2209), just before `ctx.restore();` at the very end (around line 2602), add:

```javascript
  // Skin accessories
  drawSkinAccessories(ctx, 0, 0, facing, frame, t);
```

Note: The coordinates are (0, 0) because drawCapybara already translates to (cx, cy).

- [ ] **Step 3: Add skin menu rendering**

In `drawMenuScreen()`, after the high scores section ends (after `return;` on line 2785), before the title rendering, add a skin menu check:

```javascript
  if (skinMenuOpen) {
    drawSkinMenu(t);
    return;
  }
```

Add the `drawSkinMenu` function after `drawPauseScreen()`:

```javascript
function drawSkinMenu(t) {
  ctx.fillStyle = '#0a0a16';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe14d';
  ctx.font = "900 32px 'Courier New'";
  ctx.fillText('SKINY', W / 2, 55);

  const cols = 4, cellW = 150, cellH = 130;
  const startX = W / 2 - (cols * cellW) / 2;
  const startY = 85;

  SKINS.forEach((skin, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const sx = startX + col * cellW + cellW / 2;
    const sy = startY + row * cellH + 50;
    const isUnlocked = unlockedSkins.includes(skin.id);
    const isActive = activeSkin === skin.id;

    // Cell background
    ctx.fillStyle = isActive ? 'rgba(255,225,77,0.1)' : 'rgba(255,255,255,0.03)';
    rr(sx - cellW / 2 + 8, sy - 45, cellW - 16, cellH - 10, 6);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2;
      rr(sx - cellW / 2 + 8, sy - 45, cellW - 16, cellH - 10, 6);
      ctx.stroke();
    }

    if (isUnlocked) {
      // Draw capybara preview with skin
      ctx.save();
      const prevSkin = activeSkin;
      activeSkin = skin.id;
      drawCapybara(sx, sy, 1, Math.floor(t * 2) % 2, 1, t);
      activeSkin = prevSkin;
      ctx.restore();

      // Name
      ctx.fillStyle = isActive ? '#ffe14d' : '#aab';
      ctx.font = "bold 11px 'Courier New'";
      ctx.fillText(skin.name.toUpperCase(), sx, sy + 42);
    } else {
      // Locked — gray silhouette
      ctx.save();
      ctx.globalAlpha = 0.3;
      const prevSkin = activeSkin;
      activeSkin = 'default';
      drawCapybara(sx, sy, 1, 0, 0.3, t);
      activeSkin = prevSkin;
      ctx.restore();

      // Padlock
      ctx.fillStyle = '#556';
      ctx.font = "22px 'Courier New'";
      ctx.fillText('🔒', sx, sy + 5);

      // Name
      ctx.fillStyle = '#445';
      ctx.font = "bold 11px 'Courier New'";
      ctx.fillText(skin.name.toUpperCase(), sx, sy + 42);
    }
  });

  // Back button
  ctx.fillStyle = '#556';
  ctx.font = "14px 'Courier New'";
  ctx.fillText('ESC — WROC    KLIKNIJ SKIN ABY WYBRAC', W / 2, H - 40);
}
```

- [ ] **Step 4: Add skin menu input handling**

In the keydown handler (line 2940), in the `state==='menu'` block, after `if (e.key==='h'||e.key==='H') showingHighScores = true;` (line 2963), add:

```javascript
    if (e.key==='s'||e.key==='S') skinMenuOpen = true;
    if (skinMenuOpen && (e.key==='Escape'||e.key==='Backspace')) { skinMenuOpen = false; return; }
```

Also update the menu prompt text. In `drawMenuScreen()`, in the prompt area (around line 2812-2813), update to include the SKINY option:

```javascript
  ctx.fillText(saveExists ? 'N — NOWA GRA    H — WYNIKI    S — SKINY' : 'H — WYNIKI    S — SKINY', W/2, H/2 + 130);
```

- [ ] **Step 5: Add skin selection click handler**

In the mousedown handler (line 3089), add skin menu click handling:

```javascript
  if (state === 'menu' && skinMenuOpen) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const cols = 4, cellW = 150, cellH = 130;
    const startX = W / 2 - (cols * cellW) / 2;
    const startY = 85;

    SKINS.forEach((skin, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const sx = startX + col * cellW + cellW / 2;
      const sy = startY + row * cellH + 50;
      const bx = sx - cellW / 2 + 8, by = sy - 45;
      if (canvasX >= bx && canvasX <= bx + cellW - 16 && canvasY >= by && canvasY <= by + cellH - 10) {
        if (unlockedSkins.includes(skin.id)) {
          activeSkin = skin.id;
          saveSkins();
        }
      }
    });
    return;
  }
```

- [ ] **Step 6: Verify skins work**

Open game, press S on menu to open skin gallery. Only "Kapibara" should be unlocked. Start game, get 10/10 on quiz, get skin reward. Return to menu, open skin gallery — new skin should be visible. Select it, start game — capybara should wear the skin.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add capybara skin system with 6 unlockable skins and selection menu"
```

---

### Task 9: Save System Integration & Polish

**Files:**
- Modify: `index.html` — buildSaveData(), loadGameState()
- Modify: `index.html` — canSaveGameState()
- Modify: `index.html` — edge cases cleanup

- [ ] **Step 1: Update buildSaveData()**

In `buildSaveData()` (line 322), add to the `game` object (after `detonatorBombIndex`):

```javascript
      freezeTimer,
      mysteryBoxUsed,
      maxLives,
```

- [ ] **Step 2: Update loadGameState()**

In `loadGameState()` (line 373), after the `detonatorBomb` line (line 418), add:

```javascript
    freezeTimer = typeof g.freezeTimer === 'number' ? g.freezeTimer : 0;
    mysteryBoxUsed = !!g.mysteryBoxUsed;
    maxLives = typeof g.maxLives === 'number' ? g.maxLives : 5;
```

- [ ] **Step 3: Update canSaveGameState()**

In `canSaveGameState()` (line 318), quiz state should NOT be saved (it's transient):

```javascript
function canSaveGameState() {
  return state === 'playing' || state === 'levelintro' || state === 'paused';
}
```

This already excludes 'quiz', so no change needed. Verify this is the case.

- [ ] **Step 4: Handle ESC during quiz**

In the keydown handler, after the quiz state handling would normally be, add ESC to cancel quiz:

```javascript
  if (state === 'quiz') {
    if (e.key === 'Escape') {
      // Cancel quiz, return normal reward as consolation
      const types = [PU_RANGE, PU_SPEED, PU_LIFE, PU_BOMBS];
      applyPowerup(types[Math.floor(Math.random() * types.length)]);
      state = 'playing';
    }
    return; // Block all other keys during quiz
  }
```

Add this in the keydown handler before the `if (state==='menu')` block.

- [ ] **Step 5: Verify save/load with new features**

Start game, pick up mystery box (mark used), get freeze reward. Save game (auto-save happens). Reload page. Continue game. Verify:
- `mysteryBoxUsed` persists (no second mystery box interaction)
- `freezeTimer` persists (if freeze was active)
- `maxLives` persists (if changed by quiz)

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: integrate quiz state with save system and add ESC to cancel quiz"
```

---

### Task 10: Final Testing & Verification

**Files:**
- No changes — testing only

- [ ] **Step 1: Full gameplay test — normal flow**

1. Start new game
2. Level 1: Find mystery box (upper-left quadrant)
3. Walk onto it — choice screen appears
4. Choose "WEZ ZWYKLA NAGRODE" — get random powerup, game resumes
5. Complete level, advance to level 2
6. Find mystery box on level 2

- [ ] **Step 2: Full quiz test — all tiers**

1. Start quiz, intentionally get 3/10 — verify bronze reward (random powerup)
2. New game, get 6/10 — verify silver reward (detonator or +2 lives)
3. New game, get 8/10 — verify gold reward (mega bomb)
4. New game, get 10/10 — verify diamond reward (max life, skin, or freeze)

- [ ] **Step 3: Freeze mechanic test**

1. Get freeze reward (10/10)
2. Verify all robots stop moving for 20 seconds
3. Verify blue tint on robots
4. Verify HUD shows countdown
5. Verify robots resume after timer expires

- [ ] **Step 4: Skin system test**

1. Unlock a skin via quiz
2. Open skin menu from main menu (press S)
3. Select new skin
4. Play game — verify skin accessories render correctly
5. Verify skin persists after page reload

- [ ] **Step 5: Edge cases**

1. Die during a level with mystery box — verify box reappears on respawn level
2. Boss level — verify mystery box appears
3. Save and reload during freeze timer — verify timer continues
4. Unlock all skins — verify 10/10 reward rerolls to another diamond option
5. Mobile/touch — verify quiz buttons work with touch

- [ ] **Step 6: Final commit**

```bash
git add index.html
git commit -m "feat: mystery box quiz system complete with skins, freeze, and rewards"
```
