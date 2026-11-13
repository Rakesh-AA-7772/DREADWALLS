# DREADWALLS — V2: The Infinite Building

A first playable version of a lightweight first-person psychological horror game, built with **vanilla HTML, CSS and JavaScript**. No external engine, framework, or 3D library is required.

## Run locally

1. Extract `dreadwalls_v2.zip`.
2. Keep `index.html`, `style.css`, and `game.js` together in one folder.
3. Add the optional assets listed in `ASSETS.txt` to that same folder.
4. Open the folder in VS Code and use Live Server. A local server is recommended for reliable image/audio loading.

## Objective

Choose Easy, Medium or Impossible before entering the Infinite Building. Easy is a short two-turn route with no monster; Medium is a larger maze with a manageable shadow and optional Echo clues; Impossible is a vast maze with three to five doors, one real exit, torch flicker and visual anomalies. The goal remains to reach the real exit, except Impossible is about surviving long enough to identify it.

## Controls

**PC:** WASD to move, mouse to look left/right and up/down, E or click when the exit is centred and close, ESC to pause.

**Mobile:** use the left touch pad to move and the right touch pad to look. The larger pause and INTERACT buttons are positioned for touch use; controls respect phone safe areas.

## Rules

- Health begins at 100 and never regenerates.
- Looking directly at the visible shadow drains 10 health per second.
- Close contact can cause an additional hit.
- Turn away and keep moving to make the shadow withdraw.
- Easy has no monster encounters. Medium now brings the first monster encounter after about 12 seconds; Impossible begins after about 8 seconds and has a shorter interval. Monster spawns use reachable maze corridors, so a nearby turn cannot cancel an encounter.
- Easy uses a compact route with two turns. Medium uses a 27×27 generated maze. Impossible uses a 61×61 maze and places three to five apparent exits, only one of which is real.
- Impossible adds stronger, more frequent torch flickers, brief visual glitches, and a single-eye watcher that peeks from a screen corner and disappears when approached or noticed. These effects never reverse controls or block movement.
- Reaching zero health ends the run immediately, then returns to the home screen.
- In Medium, three bright Echo orbs are placed along the main route. Their glow remains visible as a clue even around corners, and the HUD points toward the nearest uncollected orb. Collecting all three reveals the exit direction and approximate distance. Easy and Impossible do not require Echo clues.
- Aim at the exit door and press E / click to open the exit choices.
- `LEAVE THE HOUSE` records a successful run and displays the 12.4-second ending.
- `SACRIFICE YOURSELF` is present but disabled for a future chapter.

## Stopwatch and run history

The stopwatch starts when PLAY is selected and stops when the run ends. The About panel stores each result with its date and duration, sorted by fastest time first. History is stored in this browser's `localStorage`; it is local to that browser/device and is not uploaded or automatically synchronized.

## Audio autoplay

The game stops `into.mp3` immediately when a level is selected, stays silent during the 2.4-second loading screen, then starts `game.mp3` when gameplay begins. `monster.mp3` plays on encounters and `footsteps.mp3` plays only while the player moves. `floor.jpg` textures the floor. The moon rendering has been removed to keep the scene clean and responsive. Browsers may block audio autoplay until the first click/tap; selecting a level provides the required user interaction.

The Echo orbs, monster silhouettes, corner eye and visual anomalies are drawn in code and require no new files. Wall textures are cached at a reduced render size and the ray-strip count is tuned for smoother camera response. See `ASSETS.txt` for the existing image/audio files; no additional assets are required for this upgrade.
