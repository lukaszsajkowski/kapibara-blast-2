# Power-up Inventory System

## Summary

Zmiana systemu mega bomb i freeze z jednorazowych power-upów na system ekwipunku — gracz zbiera power-upy, przechowuje je w zapasie i sam decyduje kiedy ich użyć dedykowanymi klawiszami. Power-upy przenoszą się między levelami.

## Sterowanie

| Klawisz | Akcja |
|---------|-------|
| Spacja  | Normalna bomba (bez zmian) + detonator (bez zmian) |
| B       | Mega bomba (z zapasu) |
| V       | Freeze (z zapasu) |

## Stan

Dwie nowe zmienne globalne:

- `megaBombCount = 0` — ilość mega bomb w zapasie
- `freezeCount = 0` — ilość freeze w zapasie

Wartości stackują się (np. 3 mega bomby = `megaBombCount === 3`).

### Cykl życia

- **Zbieranie**: MEGA power-up → `megaBombCount++`. FREEZE power-up → `freezeCount++`.
- **Przenoszenie między levelami**: `startLevel()` nie resetuje tych zmiennych.
- **Reset przy nowej grze**: `startGame()` ustawia oba na 0.

## Mechanika użycia

### Mega bomba (B)

- Warunki: `megaBombCount > 0` && `bombCooldown <= 0` && `bombsActive < MAX_BOMBS`
- Stawia bombę z normalnym timerem ale mega zasięgiem (`range = Math.max(COLS, ROWS)`)
- `megaBombCount--`
- Dzieli cooldown i limit bomb z normalną bombą

### Freeze (V)

- Warunek: `freezeCount > 0`
- Ustawia `freezeTimer = 20` (zamraża roboty na 20s)
- `freezeCount--`
- Bez cooldownu; użycie podczas aktywnego freeze resetuje timer do 20s

### Brak power-upa w zapasie

- Naciśnięcie B/V bez zapasu — brak reakcji (nic się nie dzieje)

## HUD

Obok istniejących informacji o bombach, dwie ikonki:

- `💀 x3` — mega bomby w zapasie (biały tekst gdy > 0)
- `💀` wyszarzone — gdy brak mega bomb (szary kolor, bez "x0")
- `❄ x1` — freeze w zapasie (biały tekst gdy > 0)
- `❄` wyszarzone — gdy brak freeze (szary kolor, bez "x0")

## Zmiany w istniejącym kodzie

1. **Zbieranie MEGA**: `playerMega = true` → `megaBombCount++`
2. **Zbieranie FREEZE**: `freezeTimer = 20` → `freezeCount++`
3. **Spacja**: usunięcie logiki mega — Spacja zawsze stawia zwykłą bombę (detonator zostaje)
4. **Nowe keybindy**: B → mega bomba, V → freeze
5. **HUD update**: dodanie wyświetlania `megaBombCount` i `freezeCount`
6. **startGame()**: reset `megaBombCount = 0`, `freezeCount = 0`
7. **Flaga `playerMega`**: usunięta (nie potrzebna)

## Bez zmian

- Detonator — zostaje na Spacji jak dotychczas
- Efekty wizualne mega wybuchu (shake 10, particles)
- Efekty wizualne freeze (niebieskie tło, śnieżki)
- Odblokowanie power-upów według levelu (MEGA od lvl 6)
