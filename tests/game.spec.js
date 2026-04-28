const { test, expect } = require('@playwright/test');
const path = require('path');

const GAME_URL = `file://${path.resolve(__dirname, '..', 'Kapibara Blast.html')}`;

// Helper: evaluate game expression in browser context
function g(page, expr) {
  return page.evaluate(expr);
}

// Helper: start a new game and wait for 'playing' state
async function startGame(page) {
  await page.goto(GAME_URL);
  await page.waitForTimeout(200);
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(GAME_URL);
  await page.waitForTimeout(200);
  // Mute audio to avoid issues in headless
  await page.evaluate(() => { muted = true; musicMuted = true; });
  await page.evaluate(() => startNewGame());
  await page.waitForFunction(() => state === 'playing', { timeout: 5000 });
}

// Helper: kill all robots to complete current level
async function killAllRobots(page) {
  await page.evaluate(() => {
    robots.forEach(r => { r.alive = false; r.hp = 0; });
  });
}

// Helper: wait for specific game state
async function waitForState(page, targetState, timeout = 5000) {
  await page.waitForFunction((s) => state === s, targetState, { timeout });
}

// ════════════════════════════════════════════════════════════════
//  MAP & LEVEL GENERATION
// ════════════════════════════════════════════════════════════════

test.describe('Generowanie mapy', () => {
  test('mapa ma poprawne wymiary (15x13)', async ({ page }) => {
    await startGame(page);
    const dims = await g(page, () => ({ cols: map[0].length, rows: map.length }));
    expect(dims.cols).toBe(15);
    expect(dims.rows).toBe(13);
  });

  test('krawędzie mapy to ściany', async ({ page }) => {
    await startGame(page);
    const borders = await page.evaluate(() => {
      for (let x = 0; x < COLS; x++) {
        if (map[0][x] !== WALL || map[ROWS-1][x] !== WALL) return false;
      }
      for (let y = 0; y < ROWS; y++) {
        if (map[y][0] !== WALL || map[y][COLS-1] !== WALL) return false;
      }
      return true;
    });
    expect(borders).toBe(true);
  });

  test('filary na parzystych współrzędnych to ściany', async ({ page }) => {
    await startGame(page);
    const pillars = await page.evaluate(() => {
      for (let y = 2; y < ROWS-1; y += 2) {
        for (let x = 2; x < COLS-1; x += 2) {
          if (map[y][x] !== WALL) return false;
        }
      }
      return true;
    });
    expect(pillars).toBe(true);
  });

  test('narożniki mapy nie mają skrzynek', async ({ page }) => {
    await startGame(page);
    const safe = await page.evaluate(() => {
      // Check walkable tiles in safe zones (skip pillars which are always walls)
      const checks = [];
      for (let y = 1; y <= 2; y++) for (let x = 1; x <= 2; x++) {
        if (x % 2 === 0 && y % 2 === 0) continue; // skip pillars
        checks.push(map[y][x]);
      }
      return checks.every(t => t !== CRATE);
    });
    expect(safe).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
//  PLAYER MOVEMENT
// ════════════════════════════════════════════════════════════════

test.describe('Ruch gracza', () => {
  test('gracz startuje na pozycji (TILE, TILE)', async ({ page }) => {
    await startGame(page);
    const pos = await g(page, () => ({ x: player.x, y: player.y }));
    const tile = await g(page, () => TILE);
    expect(pos.x).toBe(tile);
    expect(pos.y).toBe(tile);
  });

  test('gracz porusza się w prawo', async ({ page }) => {
    await startGame(page);
    const startX = await g(page, () => player.x);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    const endX = await g(page, () => player.x);
    expect(endX).toBeGreaterThan(startX);
  });

  test('gracz porusza się w dół', async ({ page }) => {
    await startGame(page);
    const startY = await g(page, () => player.y);
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowDown');
    const endY = await g(page, () => player.y);
    expect(endY).toBeGreaterThan(startY);
  });

  test('gracz nie przechodzi przez ściany', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { player.x = TILE; player.y = TILE; });
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowLeft');
    const posX = await g(page, () => player.x);
    expect(posX).toBeGreaterThanOrEqual(0);
  });

  test('gracz nie przechodzi przez skrzynki (bez ducha)', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.x = TILE; player.y = TILE;
      playerGhost = 0;
      map[1][3] = CRATE;
    });
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    const endX = await g(page, () => player.x);
    const tile = await g(page, () => TILE);
    expect(endX).toBeLessThan(3 * tile);
  });
});

