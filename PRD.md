# KAPIBARA BLAST — Product Requirements Document

## 1. Wizja produktu

Kapibara Blast to arcade'owa gra przeglądarkowa w stylu Bomberman, w której gracz wciela się w kapibarę-superbohatkę (w kostiumie, pelerynie i masce) i walczy z robotami na gridowej arenie. Gra jest w pełni renderowana na canvas z pixel-artową estetyką, ciemną paletą kolorów i dynamicznymi efektami cząsteczkowymi.

**Platforma docelowa:** przeglądarka (desktop, single HTML file)
**Język interfejsu:** polski
**Stack technologiczny:** Vanilla JS + Canvas 2D (zero dependencies)

---

## 2. Stan obecny (mockup)

### Co już działa:
- Grid 15x13 z kaflami: podłoga, ściany (niezniszczalne), skrzynki (zniszczalne)
- Gracz (kapibara w kostiumie superbohatera z peleryną, maską i emblematem błyskawicy)
- 4 typy robotów: Basic, Chaser, Speeder, Tank (różne AI, kolory, prędkości, HP)
- System bomb: stawianie, fuse timer, eksplozje krzyżowe z konfigurowalnym zasięgiem
- Powerupy: zasięg, szybkość, życie, dodatkowe bomby (wypadają ze skrzynek)
- System kolizji z grid-snappingiem (styl Bomberman)
- System cząsteczek (debris, ogień, iskry)
- Screen shake przy eksplozjach
- HUD: życia, wynik, liczba robotów, status bomby
- Ekrany: Game Over / Wygrana
- Sterowanie: WASD/strzałki + spacja (bomba) + R (restart)

### Czego brakuje (scope PRD):
Poniżej wymagania do implementacji, podzielone na fazy.

---

## 3. Faza 1 — Core Gameplay Loop

### 3.1 System poziomów
- **Wielopoziomowa struktura** — po zniszczeniu wszystkich robotów, gracz przechodzi do następnego poziomu
- Ekran przejścia między poziomami: "POZIOM X" z krótką animacją (fade in/out)
- Każdy kolejny poziom:
  - Więcej robotów (stopniowo zwiększana liczba)
  - Trudniejsze typy robotów pojawiają się wcześniej
  - Gęstość skrzynek rośnie (mniej swobodnej przestrzeni)
  - Szybkość robotów skaluje się minimalnie (+5% na poziom)
- Gracz zachowuje zebrane powerupy między poziomami
- **Minimum 10 poziomów**, po 10. gra się zapętla z rosnącym mnożnikiem trudności

### 3.2 System punktacji
- Istniejące: +10 za skrzynkę, +50 za powerup, +100/150/200/300 za roboty
- **Nowe:** mnożnik combo — zniszczenie wielu robotów jedną bombą daje bonus (x2, x3...)
- **Nowe:** bonus czasowy za szybkie ukończenie poziomu
- **Nowe:** wyświetlanie floating score text (+100, +200...) przy zdobyciu punktów — animowane, ulatujące w górę

### 3.3 Start Screen
- Ekran tytułowy "KAPIBARA BLAST" z animowaną kapibarą (idle animation)
- Opcje: "NOWA GRA", "NAJLEPSZE WYNIKI"
- Krótka instrukcja sterowania widoczna na dole

### 3.4 Ekran pauzy
- Klawisz `ESC` lub `P` — zatrzymanie gry
- Overlay: "PAUZA" z opcjami "KONTYNUUJ" / "RESTART" / "WYJDŹ DO MENU"

---

## 4. Faza 2 — Audio & Juice

### 4.1 Efekty dźwiękowe (Web Audio API)
Generowane proceduralnie (bez plików .mp3), by zachować single-file format:
- Stawianie bomby — krótki "thunk"
- Eksplozja — boom z wariacją na zasięg
- Śmierć robota — metaliczny crunch
- Podniesienie powerupu — pozytywny chime
- Śmierć gracza — dramatyczny sound
- Przejście poziomu — fanfara
- Chodzenie — delikatne kroki (opcjonalne)

### 4.2 Muzyka tła
- Prosty proceduralny beat/loop z Web Audio API (8-bit styl)
- Tempo rośnie gdy zostaje 1 robot
- Opcja mute (klawisz `M`)

### 4.3 Ulepszenia wizualne
- **Idle animation** kapibary — delikatne oddychanie/kołysanie peleryną
- **Trail particles** za szybkim graczem (po powerupie speed)
- **Danger indicator** — kafelki wokół bomby migają gdy zostaje <1s do wybuchu
- **Robot death animation** — rozpadanie się na części zamiast natychmiastowego zniknięcia
- **Cienie dynamiczne** — pod postaciami, reagujące na eksplozje (podświetlenie)

---

## 5. Faza 3 — Nowe mechaniki

### 5.1 Nowe typy powerupów
| Powerup | Ikona | Efekt |
|---------|-------|-------|
| Tarcza | 🛡 | Jednorazowa ochrona przed uderzeniem |
| Przejście | 👻 | Przechodzenie przez skrzynki przez 8s |
| Detonator | 🔴 | Następna bomba eksploduje na żądanie (ponowne spacja) |
| Mega Bomba | 💀 | Następna bomba ma pełny zasięg areny w jednej osi |

