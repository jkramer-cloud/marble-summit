# Marble Summit — v1.0

An original, browser-based marble-racing game for 2–6 local players. Inspired by traditional marble-racing tabletop games, with a custom terraced mountain board, two-color glass marbles, AI rivals, and a guided tutorial.

**No account, backend, installation, packages, or internet connection required.** The game uses a single self-contained `index.html` file. It runs on GitHub Pages and locally in a modern browser.

## Quick start

1. Extract this ZIP file.
2. Double-click `index.html` to play locally, or upload `index.html` to the root of a GitHub Pages repository.
3. Choose **Triangle** (3 arms), **Classic** (4 arms), or **Summit** (6 arms).
4. Choose 2–6 participants within the selected board's capacity; fill their slots with Humans and/or Computers.
5. Give each team a primary and secondary color and marble style.
6. Select **Start New Race**. Use **Tutorial** first for new players.

See `GITHUB_UPLOAD_INSTRUCTIONS.md` for deployment details.

## Included game modes

| Board | Supported active racers | Visual structure | Shortcut options |
|---|---|---|---|
| Triangle | 2–3 | Rounded triangular board, three arms | One shortcut ring + center |
| Classic | 2–4 | Four equally spaced arms | One shortcut ring + center |
| Summit | 2–6 | Six arms, terraced inner rings and peak | Two shortcut rings + center (exit by 1 or 6) |

The 5-player Summit layout leaves one of the six arms unused.

## Rules

- Each team has four marbles. Roll **1** or **6** to release a base marble onto its marked starting hole.
- Otherwise move exactly the rolled number of holes clockwise around the outer course; extra rolls on **6** are enabled by default.
- You may pass opponent marbles and bump them back to base by landing directly on their space.
- You may never pass or land on your own marble.
- Base and Home are safe. Outer starting positions, inner shortcuts, and the center are capturable.
- Move from your designated outer entry into your Home lane by an exact roll. Fill all four Home recesses to win.
- Landing exactly on a golden outer star gives you the option **on a later turn** to move into the inner ring. Exit inner-ring holes to an outer star by spending a movement step.
- Summit adds an upper inner ring. The inner paths are shorter but exposed to captures.
- Move from the innermost ring into the center only as the final step of a die roll. Once there, you must roll a **1** (Triangle/Classic) or a **1 or 6** (Summit default) to exit. Exiting the center spends the entire die roll and places your marble at one of the innermost ring positions; a 6 still awards a bonus roll when enabled.
- The game implements its own shortcut transitions and other configurable **house rules** rather than replicating every print edition of a commercial marble game.

## Customization

- Up to six individually named teams, each Human or Computer.
- Change primary and secondary colors for individual glass marbles.
- Patterns: Swirl, Cat's-eye, Glitter, Frosted, Solid.
- Computer difficulty: Easy, Medium, Hard.
- Computer personality: Balanced, Aggressive, Careful, Shortcut, Chaotic.
- Computer animation speed: Cinematic, Normal, Fast, Instant. Speed can also be changed during a match.
- Board finish: Walnut, Golden Maple, Midnight Slate.
- Gameplay toggles: shortcuts enabled, bonus turns on 6, auto-play sole legal move, Summit center exit 1 or 1-or-6.
- In-game options: sound, move highlights, path lines, angled/top-down view, fullscreen, and undo of the most recent move.
- Local autosave and Resume Saved Game through browser storage.

## Interactive tutorial

Seven hands-on lessons: releasing a marble, moving clockwise, capturing an opponent, entering a shortcut, climbing to the center, escaping the center, and reaching Home. The lessons use guided die rolls and reset the board for each teaching example. The tutorial does **not** overwrite a real race in local storage.

## Classroom considerations

- Runs locally without sign-ins, student data collection, or servers.
- Animations honor the operating system's reduced-motion preference.
- Use the overhead view and move highlights for easier tracking on projectors.
- A saved match stays on the same browser/device unless its local storage is cleared.
- Use New Game to reset a race; the Resume button loads the most recently saved match.

## About

Marble Summit is an independently created game using original visual assets and procedural SVG artwork. It does not reproduce an existing game's official logos or commercial graphics.
