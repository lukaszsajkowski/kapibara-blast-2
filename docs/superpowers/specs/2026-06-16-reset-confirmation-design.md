# Potwierdzenie resetu gry (klawisz R)

Data: 2026-06-16

## Problem

Klawisz **R** natychmiast resetuje grę przez `startNewGame()`, który wywołuje
`clearSavedGame()` i `reset()`. Dzieje się to w dwóch miejscach:

- `index.html:4710` — w stanie `paused` (opisane na ekranie pauzy jako „R — RESTART").
- `index.html:4736` — fallback w pętli klawiszy, czyli w trakcie gry (`playing`).

R bywa wciskane przez przypadek, przez co gracz traci cały postęp bez ostrzeżenia.

## Cel

Po wciśnięciu R pokazać nakładkę potwierdzenia. Reset następuje dopiero po
świadomym potwierdzeniu.

## Zachowanie

- W stanach `playing` i `paused` klawisz R nie resetuje od razu — otwiera nakładkę
  potwierdzenia (gra zostaje wstrzymana).
- Na nakładce:
  - **T** / **Y** / **Enter** → reset gry (`startNewGame()`).
  - **N** / **Esc** / dowolny inny klawisz → anuluj i wróć do stanu sprzed otwarcia
    nakładki (`playing` albo `paused`).
- Pozostałe użycia R bez zmian:
  - `gameover` (`index.html:4714`) — R → menu (brak postępu do stracenia).
  - menu — bez zmian.

## Implementacja

Wszystko w monolitycznym `index.html` (zgodnie z preferencją — bez dzielenia plików).

1. **Stan i pamięć powrotu**
   - Nowy stan gry `'confirmreset'`.
   - Nowa zmienna `resetReturnState` przechowująca `'playing'` lub `'paused'`.

2. **Obsługa klawiszy** (`keydown`)
   - W bloku `paused` (`index.html:4710`): zamiast `startNewGame()` ustaw
     `resetReturnState='paused'; state='confirmreset';`.
   - W fallbacku (`index.html:4736`, dotyczy `playing`): zamiast `startNewGame()`
     ustaw `resetReturnState='playing'; state='confirmreset';`.
   - Nowy blok `if (state==='confirmreset')`:
     - `T` / `Y` / `Enter` → `startNewGame();`
     - w przeciwnym razie → `state = resetReturnState;`
     - `return;` na końcu bloku.

3. **Renderowanie**
   - Funkcja `drawConfirmResetScreen(t)` w stylu `drawPauseScreen`
     (`index.html:4119`): przyciemnione tło `rgba(5,5,15,0.7)`, nagłówek
     „ZRESETOWAĆ GRĘ?", podtekst „Stracisz cały postęp", linia
     „[T] TAK     [N] NIE".
   - Dodać wywołanie w sekcji „Overlay screens" (`index.html:3903`):
     `if (state==='confirmreset') drawConfirmResetScreen(t);`

4. **Pętla gry / update**
   - Upewnić się, że w stanie `confirmreset` logika gry jest wstrzymana tak samo
     jak na pauzie (sprawdzić warunki update, np. analogicznie do `paused`;
     dodać `confirmreset` tam, gdzie trzeba, aby roboty/bomby nie aktualizowały się).

5. **Tekst pauzy** — bez zmian; „R — RESTART" nadal poprawne (prowadzi teraz do
   potwierdzenia).

## Poza zakresem (YAGNI)

- Brak timeoutu nakładki.
- Brak obsługi myszy/dotyku.
- Brak osobnego pełnoekranowego menu — minimalna nakładka.
