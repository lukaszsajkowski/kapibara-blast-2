# Power-up Inventory System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change mega bomb and freeze from instant-use power-ups to an inventory system where the player collects them, stores them, and activates them on demand with B (mega bomb) and V (freeze). Inventory persists between levels.

**Architecture:** Add two global counter variables (`megaBombCount`, `freezeCount`). Modify power-up collection to increment counters instead of applying immediately. Add new key handlers for B and V. Update HUD to show inventory counts. Update save/load system. All changes in a single file.

**Tech Stack:** Vanilla JavaScript in `index.html`

---

### Task 1: Add inventory state variables and update reset/save/load

**Files:**
- Modify: `index.html:795` (state declarations)
- Modify: `index.html:1866-1872` (`reset()`)
- Modify: `index.html:1978` (`startLevel()`)
- Modify: `index.html:340-366` (`buildSaveData()`)
- Modify: `index.html:398-423` (`loadGameState()`)
- Modify: `index.html:4689` (initial state)

- [ ] **Step 1: Add `megaBombCount` and `freezeCount` global variables**

At `index.html:795`, replace:
```javascript
let playerMega = false;      // next bomb has full-range
```
with:
```javascript
let megaBombCount = 0;       // mega bombs in inventory
let freezeCount = 0;         // freeze power-ups in inventory
```

- [ ] **Step 2: Update `reset()` to reset inventory counters**

At `index.html:1870`, replace:
```javascript
  playerShield=false; playerGhost=0; playerDetonator=false; playerMega=false;
```
with:
```javascript
  playerShield=false; playerGhost=0; playerDetonator=false;
  megaBombCount=0; freezeCount=0;
```

- [ ] **Step 3: Update `startLevel()` to NOT reset inventory but remove `playerMega` reset**

At `index.html:1978`, replace:
```javascript
  playerGhost=0; playerShield=false; playerDetonator=false; playerMega=false;
```
with:
```javascript
  playerGhost=0; playerShield=false; playerDetonator=false;
```

Note: `megaBombCount` and `freezeCount` are intentionally NOT reset here — they persist between levels.

- [ ] **Step 4: Update `buildSaveData()` to save inventory**

At `index.html:354-355`, replace:
```javascript
      playerDetonator,
      playerMega,
```
with:
```javascript
      playerDetonator,
      megaBombCount,
      freezeCount,
```

- [ ] **Step 5: Update `loadGameState()` to load inventory**

At `index.html:414-415`, replace:
```javascript
    playerDetonator = !!g.playerDetonator;
    playerMega = !!g.playerMega;
```
with:
```javascript
    playerDetonator = !!g.playerDetonator;
    megaBombCount = typeof g.megaBombCount === 'number' ? g.megaBombCount : 0;
    freezeCount = typeof g.freezeCount === 'number' ? g.freezeCount : 0;
```

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add megaBombCount and freezeCount inventory state"
```

---

### Task 2: Change power-up collection to increment inventory counters

**Files:**
- Modify: `index.html:2648` (`isMaxedOut()`)
- Modify: `index.html:2660` (`applyPowerup()`)
- Modify: `index.html:4272-4274` (quiz reward `'mega'`)
- Modify: `index.html:4286-4289` (quiz reward `'freeze'`)

- [ ] **Step 1: Update `isMaxedOut()` for MEGA — remove cap since they stack**

At `index.html:2648`, replace:
```javascript
  if (type===PU_MEGA)   return playerMega === true;
```
with:
```javascript
  if (type===PU_MEGA)   return false;
```

- [ ] **Step 2: Update `applyPowerup()` for MEGA — increment counter instead of setting flag**

At `index.html:2660`, replace:
```javascript
  if (type===PU_MEGA)   { playerMega = true; score+=50; spawnFloatingText(player.x+TILE/2, player.y, 'MEGA BOMBA!', '#ff00ff'); }