// ════════════════════════════════════════════════════════════════
//  BOMBING
// ════════════════════════════════════════════════════════════════

test.describe('Bomby', () => {
  test('gracz stawia bombę spacją', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { player.bombCooldown = 0; bombsActive = 0; MAX_BOMBS = 1; });
    const before = await g(page, () => bombs.length);
    await page.keyboard.down('Space');
    await page.waitForTimeout(150);
    await page.keyboard.up('Space');
    await page.waitForTimeout(50);
    const after = await g(page, () => bombs.length);
    expect(after).toBe(before + 1);
  });

  test('nie można postawić więcej bomb niż MAX_BOMBS', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.bombCooldown = 0;
      MAX_BOMBS = 1;
      bombsActive = 1;
    });
    const before = await g(page, () => bombs.length);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    const after = await g(page, () => bombs.length);
    expect(after).toBe(before);
  });

  test('bomba eksploduje po czasie', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 999;
      bombs.push({ tx: 5, ty: 5, timer: 0.1, sparkT: 0 });
      bombsActive++;
    });
    await page.waitForFunction(() => explosions.length > 0, { timeout: 3000 });
    const explCount = await g(page, () => explosions.length);
    expect(explCount).toBeGreaterThan(0);
  });

  test('eksplozja niszczy skrzynki', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 999;
      map[5][6] = CRATE;
      bombs.push({ tx: 5, ty: 5, timer: 0.1, sparkT: 0, isMega: false });
      bombsActive++;
      EXPL_RANGE = 2;
    });
    await page.waitForFunction(() => explosions.length > 0, { timeout: 3000 });
    await page.waitForTimeout(100);
    const tile = await g(page, () => map[5][6]);
    expect(tile).toBe(0); // FLOOR
  });

  test('eksplozja nie niszczy ścian', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 999;
      bombs.push({ tx: 1, ty: 1, timer: 0.1, sparkT: 0 });
      bombsActive++;
    });
    await page.waitForFunction(() => explosions.length > 0, { timeout: 3000 });
    const tile = await g(page, () => map[0][1]);
    expect(tile).toBe(1); // WALL
  });
});

// ════════════════════════════════════════════════════════════════
//  LEVEL PROGRESSION (bug fix tests)
// ════════════════════════════════════════════════════════════════

