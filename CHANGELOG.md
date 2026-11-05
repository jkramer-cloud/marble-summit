# v3.3 — Arcade Rivals + Coconut Clops

- Rebuilt dice rotations for clearer repeat-roll tumbling, consistent six-sided faces and original dice rattle/landing audio.
- Choose human/CPU seats at any of six corners, automatically spread 2–4 player defaults.
- Custom human names, 10 strategy-based CPU personalities with two named avatars per profile (20 characters), plus Random, and optional short quips.
- Original synthesized coconut-shell clop-clop sound, synchronized to each marble hop in 3D, 3D Lite and 2D; all sounds off by default.
- Preserves movement engine, START/HOME arrangement and original coordinates.

# v3.2 — WebGL shader precision fix

- Corrected the reported GPU shader link failure: `Precisions of uniform uEye differ between VERTEX and FRAGMENT shaders`.
- The vertex and fragment shaders now declare matching `mediump float` precision in WebGL 1 (including camera uniforms and varyings).
- Keeps the v3.1 interactive 3D Lite fallback for devices that cannot start hardware WebGL.
- No changes to gameplay, 139-position geometry, board colors, saved games, or core movement engine.
- Added automated shader-precision regression tests.

# v3.1 — 3D compatibility / software fallback

- 3D button no longer disabled on devices that block WebGL but allow ordinary Canvas 2D.
- Added an interactive software perspective board (3D Lite), with the same board positions, colors, camera orbit and zoom, animated captures, and click targets.
- Kept the original GPU WebGL renderer on supported devices and kept the 2D precision view.
- Added visible 3D Lite mode indication and Chrome graphics support guidance.
- Preserved the Phase 2.1 engine, board geometry, save keys and established rules.

# Marble Summit — v3.0 Neon Arcade

## New
- True 3D WebGL arcade board with a raised hexagonal platform and darker, high-contrast playing surface.
- Six color-matched board sections and exterior BASE platforms that update when players swap marble colors.
- Glowing routes, dark recessed-looking sockets, reflective shaded marble spheres, illuminated HOME lanes, STAR shortcuts and CENTER portal.
- Orbit/pan/zoom controls; quick angled/overhead camera presets.
- Switch between 3D arcade and the known-good 2D precision view without changing turns or saving a separate game.
- Six-faced, pip-correct 3D CSS die with a tumbling roll animation.
- Marble movement follows the chosen legal path, with hop animation and a visible capture effect.
- Optional locally synthesized arcade sounds for dice, moves, captures and victory; sound off initially.
- Champion overlay and more readable numbered landing pads on the 3D canvas.
- Automatic 2D fallback when the device/browser cannot provide WebGL.

## Intentionally unchanged
- Phase 2.1 movement rules, all START/HOME logic and coordinates, outer BASE shapes and direct board interaction.
- Existing local save key (`marble-summit-precision-phase2-v2`), so existing matches remain resumable.
- The game never sends match history or names to a server.

## Testing
- The original 35 engine/geometry/UI regression tests still pass. Seven Phase 3 integration contract tests added.
- Browser-level control flow checks passed with a simulated WebGL context, including direct landing-pad clicking and switching views mid-animation.
- Browser-level WebGL pixel rendering was unavailable in the testing environment; please check 3D visuals and performance on the destination hardware.