```
with:
```javascript
  if (type===PU_MEGA)   { megaBombCount++; score+=50; spawnFloatingText(player.x+TILE/2, player.y, 'MEGA BOMBA!', '#ff00ff'); }
```

- [ ] **Step 3: Update quiz reward `'mega'` to increment counter**

At `index.html:4272-4274`, replace:
```javascript
    case 'mega':
      playerMega = true;
      spawnFloatingText(player.x + TILE / 2, player.y, 'MEGA BOMBA!', '#ff00ff');
      break;
```
with:
```javascript
    case 'mega':
      megaBombCount++;
      spawnFloatingText(player.x + TILE / 2, player.y, 'MEGA BOMBA!', '#ff00ff');
      break;
```

- [ ] **Step 4: Update quiz reward `'freeze'` to increment counter instead of instant activation**

At `index.html:4286-4289`, replace:
```javascript
    case 'freeze':
      freezeTimer = 20;
      spawnFloatingText(player.x + TILE / 2, player.y, 'MROZ 20s!', '#44ddff');
      sfxFreeze();
      break;
```
with:
```javascript
    case 'freeze':
      freezeCount++;
      spawnFloatingText(player.x + TILE / 2, player.y, 'MROZ!', '#44ddff');
      break;
```

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: power-up collection increments inventory counters"
```

---

### Task 3: Remove mega logic from Space key and add B/V key handlers

**Files:**
- Modify: `index.html:2420-2440` (Space key bomb planting — `updatePlayer()`)
- Modify: `index.html:4565-4608` (keydown handler)

- [ ] **Step 1: Remove mega flag from Space key bomb planting**

At `index.html:2429-2431`, replace:
```javascript
        const b = {tx,ty,timer:BOMB_FUSE,sparkT:0,isMega:playerMega,isDetonator:playerDetonator};
        if (playerDetonator) { b.timer = 9999; detonatorBomb = b; playerDetonator = false; }
        if (playerMega) { playerMega = false; }
```
with:
```javascript
        const b = {tx,ty,timer:BOMB_FUSE,sparkT:0,isMega:false,isDetonator:playerDetonator};
        if (playerDetonator) { b.timer = 9999; detonatorBomb = b; playerDetonator = false; }
```

- [ ] **Step 2: Add B key mega bomb planting in `updatePlayer()`**

After the Space key block (after `index.html:2440`), add:

```javascript
  // Plant mega bomb (B key)
  if ((keys['b']||keys['B']) && p.bombCooldown<=0 && megaBombCount > 0 && bombsActive < MAX_BOMBS) {
    const tx=Math.floor((p.x+TILE/2)/TILE), ty=Math.floor((p.y+TILE/2)/TILE);
    if (!solid(tx,ty,true,playerGhost>0)) {
      const b = {tx,ty,timer:BOMB_FUSE,sparkT:0,isMega:true,isDetonator:false};
      bombs.push(b);
      bombsActive++;
      megaBombCount--;
      p.bombCooldown=0.25;
      sfxBombPlace();
      hud();
      saveGameState();
    }
  }

  // Activate freeze (V key)
  if ((keys['v']||keys['V']) && freezeCount > 0) {
    freezeCount--;
    freezeTimer = 20;
    sfxFreeze();
    hud();
    saveGameState();
    keys['v']=false; keys['V']=false; // prevent repeat on hold
  }
```

- [ ] **Step 3: Prevent B and V from triggering during non-playing states**

The B and V logic is inside `updatePlayer()` which is only called during `playing` state (line 2294), so no additional guards needed. However, we need to prevent B and V from conflicting with menu/pause key handlers.

In the keydown handler, verify that `b`/`B` is not used in menu or pause states. Currently `b`/`B` is not handled in those states, so no conflict.