test.describe('Przechodzenie między poziomami', () => {
  test('zabicie wszystkich robotów kończy poziom', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
  });

  test('po zakończeniu poziomu przechodzi do następnego', async ({ page }) => {
    await startGame(page);
    const lvlBefore = await g(page, () => level);
    await killAllRobots(page);
    // Wait for auto-advance through levelcomplete → levelintro → playing
    await page.waitForFunction(() => state === 'playing' && level > 1, { timeout: 15000 });
    const lvlAfter = await g(page, () => level);
    expect(lvlAfter).toBe(lvlBefore + 1);
  });

  test('przejście klawiszem po zakończeniu animacji', async ({ page }) => {
    await startGame(page);
    const lvlBefore = await g(page, () => level);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    // Fast-forward summary counters
    await page.evaluate(() => {
      if (summaryCounters) {
        summaryCounters.done = true;
        summaryCounters.phase = 3;
      }
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => state !== 'levelcomplete', { timeout: 5000 });
    const lvlAfter = await g(page, () => level);
    expect(lvlAfter).toBe(lvlBefore + 1);
  });

  test('poziomy rosną sekwencyjnie (1→2→3→4→5)', async ({ page }) => {
    await startGame(page);
    const levels = [];
    for (let i = 0; i < 5; i++) {
      levels.push(await g(page, () => level));
      await killAllRobots(page);
      // Fast-forward through summary
      await waitForState(page, 'levelcomplete');
      await page.evaluate(() => {
        if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
      });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => state === 'playing', { timeout: 10000 });
    }
    levels.push(await g(page, () => level));
    // Verify sequential: 1, 2, 3, 4, 5, 6
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBe(levels[i-1] + 1);
    }
  });

  test('startLevel guard chroni przed podwójnym wywołaniem', async ({ page }) => {
    await startGame(page);
    // Directly test the guard: call startLevel while already in levelintro
    const result = await page.evaluate(() => {
      const lvlBefore = level;
      state = 'levelintro'; // simulate being in levelintro
      startLevel(); // should be guarded — no-op
      return { lvlBefore, lvlAfter: level, state };
    });
    expect(result.lvlAfter).toBe(result.lvlBefore);
    expect(result.state).toBe('levelintro');
  });

  test('level 5 to boss level', async ({ page }) => {
    await startGame(page);
    const isBoss = await page.evaluate(() => isBossLevel(5));
    expect(isBoss).toBe(true);
  });

  test('level 3 to nie boss level', async ({ page }) => {
    await startGame(page);
    const isBoss = await page.evaluate(() => isBossLevel(3));
    expect(isBoss).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
//  EKRAN PODSUMOWANIA — nie może się blokować
// ════════════════════════════════════════════════════════════════

test.describe('Ekran podsumowania poziomu', () => {
  test('klawisz podczas animacji liczników pomija animację', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    // Counters should NOT be done yet (animation just started)
    const doneBefore = await g(page, () => summaryCounters && summaryCounters.done);
    expect(doneBefore).toBe(false);
    // Press key to skip animation
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    const doneAfter = await g(page, () => summaryCounters && summaryCounters.done);
    expect(doneAfter).toBe(true);
  });

  test('drugi klawisz po pominięciu animacji przechodzi do następnego poziomu', async ({ page }) => {
    await startGame(page);
    const lvlBefore = await g(page, () => level);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    // First key: skip animation
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
    // Second key: advance to next level
    await page.keyboard.press('Space');
    await page.waitForFunction(() => state !== 'levelcomplete', { timeout: 5000 });
    const lvlAfter = await g(page, () => level);
    expect(lvlAfter).toBe(lvlBefore + 1);
  });

  test('kliknięcie myszą podczas animacji pomija animację', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    const doneBefore = await g(page, () => summaryCounters && summaryCounters.done);
    expect(doneBefore).toBe(false);
    await page.mouse.click(400, 400);
    await page.waitForTimeout(50);
    const doneAfter = await g(page, () => summaryCounters && summaryCounters.done);
    expect(doneAfter).toBe(true);
  });

  test('kliknięcie myszą po pominięciu animacji przechodzi dalej', async ({ page }) => {
    await startGame(page);
    const lvlBefore = await g(page, () => level);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    // First click: skip
    await page.mouse.click(400, 400);
    await page.waitForTimeout(50);
    // Second click: advance
    await page.mouse.click(400, 400);
    await page.waitForFunction(() => state !== 'levelcomplete', { timeout: 5000 });
    expect(await g(page, () => level)).toBe(lvlBefore + 1);
  });

  test('ekran podsumowania pokazuje poprawny numer poziomu (completedLevel)', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    const info = await g(page, () => ({
      completedLevel: summaryCounters.completedLevel,
      currentLevel: level,
    }));
    expect(info.completedLevel).toBe(info.currentLevel);
    expect(info.completedLevel).toBe(1);
  });

  test('completedLevel nie zmienia się po wywołaniu startLevel', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    const completedLvl = await g(page, () => summaryCounters.completedLevel);
    // Skip animation and advance
    await page.evaluate(() => {
      if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => state !== 'levelcomplete', { timeout: 5000 });
    // Level should have incremented, but the completed level was correct
    expect(completedLvl).toBe(1);
    expect(await g(page, () => level)).toBe(2);
  });

  test('wielokrotne szybkie naciśnięcia klawiszy nie powodują podwójnego skoku poziomu', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    await page.evaluate(() => {
      if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
    });
    // Rapid-fire keys
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => state === 'playing', { timeout: 10000 });
    expect(await g(page, () => level)).toBe(2);
  });

  test('wielokrotne szybkie kliknięcia myszą nie powodują podwójnego skoku poziomu', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    await page.evaluate(() => {
      if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
    });
    // Rapid clicks
    await page.mouse.click(400, 400);
    await page.mouse.click(400, 400);
    await page.mouse.click(400, 400);
    await page.waitForFunction(() => state === 'playing', { timeout: 10000 });
    expect(await g(page, () => level)).toBe(2);
  });

  test('startLevel z nieprawidłowego stanu (playing) nie zmienia poziomu', async ({ page }) => {
    await startGame(page);
    const result = await page.evaluate(() => {
      const lvlBefore = level;
      startLevel(); // state is 'playing' — should be blocked
      return { lvlBefore, lvlAfter: level, state };
    });
    expect(result.lvlAfter).toBe(result.lvlBefore);
    expect(result.state).toBe('playing');
  });

  test('startLevel z nieprawidłowego stanu (dead) nie zmienia poziomu', async ({ page }) => {
    await startGame(page);
    const result = await page.evaluate(() => {
      const lvlBefore = level;
      state = 'dead';
      startLevel();
      return { lvlBefore, lvlAfter: level };
    });
    expect(result.lvlAfter).toBe(result.lvlBefore);
  });

  test('startLevel z nieprawidłowego stanu (paused) nie zmienia poziomu', async ({ page }) => {
    await startGame(page);
    const result = await page.evaluate(() => {
      const lvlBefore = level;
      state = 'paused';
      startLevel();
      return { lvlBefore, lvlAfter: level };
    });
    expect(result.lvlAfter).toBe(result.lvlBefore);
  });

  test('auto-advance po 8 sekundach działa nawet gdy liczniki nie skończyły', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    // Deliberately keep counters not-done, but fast-forward levelTimer past 8s
    await page.evaluate(() => {
      if (summaryCounters) summaryCounters.done = false;
      levelTimer = 8.1;
    });
    // Next update frame should auto-advance
    await page.waitForFunction(() => state !== 'levelcomplete', { timeout: 3000 });
    expect(await g(page, () => level)).toBe(2);
  });

  test('podsumowanie z zerowym wynikiem za poziom nie blokuje ekranu', async ({ page }) => {
    await startGame(page);
    // Set score to 0 and kill robots directly (no points)
    await page.evaluate(() => {
      score = 0;
      levelScoreStart = 0;
      robots.forEach(r => { r.alive = false; r.hp = 0; });
    });
    await waitForState(page, 'levelcomplete');
    // Counters should still complete (all targets are 0)
    await page.waitForFunction(
      () => summaryCounters && summaryCounters.done,
      { timeout: 5000 }
    );
    // And advancing should work
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => state !== 'levelcomplete', { timeout: 5000 });
    expect(await g(page, () => level)).toBe(2);
  });

  test('przejście 3 poziomów z rzędu bez blokady', async ({ page }) => {
    await startGame(page);
    for (let i = 1; i <= 3; i++) {
      expect(await g(page, () => level)).toBe(i);
      await killAllRobots(page);
      await waitForState(page, 'levelcomplete');
      // Skip animation + advance
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
      await page.keyboard.press('Space');
      await page.waitForFunction(() => state === 'playing', { timeout: 10000 });
      expect(await g(page, () => level)).toBe(i + 1);
    }
  });

  test('HUD pokazuje poprawny poziom po przejściu do następnego', async ({ page }) => {
    await startGame(page);
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    await page.evaluate(() => {
      if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => state === 'playing', { timeout: 10000 });
    const hudLevel = await page.evaluate(() => document.getElementById('levelEl').textContent);
    expect(hudLevel).toBe('2');
    expect(await g(page, () => level)).toBe(2);
  });

  test('wynik jest zachowany między poziomami', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { score = 5000; });
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    const scoreAfterComplete = await g(page, () => score);
    expect(scoreAfterComplete).toBeGreaterThanOrEqual(5000);
    // Advance
    await page.evaluate(() => {
      if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => state === 'playing', { timeout: 10000 });
    const scoreAfterAdvance = await g(page, () => score);
    expect(scoreAfterAdvance).toBe(scoreAfterComplete);
  });
});

