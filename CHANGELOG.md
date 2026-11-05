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
