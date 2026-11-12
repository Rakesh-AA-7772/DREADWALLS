# DREADWALLS — V2: The Infinite Building

A first playable version of a lightweight first-person psychological horror game, built with **vanilla HTML, CSS and JavaScript**. No external engine, framework, or 3D library is required.

## Run locally

1. Extract `dreadwalls_v2.zip`.
2. Keep `index.html`, `style.css`, and `game.js` together in one folder.
3. Add the optional assets listed in `ASSETS.txt` to that same folder.
4. Open the folder in VS Code and use Live Server. A local server is recommended for reliable image/audio loading.

## Objective

Explore the procedurally generated corridors of the Infinite Building and find the exit door. A faceless shadow may appear at spaced intervals and pursue the player. The game ends when health reaches zero or when the player chooses to leave through the exit.

## Controls

**PC:** WASD to move, mouse to look left/right and up/down, E or click when the exit is centred and close, ESC to pause.

**Mobile:** left virtual joystick to move, drag the right side of the screen to look, use the INTERACT button when it appears.

## Rules

- Health begins at 100 and never regenerates.
- Looking directly at the visible shadow drains 10 health per second.
- Close contact can cause an additional hit.
- Turn away and keep moving to make the shadow withdraw.
- The first shadow encounter is scheduled 18 seconds into a run. Further encounters become progressively more frequent as the run continues, with no fixed encounter-count cap.
- Reaching zero health ends the run immediately, then returns to the home screen.
- Aim at the exit door and press E / click to open the exit choices.
- `LEAVE THE HOUSE` records a successful run and displays the 12.4-second ending.
- `SACRIFICE YOURSELF` is present but disabled for a future chapter.

## Stopwatch and run history

The stopwatch starts when PLAY is selected and stops when the run ends. The About panel stores each result with its date and duration, sorted by fastest time first. History is stored in this browser's `localStorage`; it is local to that browser/device and is not uploaded or automatically synchronized.

## Audio autoplay

The game references `into.mp3` on the dashboard, `game.mp3` during gameplay, `monster.mp3` when a shadow encounter begins, and looping `footsteps.mp3` only while the player is actually moving. The footstep playback rate follows movement speed and stops when movement stops. `floor.jpg` textures the floor and `moon.png` is shown when the player looks upward. Browsers may block audio autoplay until the first click/tap; starting a run provides the required user interaction.

See `ASSETS.txt` for optional image/audio filenames. If an image is not present, a procedural fallback is drawn so the game remains playable.
