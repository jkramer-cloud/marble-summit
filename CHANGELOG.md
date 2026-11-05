# Marble Summit change log

## Phase 2.1 — Neon Corners & Direct Board Play (November 4, 2026)

- Corrected **all six** player HOME ENTRY/START holes: ENTRY one hole before START clockwise, instead of the previous reversed order.
- Corrected HOME lane render coordinates to connect to the revised HOME ENTRY.
- Moved all four BASE holes outside each of the six board corners, two per side, geometrically symmetric.
- Added colored under-board sectors and exterior BASE platforms matching user-selected marble colors.
- Added six-color assignment in setup with unique-color swapping and saved selections.
- Added numbered clickable landing targets directly above the map, retaining the optional sidebar route list.
- Added responsive default board sizing, a fit camera, an expanded board view and quick-roll HUD.
- Moved map guidance below the map to avoid covering bottom BASE holes.
- Started a fresh save namespace to avoid silently reinterpreting older positions; previous local storage not erased.
- Updated board graph JSON, browser mirror, standalone ES module, tests and rules documentation together.
- Passed 35 Node automated tests, with additional Chromium interactive and responsive checks.

## Phase 2 — Playable Precision Prototype (November 4, 2026)

- Built responsive 2D overhead arcade board from approved Phase 1 139-node graph.
- Added human and computer player setup for 2–6 participants.
- Added dice, route preview and selection, legal piece illumination, full turn progression.
- Connected captures and HOME moves to the deterministic Phase 1 movement engine.
- Added autosave/resume, progress tracker, turn journal, zoom, pan and instructional guide.