For `v`/`V` — also not handled in menu/pause states. No conflict.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add B key for mega bomb and V key for freeze activation"
```

---

### Task 4: Update HUD to show inventory counts

**Files:**
- Modify: `index.html:2073-2085` (`hud()` function)

- [ ] **Step 1: Update `hud()` to display inventory with greyed-out empty state**

At `index.html:2078-2084`, replace:
```javascript
  let bombTxt = `${bombsActive}/${MAX_BOMBS}`;
  if (playerDetonator) bombTxt += ' 🔴';
  if (playerMega) bombTxt += ' 💀';
  $bomb.textContent = bombTxt;
  if (freezeTimer > 0) {
    $bomb.textContent = bombTxt + ` ❄${Math.ceil(freezeTimer)}s`;
  }
```
with:
```javascript
  let bombTxt = `${bombsActive}/${MAX_BOMBS}`;
  if (playerDetonator) bombTxt += ' 🔴';
  $bomb.innerHTML = '';
  $bomb.appendChild(document.createTextNode(bombTxt + ' '));

  // Mega bomb inventory indicator
  const megaSpan = document.createElement('span');
  if (megaBombCount > 0) {
    megaSpan.textContent = `💀x${megaBombCount}`;
    megaSpan.style.color = '';
  } else {
    megaSpan.textContent = '💀';
    megaSpan.style.opacity = '0.3';
  }
  $bomb.appendChild(megaSpan);

  $bomb.appendChild(document.createTextNode(' '));

  // Freeze inventory indicator
  const freezeSpan = document.createElement('span');
  if (freezeCount > 0) {
    freezeSpan.textContent = `❄x${freezeCount}`;
    freezeSpan.style.color = '';
  } else {
    freezeSpan.textContent = '❄';
    freezeSpan.style.opacity = '0.3';
  }
  $bomb.appendChild(freezeSpan);

  // Active freeze timer
  if (freezeTimer > 0) {
    $bomb.appendChild(document.createTextNode(` ${Math.ceil(freezeTimer)}s`));
  }
```

- [ ] **Step 2: Verify HUD renders correctly by opening game in browser**

Run: `open index.html` (or start dev server)

Expected: HUD shows bomb count, then `💀` (greyed out or with count) and `❄` (greyed out or with count). When freeze is active, shows remaining seconds.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: show mega bomb and freeze inventory counts in HUD"
```

---

### Task 5: Manual testing and cleanup

**Files:**
- Modify: `index.html` (if any issues found)

- [ ] **Step 1: Test power-up collection**

Open game in browser. Use browser console to test:
```javascript
// Give yourself mega bombs and freeze for testing
megaBombCount = 3; freezeCount = 2; hud();
```

Verify:
- HUD shows `💀x3` and `❄x2` (not greyed out)
- Press B — mega bomb placed, HUD updates to `💀x2`
- Press V — freeze activates (robots stop, blue overlay, snowflakes), HUD shows `❄x1` and countdown timer
- Press B with 0 mega bombs — nothing happens
- Press V with 0 freeze — nothing happens
- HUD shows greyed-out `💀` and `❄` when counts are 0

- [ ] **Step 2: Test persistence between levels**

```javascript
// Set inventory and complete level to verify persistence
megaBombCount = 2; freezeCount = 1;
```

Complete the level. Verify mega bomb and freeze counts carry over to the next level.

- [ ] **Step 3: Test new game reset**

Start a new game (N key from menu). Verify `megaBombCount` and `freezeCount` are both 0.

- [ ] **Step 4: Test save/load**

Collect some power-ups, refresh the page, load the saved game. Verify inventory counts are preserved.

- [ ] **Step 5: Remove any remaining references to `playerMega` flag**

Search for any remaining `playerMega` references. The variable declaration was replaced in Task 1, and all usages should have been updated. Verify with a search:

```bash
grep -n "playerMega" index.html
```

Expected: no results. If any remain, update them.

- [ ] **Step 6: Final commit**

```bash
git add index.html
git commit -m "feat: complete power-up inventory system"
```
