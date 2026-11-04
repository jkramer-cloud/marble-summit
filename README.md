# Marble Summit v6.0 — Aggravation-style Polygon Boards

A standalone, offline-capable browser marble racing game inspired by the traditional Aggravation board layout. No backend or installation is required.

## What's new in v6.0

- Completely redesigned **U-shaped track arms**: 12 outer-track spaces per player, wrapping around each colored home lane.
- **Corner BASE trays outside the track**, with four marbles arranged from the tip inward.
- **A matching polygon-shaped physical tabletop**, with exactly as many sides as players.
- Board choices: Triangle (3), Square (4), Pentagon (5), Hexagon (6), Heptagon (7), and Octagon (8).
- **Corrected HOME entry**: the HOME entrance is now on the opposite side of its colored arm from START, at the outer-track space immediately **before** START in movement order. This requires traveling `12 × players − 1` outer-track steps from START before first reaching HOME entry.
- Separate HOME lanes, clearer letter markers and connections, smaller marbles on crowded larger boards.
- Eight team configurations (the previous build only created six).
- Existing animated dice, AI personalities, multiple speeds, two-color marble styling, nine tutorial lessons, automatic camera rotation, overhead and 3D views, and local saves are retained.

## Rules

1. Roll 1 or 6 to release a marble at its START space. A 6 can earn another turn.
2. Move clockwise around the outside track. Land on another player's marble to return it to BASE; do not pass your own marbles.
3. Once your marble completes the outer circuit to your HOME entrance, branch into your own four-hole HOME lane. An exact count is required.
4. Optional shortcuts: stop on a gold GATE; roll 1 or 6 to climb to the lower ring. Boards with 5–8 players have another raised ring with three shared positions, reachable with another 1 or 6. Center exits require 1 or optionally 1 or 6 on larger boards.
5. First to finish all four marbles in HOME wins.

## Play on GitHub Pages

Upload `index.html` to the root of your existing `marble-summit` repository and enable GitHub Pages from the `main` branch `/ (root)` directory. No build step is needed.

## Testing

Automated browser checks verified all six player counts, the correct number of players and pieces, one-lap HOME-entry indexing, each game's HOME move, all nine guided tutorial lessons, eight computer opponents playing several turns, and no uncaught browser errors. This is a revised build, so older saved matches are not imported. Long full-match balance testing with students remains advisable.