// ════════════════════════════════════════════════════════════════
//  ROBOTS
// ════════════════════════════════════════════════════════════════

test.describe('Roboty', () => {
  test('roboty pojawiają się na planszy', async ({ page }) => {
    await startGame(page);
    const count = await g(page, () => robots.length);
    expect(count).toBeGreaterThan(0);
  });

  test('roboty giną od eksplozji', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      // Player far from explosion, invince=0 so checkHits doesn't early-return
      player.x = TILE; player.y = TILE; player.invince = 0;
      playerShield = true; // shield absorbs accidental contact
      // Box in the robot
      map[4][5] = WALL; map[6][5] = WALL; map[5][4] = WALL; map[5][6] = WALL;
      map[5][5] = FLOOR;
      const target = mkRobot(5, 5, RT_BASIC); target.invince = 0;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [target, dummy];
      explosions.push({ x: 5, y: 5, timer: 0.9 });
    });
    await page.waitForFunction(() => !robots[0].alive, { timeout: 3000 });
  });

  test('tank wymaga 2 trafień', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.x = TILE; player.y = TILE; player.invince = 0;
      playerShield = true;
      map[4][5] = WALL; map[6][5] = WALL; map[5][4] = WALL; map[5][6] = WALL;
      map[5][5] = FLOOR;
      const target = mkRobot(5, 5, RT_TANK); target.invince = 0;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [target, dummy];
      explosions.push({ x: 5, y: 5, timer: 0.9 });
    });
    await page.waitForFunction(() => robots[0].hp < 2, { timeout: 3000 });
    expect(await g(page, () => robots[0].alive)).toBe(true);
    await page.evaluate(() => {
      robots[0].invince = 0;
      explosions.push({ x: 5, y: 5, timer: 0.9 });
    });
    await page.waitForFunction(() => !robots[0].alive, { timeout: 3000 });
  });

  test('splitter rozdziela się na 2 mini wersje', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.x = TILE; player.y = TILE; player.invince = 0;
      playerShield = true;
      map[4][5] = WALL; map[6][5] = WALL; map[5][4] = WALL; map[5][6] = WALL;
      map[5][5] = FLOOR;
      const target = mkRobot(5, 5, RT_SPLITTER); target.invince = 0; target.isMini = false;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [target, dummy];
      explosions.push({ x: 5, y: 5, timer: 0.9 });
    });
    await page.waitForFunction(() => !robots[0].alive, { timeout: 3000 });
    const minis = await g(page, () => robots.filter(r => r.alive && r.isMini).length);
    expect(minis).toBe(2);
  });

  test('kontakt z robotem zabija gracza', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 0;
      playerShield = false;
      player.x = 5 * TILE; player.y = 5 * TILE;
      robots = [mkRobot(5, 5, RT_BASIC)];
    });
    await waitForState(page, 'dead', 3000);
  });

  test('robotsForLevel zawsze zwraca co najmniej jednego robota', async ({ page }) => {
    await startGame(page);
    for (let lvl = 1; lvl <= 20; lvl++) {
      const count = await page.evaluate((l) => robotsForLevel(l).length, lvl);
      expect(count).toBeGreaterThan(0);
    }
  });
});

