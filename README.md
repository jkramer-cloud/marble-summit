# Marble Summit — Phase 2: Playable Precision Prototype

**Version:** 2.0 · November 4, 2026

This is the **playable overhead arcade-tabletop game** built from the approved **Precision Board v2** and the verified **Phase 1 movement engine**. It is NOT yet the final 3D version. The 3D board, orbiting camera, realistic physics die, and advanced VFX are reserved for Phase 3.

## Quick start

1. Extract the ZIP.
2. Open `index.html` directly in Chrome, Edge, or a comparable modern browser **or** upload the files to the repository root and open the site's GitHub Pages URL.
3. Choose **2–6 participants**. Assign each to **Human** or **Computer**.
4. Click **START GAME**, then **ROLL DIE** (or press Space when no control has keyboard focus).
5. On a legal roll, select a glowing marble and choose its exact route from the sidebar. Hovering a route previews it on the board; clicking the route commits it.

All JS, CSS, and board data are included locally. There is **no external dependency, build step, API key, account, or mandatory network request**.

## GitHub deployment

Existing project: `jkramer-cloud/marble-summit` (or whichever repository currently hosts the game).

- Extract ZIP into the repository root, replacing `index.html` and `README.md`.
- Upload the new `style.css`, `app.js`, `engine.js`, and `board-data.js` alongside the HTML file.
- `board-geometry.json` and `movement-engine.mjs` are included as readable authoritative files; `tests/` and `reference/` support future development.
- GitHub Pages should publish from the root of the main branch, as before.
- If a previous version appears after deployment, hard refresh (Ctrl+Shift+R). Old assets can remain; this version does not use them.
- The Learning Hub card points to the Marble Summit site; its link generally does not need to change.

### Required deployed files

```
index.html
style.css
app.js
engine.js
board-data.js
```

The other files are useful for future modifications and engine verification but are not loaded by the running browser game.

## Phase 2 functionality

- Exact **139-hole** board: 90 track positions (including 6 STAR junctions), 24 BASE, 24 HOME, and 1 CENTER.
- Six identical rotated board sectors, separate 4-marble BASE/HOME per player.
- 2–6 participants, any combination of local humans and basic computer opponents.
- Actual six-sided die result with a short roll animation (not 3D yet).
- Clickable marbles; legally selectable pieces illuminated; route choices previewed before confirmation.
- Every move is validated by the Phase 1 rules engine, with full-path legality checks.
- Main circuit, optional clockwise STAR shortcut ring, star-to-outer exits, CENTER and HOME branch.
- Exact die values, own-marble blocking, capture on opponent landing, BASE return.
- Captured marble indication and a temporary KNOCKOUT marker (advanced effects planned for Phase 3).
- Zoom buttons, scroll-wheel zoom, drag-to-pan board; overhead precision view.
- Player standings, move journal, autosave and resume from browser local storage.
- Basic computer player prefers captures, HOME progress, and BASE releases; it is not a strong competitive AI.
- Keyboard-friendly buttons, descriptive hints, reduced-motion preference support, and responsive layout.

## Critical rules implemented

1. Leave BASE on **1 or 6 only**. Launch uses that entire die roll. A successful 6 earns an extra roll.
2. Opponents do not block movement; landing exactly on an opponent sends it back to BASE.
3. Cannot jump over or land on your own marble, on any route (including STAR and HOME).
4. STAR shortcuts are available only when starting the new die roll on a STAR. Travel clockwise or exit onto the main track at any star.
5. Roll exactly 1 on a STAR to enter CENTER. From CENTER, only a later roll of exactly 1 exits to any STAR.
6. HOME eligibility is tracked **per marble**, not per player. A marble must reach its own approach STAR after release (or via a valid shortcut).
7. Entry into HOME is optional; continue around the main circuit to try captures if desired.
8. HOME marbles remain mobile on later turns; they cannot overshoot or jump own marbles.
9. A roll must be used fully on **one marble**. It cannot be split or partially used.
10. If a **6 cannot produce any legal move**, the turn passes **without a bonus roll**.
11. First player to fill all four HOME holes wins.

## Files and separation of concerns

- `board-geometry.json` — exact approved geometry and graph metadata (Phase 1 source of truth).
- `movement-engine.mjs` — exact authoritative Phase 1 engine, importable by Node and other JS environments.
- `board-data.js` — browser-friendly data exported to `window.MARBLE_BOARD` for offline use.
- `engine.js` — browser-friendly global wrapper of Phase 1's rule functions.
- `app.js` — Phase 2 setup, SVG rendering, dice, move selection, optional bots, zoom/pan, journal, storage.
- `style.css` — mobile responsive overhead arcade interface.
- `tests/engine.test.mjs` — original Phase 1 regression suite (29 tests).
- `tests/ui-smoke.test.cjs` — basic in-memory UI boot, turn and save smoke tests (3 tests).
- `reference/approved-board-v2.svg` — approved blueprint reference.

## Tests

Requires Node.js 20+ (no NPM packages):

```bash
node --test tests/engine.test.mjs tests/ui-smoke.test.cjs
```

**32 automated tests passed** at packaging, including the original 29 movement and rules tests plus three UI smoke tests. The 2D board itself was rendered to a PNG from the app's generated SVG to inspect placement and labels.

**Limitations of verification:** A full end-to-end browser interaction test could not be completed in the packaging environment due to browser navigation being blocked. The script syntax, DOM smoke tests, engine tests, and SVG geometry rendering did pass. Please try one complete human turn in your deployed browser before sharing broadly.

## What's intentionally deferred to Phase 3

- True 3D board with adjustable angled/overhead camera
- Physical three-dimensional tumbling die
- Glass marble rolling physics and depth/shadow effects
- More elaborate capture screen celebration and sound
- Competitive AI with more complex strategy

**Development note:** Rendering positions and movement are intentionally decoupled. Do not calculate route legality from on-screen positions or colors. Always select one of `MarbleSummitGame.legalMoves()` and commit its exact ID.
