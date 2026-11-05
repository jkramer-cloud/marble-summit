# Marble Summit — Phase 2.1: Neon Corners & Direct Board Play

Version: 2.1 · November 4, 2026

This **playable overhead** game is the revised Phase 2 prototype. It is not the Phase 3 fully 3D game. The geometry, route legality, die rules and animations are based on the deterministic movement engine.

## Deploy to your existing GitHub repository

1. Unzip this archive.
2. Open your existing `marble-summit` GitHub repository.
3. Upload the five required files below to the **repository root**, replacing matching files. You may also include the reference files, JSON source and tests.
4. Commit and wait for your configured GitHub Pages site to deploy. Reload with `Ctrl + Shift + R` if needed.
5. The existing Learning Hub card will continue opening Marble Summit; no Hub update is required.

Required web files:

```
index.html
style.css
app.js
board-data.js
engine.js
```

Additional source/development files: `board-geometry.json`, `movement-engine.mjs`, `tests/`, `reference/`, `CHANGELOG.md`, `README.md`.

## What's different from Phase 2

**Corrected HOME/START sequence:** For each player, the HOME ENTRY hole now comes one position BEFORE START in clockwise direction. For example Red HOME ENTRY is T07 and Red START is T08. It is therefore not possible to release a marble and immediately enter HOME. A marble earns HOME eligibility individually after it reaches its approach STAR on its completed circuit or valid shortcut.

**BASE marbles outside the hexagon:** Each player has four BASE holes on a lighted platform beyond their corner: two on each side of the corner's radial line. The six platforms are exactly 60° rotations of one reference arrangement.

**Choose directly on the board:** After rolling, click a glowing marble, then click its numbered glowing destination pad. If several routes end on the same hole, they have distinct numbered markers. The route selector in the sidebar remains available for longer descriptions and route previews.

**Choose colors:** In setup, each player can select a marble color from the six palettes. If another player already owns that color, the colors swap. The player's marbles, BASE platform, sector background, track line, HOME lane, START/ENTRY rings and score accent all use that assigned color. Player labels follow the actual selected color, not the original seat number.

**Screen-fit & expanded mode:** The overhead board height adjusts to the browser viewport instead of extending to a giant fixed rectangle. Use `⛶` to expand the board and hide the sidebar temporarily; a quick ROLL DIE button stays available. `⌖` resets board fit, plus/minus zoom, scroll to zoom, drag to pan. The complete board is visible by default on desktop and mobile at normal browser zoom.

**Important save behavior:** Because the START and HOME entrance holes changed in the movement graph, v2.1 uses a NEW local-storage save key (`marble-summit-precision-phase2-v2`). This avoids silently loading old marbles into changed positions. Existing v2 saves are not deleted, but they cannot be resumed in v2.1 automatically. Start a fresh match. New v2.1 matches autosave and resume normally on the same browser/device.

## Rules retained

- Two to six local players; humans and/or simple computer opponents.
- Roll 1 or 6 to release from BASE; the full die value is used for release.
- Completing a legal move after rolling 6 earns an extra turn; unusable 6 does NOT.
- Own marbles block every traversed hole; opponents can be passed and captured by exact landing.
- Only a marble that has earned its own HOME eligibility may enter its HOME lane; HOME entry is optional.
- HOME marbles can move inward on later turns, but cannot pass own pieces or overshoot.
- STAR shortcuts travel clockwise; a marble on a STAR at the beginning of a turn can choose the outer route or STAR ring. Exit from stars toward other sectors to threaten captures.
- Enter CENTER with exactly 1 from a STAR; exit CENTER with exactly 1 to a chosen STAR.
- Full die value required; no partial die use; first player to fill all four HOME holes wins.

## Quality checks

Run offline tests with Node 20+:

```bash
node --test tests/*.test.*
```

**35 automated tests passed** on this revision (Phase 1 engine regression, updated geometry, UI smoke tests). An additional Chromium browser check exercised color swapping, starting a match, clicking a marble and its *on-board* destination after rolling 6, the bonus turn, board expansion, and mobile/laptop/desktop layouts, with no page errors. Browser verification was performed by loading all local HTML/CSS/JS directly into the page instead of requesting the site over the network.

The Phase 3 3D rendering, physics die and advanced effects remain future features. This package deliberately does not replace the robust movement engine with screen-based approximations.