// ════════════════════════════════════════════════════════════════
//  POWERUPS
// ════════════════════════════════════════════════════════════════

test.describe('Powerupy', () => {
  test('powerup range zwiększa zasięg eksplozji', async ({ page }) => {
    await startGame(page);
    const before = await g(page, () => EXPL_RANGE);
    await page.evaluate(() => applyPowerup(PU_RANGE));
    const after = await g(page, () => EXPL_RANGE);
    expect(after).toBe(before + 1);
  });

  test('powerup speed zwiększa prędkość gracza', async ({ page }) => {
    await startGame(page);
    const before = await g(page, () => PLAYER_SPEED);
    await page.evaluate(() => applyPowerup(PU_SPEED));
    const after = await g(page, () => PLAYER_SPEED);
    expect(after).toBeGreaterThan(before);
  });

  test('powerup life dodaje życie', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { lives = 2; });
    await page.evaluate(() => applyPowerup(PU_LIFE));
    const l = await g(page, () => lives);
    expect(l).toBe(3);
  });

  test('powerup bombs zwiększa max bomb', async ({ page }) => {
    await startGame(page);
    const before = await g(page, () => MAX_BOMBS);
    await page.evaluate(() => applyPowerup(PU_BOMBS));
    const after = await g(page, () => MAX_BOMBS);
    expect(after).toBe(before + 1);
  });

  test('powerup shield chroni przed jednym trafieniem', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      applyPowerup(PU_SHIELD);
      player.invince = 0;
    });
    expect(await g(page, () => playerShield)).toBe(true);
    // Get hit by explosion
    await page.evaluate(() => {
      player.x = 5 * TILE; player.y = 5 * TILE;
      // Keep a dummy robot to prevent levelcomplete
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [dummy];
      bombs.push({ tx: 5, ty: 5, timer: 0.05, sparkT: 0 });
      bombsActive++;
    });
    // Wait for explosion to happen and shield to absorb
    await page.waitForFunction(() => !playerShield, { timeout: 3000 });
    expect(await g(page, () => player.alive)).toBe(true);
    expect(await g(page, () => playerShield)).toBe(false);
  });

  test('powerup mają limity (max values)', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      EXPL_RANGE = 5;
      PLAYER_SPEED = 6.5 * TILE;
      lives = 5;
      MAX_BOMBS = 4;
    });
    expect(await page.evaluate(() => isMaxedOut(PU_RANGE))).toBe(true);
    expect(await page.evaluate(() => isMaxedOut(PU_SPEED))).toBe(true);
    expect(await page.evaluate(() => isMaxedOut(PU_LIFE))).toBe(true);
    expect(await page.evaluate(() => isMaxedOut(PU_BOMBS))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
//  GHOST MECHANIC (bug fix tests)
// ════════════════════════════════════════════════════════════════

test.describe('Mechanika ducha', () => {
  test('duch pozwala przechodzić przez skrzynki', async ({ page }) => {
    await startGame(page);
    const canPass = await page.evaluate(() => {
      map[1][3] = CRATE;
      return canGo(TILE, TILE, 0.7, true);
    });
    expect(canPass).toBe(true);
  });

  test('ghost timer odlicza się w dół', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { playerGhost = 5.0; });
    await page.waitForFunction(() => playerGhost < 4.5, { timeout: 3000 });
    const ghost = await g(page, () => playerGhost);
    expect(ghost).toBeLessThan(5.0);
    expect(ghost).toBeGreaterThan(0);
  });

  test('gracz jest wypychany ze skrzynki po wygaśnięciu ducha', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      // Clear map around test area
      for (let y = 1; y < ROWS-1; y++)
        for (let x = 1; x < COLS-1; x++)
          if (map[y][x] === CRATE) map[y][x] = FLOOR;
      // Place crate at (5,5) and put player inside it
      map[5][5] = CRATE;
      player.x = 5 * TILE;
      player.y = 5 * TILE;
      player.invince = 999;
      playerGhost = 0.1; // about to expire
      // Keep a dummy robot
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [dummy];
    });
    // Wait for ghost to expire and push-out to happen
    await page.waitForFunction(() => playerGhost <= 0, { timeout: 3000 });
    await page.waitForTimeout(100);
    // Player should have been pushed out — canGo should be true at player position
    const result = await g(page, () => canGo(player.x, player.y, 0.7, false));
    expect(result).toBe(true);
  });

  test('gracz nie jest przenoszony jeśli stoi na wolnym polu po wygaśnięciu ducha', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.x = TILE; player.y = TILE;
      player.invince = 999;
      playerGhost = 0.1;
      map[1][1] = FLOOR;
    });
    await page.waitForFunction(() => playerGhost <= 0, { timeout: 3000 });
    const pos = await g(page, () => ({ x: player.x, y: player.y }));
    const tile = await g(page, () => TILE);
    // Should still be at original position (minor movement from game loop ok)
    expect(pos.x).toBeCloseTo(tile, -1);
    expect(pos.y).toBeCloseTo(tile, -1);
  });

  test('powerupy resetują się przy nowym poziomie', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      playerGhost = 5;
      playerShield = true;
      playerDetonator = true;
      playerMega = true;
    });
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    // Fast-forward summary
    await page.evaluate(() => {
      if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => state === 'playing', { timeout: 10000 });
    const powerups = await g(page, () => ({
      ghost: playerGhost,
      shield: playerShield,
      detonator: playerDetonator,
      mega: playerMega,
    }));
    expect(powerups.ghost).toBe(0);
    expect(powerups.shield).toBe(false);
    expect(powerups.detonator).toBe(false);
    expect(powerups.mega).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
//  SCORING & COMBO
// ════════════════════════════════════════════════════════════════

test.describe('Punktacja i combo', () => {
  test('zabicie robota daje punkty', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.x = TILE; player.y = TILE; player.invince = 0;
      playerShield = true;
      map[6][7] = WALL; map[8][7] = WALL; map[7][6] = WALL; map[7][8] = WALL;
      map[7][7] = FLOOR;
      const target = mkRobot(7, 7, RT_BASIC); target.invince = 0;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [target, dummy];
      explosions.push({ x: 7, y: 7, timer: 0.9 });
      window._scoreBefore = score;
    });
    await page.waitForFunction(() => !robots[0].alive, { timeout: 3000 });
    const gained = await g(page, () => score - window._scoreBefore);
    expect(gained).toBeGreaterThan(0);
  });

  test('combo mnoży punkty', async ({ page }) => {
    await startGame(page);
    const gained = await page.evaluate(() => {
      comboCount = 2;
      comboTimer = 1.0;
      const before = score;
      addScore(100, 100, 100);
      return score - before;
    });
    expect(gained).toBe(300); // 100 * 3x multiplier
  });

  test('combo max to 5x', async ({ page }) => {
    await startGame(page);
    const gained = await page.evaluate(() => {
      comboCount = 10;
      comboTimer = 1.0;
      const before = score;
      addScore(100, 100, 100);
      return score - before;
    });
    expect(gained).toBe(500); // 100 * 5x (capped)
  });

  test('bonus czasowy za szybkie ukończenie', async ({ page }) => {
    await startGame(page);
    // Set levelTime low then immediately kill robots
    await page.evaluate(() => { levelTime = 10; });
    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');
    const bonus = await g(page, () => levelTimeBonus);
    // levelTime advances slightly before check, so use range
    expect(bonus).toBeGreaterThan(500);
    expect(bonus).toBeLessThanOrEqual(550);
  });
});

