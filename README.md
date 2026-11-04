# Marble Summit — Illustrated Board Edition

This edition displays the **actual approved six-player board illustration** as its playing surface. It no longer redraws the blue board, colored arms, U-shaped tracks, or center as programmed graphics.

## Features
- Six colored player arms based on the approved artwork
- Four marble BASE positions and four HOME positions per player
- 78 manually mapped outer-track steps (13 per arm)
- Interactive marble selection and destination highlighting
- Roll 1 or 6 to leave BASE; optional bonus roll on 6
- Captures, own-marble blocking, exact-count HOME, win detection
- Up to six human/CPU opponents with difficulties and play styles
- Five guided tutorial lessons, undo, autosave, and fullscreen
- Two-color marble effects for moved or customized pieces

## Art and limitations

The reference was generated as **concept artwork**, not a mathematically engineered game board. The route positions were manually placed over it. Most positions align with photographed holes; a small number fall between painted holes where the illustration is inconsistent. The static gold stars and central motif are decorations, not shortcut spaces.

For the default marble colors, original photographed BASE marbles remain visible until they move. When a marble leaves BASE, the static photo marble is masked with a dark recess so it does not appear duplicated.

This is a **2D image-backed board with live SVG pieces**, not true 3D. The optional angled view tilts the display.

## GitHub Pages

Upload the included `index.html` to the root of your `marble-summit` GitHub repository, replacing the old version. The board image is embedded inside that single file, so no external image upload is required. Your existing Learning Hub link can stay unchanged.

The previews are optional. Open `index.html` locally in a modern browser, or serve it with GitHub Pages.

## Test status

JavaScript syntax checked. Browser checks covered loading the game, 24 initial marbles, six-player selection, BASE release, all five tutorial lessons, capture, HOME entry, desktop rendering, and mobile rendering. A full-length six-player match was not run from beginning to end.
