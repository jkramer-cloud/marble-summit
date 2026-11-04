# Marble Summit v4.0 — Classic Six-Arm Edition

A standalone, single-page marble-racing game built for local multiplayer and computer opponents. The board has been redesigned with longer, six-arm classical marble tracks, recessed-looking holes, prominent base trays, and clearly separated home lanes.

## Play

Open `index.html` in a modern browser, or publish it with GitHub Pages. No external libraries, accounts, or server are required.

The default is a six-arm, six-player board with one human and five computer opponents. In New Game settings, choose:

- Triangle (three arms), Classic (four arms), or Six-Arm (six arms, supports five or six players).
- Humans or computer opponents in any mix; computer difficulty and personality are adjustable for each seat.
- Two marble colors and one of five marble surface styles for each player.
- Computer animation speed, board color, shortcuts, center exit rules, bonus roll, and optional auto-move.

## Basic race rules

- Roll a 1 or 6 to release a marble from Base onto your colored Start hole.
- A roll of 6 normally grants another turn (can be disabled in settings).
- Move around the outer track, choosing legal destinations. You cannot pass your own marbles.
- Land exactly on an opponent's marble to send it back to Base.
- After passing around the track to your Home entrance, turn into your team's four-hole Home lane. Exact rolls are required. First to fill all four Home holes wins.

## Shortcut house rules

- A gold star is a shortcut entrance. To move from an entrance to the lower shortcut ring, **first stop on the star**, then roll a **1 or 6** on a later turn to climb inward. That whole roll is used for the climb.
- On the six-arm board the lower shortcut ring has **six stations**, and the upper ring has **three shared stations**. Moving from the lower to the upper ring also requires a 1 or 6. The ring routes and connected gateways are shown on the board.
- On the center shortcut, you must roll the prescribed exit number to move out. The Classic and Triangle modes use 1; the six-arm board can optionally permit 1 or 6.
- Opponents may capture a marble on a shared shortcut. Taking an inner shortcut is faster but exposes you to captures and special-roll delays.

These shortcut conditions are custom house rules, not an assertion that every Aggravation board uses them.

## Controls

- **Overhead board** is the default for classroom legibility. Select **3D Board** to switch to an orbiting tabletop view.
- Drag in 3D to rotate, scroll to zoom; use Follow Player to automatically turn the camera as turns change.
- Click a glowing marble, then a highlighted destination. If two different routes end at the same hole, choose the route from the sidebar.
- Use the Tutorial button for nine short guided, hands-on lessons.
- Full Screen, Undo, save/resume, sound, path lines, and four computer speeds are available.

## Version

v4.0 replaces the v3 geometry and starts its own local save data (`marble_summit_v4_save`). Previous game saves are not migrated.

This is an independently created marble-race game with optional house rules. It is not affiliated with the owners of the Aggravation brand.