// ════════════════════════════════════════════════════════════════
//  PLAYER LIVES & DEATH
// ════════════════════════════════════════════════════════════════

test.describe('Życia i śmierć', () => {
  test('gracz zaczyna z 3 życiami', async ({ page }) => {
    await startGame(page);
    expect(await g(page, () => lives)).toBe(3);
  });

  test('śmierć odejmuje życie', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 0;
      playerShield = false;
      player.x = 7 * TILE; player.y = 7 * TILE;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [dummy];
      bombs.push({ tx: 7, ty: 7, timer: 0.05, sparkT: 0 });
      bombsActive++;
    });
    await waitForState(page, 'dead', 3000);
    expect(await g(page, () => lives)).toBe(2);
  });

  test('respawn po śmierci z nieśmiertelnością', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 0;
      playerShield = false;
      player.x = 7 * TILE; player.y = 7 * TILE;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [dummy];
      bombs.push({ tx: 7, ty: 7, timer: 0.05, sparkT: 0 });
      bombsActive++;
    });
    await waitForState(page, 'dead', 3000);
    // Wait for respawn
    await waitForState(page, 'playing', 5000);
    expect(await g(page, () => player.alive)).toBe(true);
    const invince = await g(page, () => player.invince);
    expect(invince).toBeGreaterThan(0);
  });

  test('game over gdy 0 żyć', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      lives = 1;
      player.invince = 0;
      playerShield = false;
      player.x = 7 * TILE; player.y = 7 * TILE;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [dummy];
      bombs.push({ tx: 7, ty: 7, timer: 0.05, sparkT: 0 });
      bombsActive++;
    });
    await waitForState(page, 'dead', 3000);
    await waitForState(page, 'gameover', 5000);
  });
});

