# Marble Summit v3.4 — Center, Dice, Sound & Banter Fixes

A playable, six-sector marble-race board for GitHub Pages. **The 139-position Phase 2.1 board coordinates and save key are preserved.** The only movement-engine adjustment allows a marble to enter CENTER using the final pip of an exact roll after reaching a STAR, rather than requiring it to start that turn on the STAR. All other approved rules remain unchanged.

## Publish to your existing GitHub repository

1. Open `jkramer-cloud/marble-summit` on GitHub.
2. Extract the v3.4 GitHub-ready ZIP on your computer.
3. Upload **all files and folders from inside the ZIP** to the **root** of the existing repository, replacing matching files. In particular, add the new `arcade3d.js` alongside `index.html`, `style.css`, `app.js`, `board-data.js`, and `engine.js`.
4. Commit to the branch used by GitHub Pages (usually `main`). Your existing Learning Hub link still works.
5. Open the site and use `Ctrl + Shift + R` to refresh after deployment.

This is a static site: no npm, build tools, server, API key, game account, outside graphics library or internet connection is needed **after the webpage files load**. Audio is synthesized locally by the browser. Game progress remains in the current browser's local storage.

## How to play

- Choose 2–6 human and/or computer players and customize marble/sector colors.
- Roll a **1 or 6** to release a marble from BASE. A legal 6 grants an extra turn; a **6 with no legal move does not**.
- In the 3D arena, click an available glowing marble, then its numbered destination. The sidebar route list remains available for precise selections.
- You may use outer circuits, STAR shortcuts and the CENTER portal. A marble may enter CENTER if the final step of a complete die roll enters it from a STAR (including when reaching that STAR during the same roll); exiting CENTER requires a separate roll of exactly 1. Own marbles block, opponents can be passed and captured.
- HOME entry remains optional after eligibility; HOME marbles can move inward by exact rolls and cannot jump their own marbles.
- The first player to get all four marbles HOME wins.

## Camera and accessibility

- **3D** is the default. Browsers with working WebGL get GPU rendering; browsers without WebGL automatically use **3D Lite**, a Canvas 2D-based software perspective view. **2D** switches to the approved precision board without altering the match.
- Use the **angled** or **overhead** camera buttons; drag on the 3D board to orbit; **Shift + drag** to pan; use wheel, pinch or `+` / `−` buttons to zoom; crosshair resets the view.
- The expanded-board button increases the playing area and provides an on-board Roll button.
- Dark charcoal surfaces, illuminated player sectors, bright sockets and marbles, and **S/H/star/center symbols** help distinguish positions beyond color alone.
- Sound is **off by default** for classroom use. Click **Sound off** to enable dice, coconut-step movement, capture and win audio. Use **Test clops** next to the toggle to preview four footsteps; it also enables sound if still muted. The browser will ask for no special permissions. Audio is scheduled directly on the Web Audio clock (not from 3D render frames).
- Reduced-motion preference skips the marble animation. If WebGL is blocked, 3D Lite keeps the angled view and direct interaction available; the full 2D precision board remains an option.

## If 3D switches to 3D Lite

If hardware WebGL fails even on a capable computer, check the browser Console for the renderer error. An earlier version had a GLSL precision mismatch that prevented GPU 3D initialization; this is fixed in v3.2. Chrome can also block hardware graphics acceleration. The game will still provide an interactive 3D perspective in 3D Lite mode. To check the device, open `chrome://gpu` and look for the **WebGL** line. On personal Windows computers, also check Chrome **Settings → System → Use graphics acceleration when available**. Managed school devices may restrict these settings. Do not change school-managed policies; software 3D and 2D modes work without WebGL.

## Reliability notes

- No external graphics dependencies or runtime network requests.
- The approved **139 board positions**, `board-data.js`, and `board-geometry.json` are byte-for-byte unchanged. `engine.js` and `movement-engine.mjs` include the exact-roll CENTER correction only. The saved-state schema is unchanged.
- Automated regression testing: `node --test tests/*.test.*`.
- WebGL initialization is retried with standard, compatibility, and WebGL2 contexts. The GPU shaders now use matching `mediump` precision in both stages, fixing the reported `uEye` link error. If no context or shader is available, the software perspective board is used automatically; it has been tested in Chromium with WebGL unavailable, including a complete BASE release and direct destination click. Actual GPU rendering is still hardware-dependent, so verify WebGL presentation on a school computer.
- You can switch to **2D** at any point. Switching during an animation will not block completion of that move.

## Project files

- `index.html` — webpage, game UI, setup, help, view controls
- `style.css` — neon arcade layout, contrast/accessibility, physical CSS six-faced die
- `arcade3d.js` — WebGL and software 3D meshes, camera, rendered marbles, click targets, animations, sound
- `app.js` — original game UI with a small view-bridge added; existing game/save logic preserved
- `board-data.js`, `engine.js`, `movement-engine.mjs`, `board-geometry.json` — approved Phase 2.1 rules and coordinates, unchanged
- `tests/` — engine, UI, geometry and Phase 3 integration checks
- `reference/` — approved precision diagrams and design documentation

## v3.4 fixes and new character dialogue

- Corrected the flattened die: removed a CSS filter on the transformed cube that caused Chrome to flatten the entire six-face 3D scene. The cube uses **six actual faces**, shows the rolled pips, and retains full tumbles even for repeated values. Fixed the up/down orientation as well.
- Marble clops are now scheduled on the Web Audio clock when a move begins, independent of the frame rate or graphics mode. Includes **Test clops** next to Sound to verify audio immediately. Sound remains muted by default for classrooms.
- Fixed CENTER entry: if a complete exact roll reaches a STAR with one pip remaining, that last pip can enter CENTER. **Exit still requires a 1 on a later roll**, to any available STAR.
- Expanded the AI banter significantly with strategy-specific reactions to captures, being captured, shortcuts, HOME, blocked turns, and comebacks. Twenty named characters have additional signature lines and repeat avoidance. Character dialogue remains optional.
- Existing named matches and saved progress remain compatible. No board geometry or player seat changes.
- Validation: `node --test tests/*.test.*` (60 passing tests) plus browser-level dice geometry and move/audio checks.

## v3.3 Arcade Rivals additions

- Choose any six-sector corner for each human or computer player; 2-player defaults are opposite corners.
- Name human players (up to 20 characters), or choose from 10 distinct computer strategies with two named characters each (20 total). Random picks one for you.
- Computer strategies genuinely differ in their move preferences, including shortcut specialists, finishers and a leader-targeting comeback spoiler.
- Optional character comments after turns and captures; independently switch character chat off.
- Repaired 3D die animation and added synthesized dice-rattle/landing audio.
- Added original, locally synthesized *coconut shell clop-clop* each time a marble hops from one hole to another, synced in WebGL, 3D Lite and 2D. No copyrighted movie audio is included.
- One sound toggle controls all sound effects; sound is off by default for classrooms.
- Movement engine and geometry still unchanged from the approved Phase 2.1 version.