### 5.2 Nowe typy robotów (pojawiają się od wyższych poziomów)
| Robot | Kolor | Zachowanie |
|-------|-------|------------|
| Ghost | biały/przezroczysty | Przechodzi przez skrzynki |
| Bomber | pomarańczowy | Sam stawia bomby (na prostej ścieżce) |
| Splitter | żółty | Po zniszczeniu dzieli się na 2 mniejsze, szybsze wersje |
| Boss | złoty, 2x rozmiar | Pojawia się co 5 poziomów, 5 HP, specjalny atak |

### 5.3 Elementy mapy
- **Teleporty** — para kafelków, wejście na jeden przenosi na drugi
- **Lód** — poślizg (gracz i roboty jadą do następnej przeszkody)
- **Kolce** — pojawiają się/znikają cyklicznie, zadają obrażenia

---

## 6. Faza 4 — Persistence & Polish

### 6.1 Local Storage
- **High Score** — top 10 wyników z datą i osiągniętym poziomem
- **Ustawienia** — głośność muzyki/efektów, ostatnio używane sterowanie

### 6.2 Responsywność
- Canvas skaluje się do okna przeglądarki (zachowując proporcje)
- Obsługa touch controls na mobile (wirtualny d-pad + przycisk bomby)

### 6.3 Ekran podsumowania poziomu
- Po przejściu poziomu: wynik za poziom, bonus czasowy, combo bonus
- Animowane liczniki (count-up)

### 6.4 Mini-mapa / wskaźnik
- Gdy arena się rozrośnie — wskaźnik kierunku do ostatniego żywego robota

---

## 7. Wymagania techniczne

### 7.1 Format
- **Single HTML file** — cały kod (JS, CSS) w jednym pliku
- Zero zewnętrznych zależności (brak CDN, npm, ładowania zasobów)
- Całe audio generowane proceduralnie przez Web Audio API
- Cała grafika renderowana programowo na Canvas 2D

### 7.2 Wydajność
- Stabilne 60 FPS na przeciętnym laptopie
- System cząsteczek: max 500 aktywnych cząsteczek (pooling)
- Delta-time based physics (już zaimplementowane)

### 7.3 Kompatybilność
- Chrome, Firefox, Safari, Edge (ostatnie 2 wersje)
- Desktop-first, mobile jako stretch goal (Faza 4)

---

## 8. Grafika — wytyczne

**Trzymamy się istniejącego stylu graficznego:**
- Ciemna paleta (#0a0a16 tło, ciemne niebieskie/fioletowe ściany)
- Kapibara w stroju superbohatera: niebieski kostium, peleryna z fizyką, maska, emblemat błyskawicy, złoty kołnierz
- Roboty: metaliczne, z czerwonymi/kolorowymi oczami LED, antenami, panelami z diodami
- Bomby: klasyczny styl z lontem i iskrami
- Eksplozje: gradient biały → żółty → pomarańczowy → czerwony
- Powerupy: klejnotowe kształty z poświatą i etykietami po polsku
- Wszystko renderowane kodem (ctx.fill, ctx.stroke, gradienty) — brak sprite'ów

---

## 9. Sterowanie

| Akcja | Klawiatura | Mobile (Faza 4) |
|-------|-----------|-----------------|
| Ruch | WASD / Strzałki | Wirtualny D-pad |
| Bomba | Spacja | Przycisk "BOMBA" |
| Pauza | ESC / P | Przycisk "⏸" |
| Restart | R | Przycisk na ekranie końcowym |
| Mute | M | Ikona głośnika |
| Detonator | Spacja (ponownie) | Przycisk "BOMBA" (ponownie) |

---

## 10. Priorytety implementacji

```
Faza 1 — Core Gameplay Loop          [WYSOKI]
├── System poziomów z progresją trudności
├── Start screen
├── Ekran pauzy
├── Floating score text
└── Combo system

Faza 2 — Audio & Juice               [WYSOKI]
├── Proceduralny sound design
├── Muzyka tła
├── Danger indicators
├── Ulepszenia animacji
└── Robot death animation

Faza 3 — Nowe mechaniki              [ŚREDNI]
├── Nowe powerupy (tarcza, przejście, detonator, mega)
├── Nowe roboty (ghost, bomber, splitter, boss)
└── Elementy mapy (teleporty, lód, kolce)

Faza 4 — Persistence & Polish        [NISKI]
├── High score (localStorage)
├── Responsywność / mobile
├── Ekran podsumowania poziomu
└── Touch controls
```

---

## 11. Metryki sukcesu

- Gra działa płynnie w 60 FPS
- Gracz rozumie mechaniki bez tutoriala (intuicyjne sterowanie)
- Progresja trudności daje satysfakcję na poziomach 1-5, wyzwanie na 6-10
- Pełna gra zamyka się w jednym pliku HTML < 200KB