// ════════════════════════════════════════════════════════════════
//  MAP ELEMENTS: SPIKES, TELEPORT, ICE
// ════════════════════════════════════════════════════════════════

test.describe('Elementy mapy', () => {
  test('kolce zabijają gracza gdy aktywne', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 0;
      playerShield = false;
      map[5][5] = SPIKES;
      player.x = 5 * TILE; player.y = 5 * TILE;
      spikesTimer = 0;
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [dummy];
    });
    await waitForState(page, 'dead', 3000);
  });

  test('kolce nie zabijają gdy nieaktywne', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      player.invince = 0;
      playerShield = false;
      map[5][5] = SPIKES;
      player.x = 5 * TILE; player.y = 5 * TILE;
      spikesTimer = 2; // floor(2/2)%2 === 1 — hidden
      const dummy = mkRobot(13, 11, RT_BASIC); dummy.invince = 999;
      robots = [dummy];
    });
    await page.waitForTimeout(200);
    expect(await g(page, () => player.alive)).toBe(true);
  });

  test('teleport przenosi gracza', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      // Clear existing teleports
      for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
        if (map[y][x] === TELEPORT_A || map[y][x] === TELEPORT_B) map[y][x] = FLOOR;
      }
      map[5][5] = TELEPORT_A;
      map[9][9] = TELEPORT_B;
      player.x = 5 * TILE; player.y = 5 * TILE;
      player.invince = 999;
      teleportCooldown = 0;
    });
    await page.waitForFunction(() => {
      return Math.round(player.x/TILE) === 9 && Math.round(player.y/TILE) === 9;
    }, { timeout: 3000 });
  });
});

// ════════════════════════════════════════════════════════════════
//  SAVE / LOAD
// ════════════════════════════════════════════════════════════════

test.describe('Zapis i wczytywanie', () => {
  test('gra zapisuje i wczytuje stan', async ({ page }) => {
    await startGame(page);
    // Set a distinctive score and save
    await page.evaluate(() => {
      score = 12345;
      saveGameState();
    });
    const hasSave = await page.evaluate(() => hasSavedGame());
    expect(hasSave).toBe(true);
    // Reload and load saved game
    await page.goto(GAME_URL);
    await page.waitForTimeout(300);
    await page.evaluate(() => { muted = true; musicMuted = true; });
    // Load via direct call since Enter needs menu state
    const loaded = await page.evaluate(() => loadGameState());
    expect(loaded).toBe(true);
    const savedScore = await g(page, () => score);
    expect(savedScore).toBe(12345);
  });

  test('nowa gra czyści zapis i resetuje score', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => { score = 99999; saveGameState(); });
    await page.evaluate(() => { muted = true; musicMuted = true; startNewGame(); });
    await page.waitForFunction(() => state === 'playing', { timeout: 5000 });
    expect(await g(page, () => score)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
//  GAME STATE MACHINE
// ════════════════════════════════════════════════════════════════

test.describe('Maszyna stanów gry', () => {
  test('gra startuje w stanie menu', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto(GAME_URL);
    await page.waitForTimeout(300);
    expect(await g(page, () => state)).toBe('menu');
  });

  test('pauza działa', async ({ page }) => {
    await startGame(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect(await g(page, () => state)).toBe('paused');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect(await g(page, () => state)).toBe('playing');
  });

  test('stany: menu → levelintro → playing → levelcomplete → levelintro', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto(GAME_URL);
    await page.waitForTimeout(200);
    expect(await g(page, () => state)).toBe('menu');

    await page.evaluate(() => { muted = true; musicMuted = true; startNewGame(); });
    await page.waitForFunction(() => state === 'playing', { timeout: 5000 });

    await killAllRobots(page);
    await waitForState(page, 'levelcomplete');

    // Fast-forward to next level
    await page.evaluate(() => {
      if (summaryCounters) { summaryCounters.done = true; summaryCounters.phase = 3; }
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => state === 'levelintro' || state === 'playing', { timeout: 5000 });
  });
});

// ════════════════════════════════════════════════════════════════
//  DIFFICULTY SCALING
// ════════════════════════════════════════════════════════════════

test.describe('Skalowanie trudności', () => {
  test('więcej robotów na wyższych poziomach (non-boss)', async ({ page }) => {
    await startGame(page);
    const count1 = await page.evaluate(() => robotsForLevel(1).length);
    const count3 = await page.evaluate(() => robotsForLevel(3).length);
    const count7 = await page.evaluate(() => robotsForLevel(7).length);
    expect(count3).toBeGreaterThan(count1);
    expect(count7).toBeGreaterThan(count3);
  });

  test('nowe typy robotów pojawiają się z poziomem', async ({ page }) => {
    await startGame(page);
    const types2 = await page.evaluate(() => [...new Set(robotsForLevel(2))]);
    const types6 = await page.evaluate(() => [...new Set(robotsForLevel(6))]);
    expect(types6.length).toBeGreaterThan(types2.length);
  });

  test('boss level co 5 poziomów zawiera RT_BOSS', async ({ page }) => {
    await startGame(page);
    for (const lvl of [5, 10, 15]) {
      const hasBoss = await page.evaluate((l) => robotsForLevel(l).includes(RT_BOSS), lvl);
      expect(hasBoss).toBe(true);
    }
  });
});
