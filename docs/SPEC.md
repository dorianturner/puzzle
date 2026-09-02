# Perspective — Prototype Game Specification

## 1. Product Goal

Build a polished browser-based puzzle-game prototype centered on one idea:

**The player's view of the world is accurate but incomplete. Solving the puzzle requires inferring a richer underlying model.**

The prototype currently contains one playable level:

**Claw Machine** — infer a 3D space from multiple 2D viewpoints.

The experience should prioritize:

- discovery over explanation;
- experimentation over tutorials;
- a strong “aha” moment;
- deterministic puzzle behavior;
- low execution friction;
- strong observability;
- reliable automated user testing.

Do not add level-specific engine branches, achievements, accounts, narrative systems, or other meta-game features.

## Implementation contract

The prototype is implemented as a strict TypeScript/Vite application. The simulation is authoritative and browser-independent; Canvas and DOM code consume projections and cannot mutate world state. Levels are authored through a shared level definition and registered in a level registry so future levels do not require engine conditionals.

The default seed is `1001`. Movement and object selection use integer coordinates and stable tie-breaking. Boundary movement is a deterministic no-op. Debug state and structured events are exposed only in development or explicitly enabled test builds. Automated tests use the `window.__PERSPECTIVE__` API and `data-testid` selectors.

Quality gates are TypeScript checking, ESLint, Prettier, Stylelint, Markdownlint, Vitest, the production build, and Playwright. GitHub Actions runs these gates for pull requests and deploys a passing `main` build to GitHub Pages.

---

# 2. Target Platform

Primary target:

- desktop web browser;
- keyboard + mouse;
- Chrome / Chromium;
- Playwright-based browser automation.

The game should run locally without external services.

No LLM or network connection should be required for bot behavior.

---

# 3. Visual Direction

## Global UI

Use:

- dark theme;
- minimal geometric layout;
- nearly black background;
- restrained typography;
- thin borders;
- limited accent colors;
- subtle transitions;
- no unnecessary decoration.

The application should feel like a minimalist experimental puzzle interface.

## Game World

The claw machine itself is rendered in **pixel art**.

Use deliberate low-resolution graphics with nearest-neighbor scaling.

Pixel-art elements include:

- claw;
- plushies;
- keys;
- chute;
- machine interior;
- mechanical components.

The surrounding interface remains clean and modern.

---

# 4. Main Menu

The app opens on a minimal title screen.

Display:

```text
PERSPECTIVE

01
CLAW MACHINE

[ PLAY ]
```

Each level-select card should show only the level number and game name; do not show flavor text, artwork, or a puzzle hint there.

Keep the level selection screen simple, but render its cards from the level registry so
additional levels can be added later.

---

# 5. Core Puzzle Concept

The claw exists inside a genuine three-dimensional simulation.

The player never receives a conventional 3D camera.

Instead, the machine is observed through three separate **2D orthographic projections**.

These projections represent the same authoritative 3D state.

The player begins with access to only one view.

Two bots observe the machine from the other viewpoints.

The player can instruct those bots to move the claw.

After each action, both bots describe what changed on their screens.

The goal is to recover **three keys hidden beneath plushies** and drop them into the prize chute.

Each recovered key unlocks a new viewpoint for the player.

---

# 6. Spatial Model

Use Cartesian coordinates:

```text
X = horizontal
Y = depth
Z = vertical
```

The simulation contains:

- claw carriage;
- claw;
- plushies;
- three keys;
- prize chute;
- machine boundaries.

All interactions originate from this single authoritative 3D state.

Never maintain independent fake state for individual views.

---

# 7. Three Viewpoints

## View A — Side X/Z

Shows:

- X horizontally;
- Z vertically;
- Y collapsed.

This is the player's starting view.

## View B — Side Y/Z

Shows:

- Y horizontally;
- Z vertically;
- X collapsed.

Initially seen only by Bot A.

Unlocked for the player after Key 1.

## View C — Top X/Y

Shows:

- Y horizontally;
- X vertically;
- Z collapsed.

The top view is rotated on screen so movement along Y is left/right, matching the
side view's depth direction.

Initially seen only by Bot B.

Unlocked for the player after Key 2.

---

# 8. Perspective Progression

The player progresses through:

```text
START
↓
VIEW A — SIDE X/Z
↓
KEY 1 DELIVERED
↓
VIEW B — SIDE Y/Z
↓
KEY 2 DELIVERED
↓
VIEW C — TOP X/Y
↓
KEY 3 DELIVERED
↓
LEVEL COMPLETE
```

When perspective changes, animate the transition for approximately 500–800 ms.

The transition should help communicate that the same machine is being viewed differently.

Do not display explanatory text such as:

- “You are now viewing the Y/Z plane.”
- “This is the depth axis.”

The player should recognize the relationship themselves.

---

# 9. Main Gameplay Layout

Desktop layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ CLAW MACHINE                                    KEYS 0 / 3 │
├─────────────────────────────────────┬───────────────────────┤
│                                     │                       │
│          PIXEL ART VIEW             │      BOT CHAT         │
│                                     │                       │
├─────────────────────────────────────┤ BOT A                 │
│ [ YOU ] [ BOT A ] [ BOT B ]         │ ...                   │
│ [LEFT][RIGHT][GRAB]                 │ BOT B                 │
│                                     │ ...                   │
└─────────────────────────────────────┴───────────────────────┘
```

The game viewport should remain the visual focus. The three operator control groups sit directly below it. The bot chat is a read-only scrolling feed; it has no text input, bot selector, or chat-submit interaction.

---

# 10. Player Controls

The player has three direct controls:

```text
LEFT
RIGHT
GRAB
```

Movement occurs in discrete grid-like steps.

The controlled axis depends on the current player viewpoint.

Suggested behavior:

```text
View A (`XZ`):
LEFT / RIGHT → Y axis (collapsed by this view)

View B (`YZ`):
LEFT / RIGHT → X axis (collapsed by this view)

View C (`XY`):
LEFT / RIGHT → Z axis (collapsed by this view)
```

The active view must not show the claw moving when its own collapsed axis changes.
The other projections should show the corresponding horizontal or vertical movement.

With the initial assignments, the visible movement contract is:

```text
YOU / View A controls Y → Bot A sees left/right; Bot B sees left/right.
Bot A / View B controls X → YOU sees left/right; Bot B sees up/down.
Bot B / View C controls Z → YOU sees up/down; Bot A sees up/down.
```

The bots remain necessary because the player never receives convenient direct control over all spatial axes simultaneously.

Movement should be:

- deterministic;
- fast;
- immediately readable;
- constrained by machine boundaries.

No timers or dexterity challenges.

---

# 11. Bot Operators

Two bots exist:

```text
BOT A
BOT B
```

Initial viewpoints:

```text
Player → View A
Bot A → View B
Bot B → View C
```

Bots are remote operators.

The player can give either bot:

```text
LEFT
RIGHT
GRAB
```

Use explicit clickable controls for each operator. Each operator has LEFT, RIGHT, and GRAB buttons. The domain command parser may remain available for automated tooling and future interfaces, but the prototype presentation does not expose text command entry.

Do not use an external language model.

---

# 12. Bot Behavior

Bots must not solve the puzzle.

Their role is to:

1. execute requested actions;
2. observe the resulting machine state;
3. report what changed from their viewpoint.

Example:

```text
PLAYER selects BOT A → RIGHT.

BOT A:
The claw moved right on my screen.

BOT B:
The claw didn't move sideways from where I'm looking.
```

Another:

```text
PLAYER selects BOT B → GRAB.

BOT A:
The claw lowered behind the pink plushie.

BOT B:
The claw closed over something metallic.
```

Bots should describe only information reasonably visible from their own projection.

They must not reveal:

- world coordinates;
- hidden object locations;
- puzzle solutions;
- axis names;
- optimal move sequences.

---

# 13. Bot Response Generation

After every meaningful action:

1. capture each bot's previous projected state;
2. execute simulation action;
3. capture new projected state;
4. diff the two;
5. generate concise observational messages.

Responses should be generated from deterministic templates.

Example observation types:

```text
claw_moved_left
claw_moved_right
claw_no_visible_horizontal_change
claw_above_plushie
key_became_visible
key_disappeared_behind_object
object_moved
claw_closed
claw_opened
object_grabbed
object_dropped
object_entered_chute
```

This system should make bot output fully testable.

---

# 14. Action Cycle

Every action uses this pipeline:

```text
INPUT
↓
VALIDATE
↓
APPLY TO AUTHORITATIVE 3D STATE
↓
RESOLVE COLLISIONS / GRAB / DROP
↓
UPDATE PROJECTIONS
↓
GENERATE BOT OBSERVATIONS
↓
UPDATE UI
↓
WRITE TELEMETRY EVENT
↓
CHECK PUZZLE PROGRESS
```

Simulation state must not depend on animation timing.

---

# 15. Claw Mechanics

The claw has these states:

```text
OPEN
CLOSED_EMPTY
HOLDING_PLUSHIE
HOLDING_KEY
```

The player does not manually control vertical motion.

## GRAB when claw is open

1. claw lowers automatically;
2. claw closes;
3. highest eligible intersecting object is selected;
4. claw rises automatically.

## GRAB when holding an object

1. claw lowers;
2. claw opens;
3. object is released;
4. claw rises.

This keeps the puzzle focused on spatial understanding rather than mechanical execution.

---

# 16. Plushies

Use approximately:

```text
8–12 plushies
```

They should have distinct pixel-art silhouettes and colors.

Examples:

- bear;
- rabbit;
- duck;
- frog;
- cat;
- blob creature.

Their positions should create useful visual occlusion.

Avoid chaotic physics.

Objects may move or shift when grabbed and dropped, but results must be deterministic.

---

# 17. Keys

There are exactly three keys.

Each key begins hidden or partially hidden beneath plushies.

Keys should be clearly distinguishable once exposed.

The puzzle progression should be authored rather than procedurally generated.

---

# 18. Key 1

Key 1 should be designed to teach:

**The player's visible horizontal position is not enough to determine the claw's true position.**

The player should need Bot A or Bot B to discover the missing depth information.

The first key should be relatively easy once this is understood.

When dropped into the chute:

```text
KEY 1 / 3
```

Then transition the player to View B.

The intended reaction is:

**“Oh, this is what Bot A was seeing.”**

---

# 19. Key 2

Key 2 should require combining knowledge from:

- previous View A experience;
- current View B;
- bot observations.

The player should now understand that the machine has a stable 3D structure.

The second puzzle should contain more occlusion and require deliberate use of both bots.

When dropped:

```text
KEY 2 / 3
```

Then transition to View C.

---

# 20. Key 3

The final key should require the strongest spatial model.

The top-down view should suddenly make many previous observations obvious.

However, the player should still need at least one bot viewpoint because vertical overlap or occlusion should remain ambiguous.

After Key 3 enters the chute:

```text
KEY 3 / 3
```

Then:

```text
LEVEL COMPLETE
```

Provide:

```text
REPLAY LEVEL
RETURN TO MENU
```

---

# 21. Difficulty Philosophy

The puzzle tests understanding, not execution.

Therefore:

- no time limit;
- no lives;
- no random failure;
- no precision clicking;
- discrete movement;
- quick animations;
- reliable reset;
- deterministic state.

Provide:

```text
RESET LEVEL
```

Optional:

```text
UNDO
```

Undo is recommended if straightforward to implement.

---

# 22. Simulation Architecture

Maintain strict separation between:

## Simulation

Authoritative state:

```text
ClawMachineState
```

Example fields:

```text
clawPosition: { x, y, z }
clawState
heldObjectId
objects[]
keysDelivered
currentPlayerView
actionCount
seed
```

## Projection

Functions such as:

```text
projectToXZ(state)
projectToYZ(state)
projectToXY(state)
```

These produce view-specific renderable data.

## Observation

Functions such as:

```text
diffProjection(previous, current)
generateBotObservation(diff)
```

## Presentation

Pixel-art renderer and interface.

Rendering must never become the source of truth.

---

# 23. Determinism

The entire puzzle must be reproducible.

Use a fixed default seed:

```text
1001
```

The same initial seed plus the same command sequence must always produce the same result.

Do not use unseeded randomness.

Animations must not affect simulation outcomes.

---

# 24. Developer Debug View

Provide a development-only debug overlay.

Toggle using:

```text
`
```

or URL parameter:

```text
?debug=1
```

Debug view should expose:

```text
current seed
current level state
claw x/y/z
claw state
held object
object positions
key positions
keys delivered
current player projection
Bot A projection
Bot B projection
action number
last command
last simulation event
```

Also provide a simple 3D debug visualization of the authoritative machine.

This visualization must never appear in normal gameplay.

Its purpose is debugging and automated validation.

---

# 25. Structured Logging

Every meaningful event must produce a structured JSON log.

Example:

```json
{
  "event": "claw_move",
  "sessionId": "session-123",
  "actionIndex": 17,
  "actor": "bot_a",
  "command": "RIGHT",
  "before": {
    "x": 3,
    "y": 4,
    "z": 5
  },
  "after": {
    "x": 3,
    "y": 5,
    "z": 5
  },
  "playerView": "XZ",
  "timestamp": 1740000000000
}
```

Important events include:

```text
game_started
level_started
command_entered
command_rejected
claw_move
grab_started
object_grabbed
object_dropped
plushie_moved
key_revealed
key_grabbed
key_delivered
player_view_changed
level_reset
level_completed
```

Logs should be accessible through:

- browser console in development;
- in-memory event store;
- downloadable/exportable JSON in debug mode.

---

# 26. State Snapshot API

Expose a development API on:

```text
window.__PERSPECTIVE__
```

Minimum interface:

```javascript
window.__PERSPECTIVE__.getState();
window.__PERSPECTIVE__.getEvents();
window.__PERSPECTIVE__.reset();
window.__PERSPECTIVE__.execute(action);
window.__PERSPECTIVE__.setSeed(seed);
window.__PERSPECTIVE__.getProjection("XZ");
window.__PERSPECTIVE__.getProjection("YZ");
window.__PERSPECTIVE__.getProjection("XY");
```

This API is specifically for automated testing and debugging.

It should not be used by production gameplay UI as a shortcut around normal application architecture.

---

# 27. Browser Automation

Use Playwright for end-to-end testing.

Add stable selectors using:

```text
data-testid
```

Examples:

```text
data-testid="play-button"
data-testid="move-left"
data-testid="move-right"
data-testid="bot-left"
data-testid="bot-right"
data-testid="bot-grab"
data-testid="bot-b-left"
data-testid="bot-b-right"
data-testid="bot-b-grab"
data-testid="bot-a-message"
data-testid="bot-b-message"
data-testid="key-counter"
data-testid="reset-level"
data-testid="return-menu"
data-testid="game-canvas"
```

Do not rely on visual text alone for automation selectors.

---

# 28. Automated Puzzle Tests

Create deterministic tests for the puzzle itself.

## Required test: known solution

Maintain at least one canonical command sequence that successfully retrieves all three keys.

The automated test should:

1. reset with seed 1001;
2. execute the canonical sequence;
3. verify Key 1 delivered;
4. verify player perspective changed;
5. verify Key 2 delivered;
6. verify player perspective changed;
7. verify Key 3 delivered;
8. verify level completion.

This proves the puzzle remains solvable after code changes.

---

# 29. Projection Tests

Test that projections correctly discard the relevant axis.

Example:

Two objects:

```text
A = (2, 3, 4)
B = (2, 8, 4)
```

In X/Z projection they should occupy the same visible position.

In Y/Z projection they should not.

Create unit tests for this behavior.

This is core game logic and must be rigorously tested.

---

# 30. Bot Observation Tests

Given known before/after states, verify bot responses.

Example:

If the claw moves only along Y:

```text
XZ observer:
"No visible horizontal movement."

YZ observer:
"The claw moved right."
```

Test:

- movement;
- occlusion;
- revealing keys;
- grabbing;
- dropping;
- no visible change.

Bots must never accidentally expose hidden coordinates or solution instructions.

---

# 31. Interaction Tests

Use Playwright to test:

- Play button works;
- LEFT button moves claw;
- RIGHT button moves claw;
- each bot control bank dispatches its requested action;
- there is no chat input or command-submit interaction;
- bot messages update;
- reset restores initial state;
- perspective changes occur after key delivery;
- level completion screen appears.

---

# 32. Replay System

Store every normalized player action.

Example:

```json
[
  {
    "actor": "player",
    "command": "RIGHT"
  },
  {
    "actor": "bot_a",
    "command": "LEFT"
  },
  {
    "actor": "bot_b",
    "command": "GRAB"
  }
]
```

Debug mode should allow:

```text
EXPORT REPLAY
IMPORT REPLAY
PLAY REPLAY
```

A replay must reproduce the exact puzzle result.

This is important for debugging failed user-test sessions.

---

# 33. User Testing Telemetry

The game should make it possible to determine whether players actually experienced the intended insight.

Record:

```text
total actions
actions before first bot command
commands sent to each bot
number of grabs
failed grabs
resets
time between actions
time before Key 1
time before Key 2
time before Key 3
perspective at each action
number of bot messages generated
```

Do not attempt to infer psychological state automatically.

The telemetry should instead make later qualitative analysis easier.

---

# 34. User-Test Recording Support

Provide development hooks that make browser sessions easy to inspect.

Playwright test runs should retain on failure:

- screenshot;
- video;
- Playwright trace;
- console logs;
- structured game event log;
- final game-state snapshot.

This should make a failed puzzle test reproducible without manually replaying it.

---

# 35. Error Handling

The game should never silently fail.

Invalid commands should return concise feedback:

```text
BOT A:
I didn't understand that command.
Try LEFT, RIGHT, or GRAB.
```

Impossible movement:

```text
BOT B:
The claw can't move any farther that way.
```

If an unexpected simulation condition occurs:

- log structured diagnostic information;
- preserve current state if possible;
- avoid leaving the interface unresponsive.

---

# 36. Accessibility

Minimum requirements:

- all controls keyboard accessible;
- visible focus states;
- sufficient text contrast;
- button labels available to screen readers;
- chat messages represented as actual text;
- reduced-motion preference respected.

Pixel-art visuals do not need to be fully understandable without vision for this prototype, but interface controls should follow normal accessibility standards.

---

# 37. Performance

Target:

- 60 FPS during animation on a typical desktop;
- immediate UI response;
- puzzle simulation updates below 16 ms where practical;
- no unnecessary network requests.

Pixel-art rendering should use a small internal resolution and upscale cleanly.

---

# 38. Suggested Technical Structure

Example:

```text
src/
  app/
    App.tsx
    Menu.tsx

  levels/
    claw-machine/
      ClawMachineLevel.tsx
      simulation.ts
      state.ts
      projections.ts
      observations.ts
      botCommands.ts
      puzzleConfig.ts
      renderer.ts

  telemetry/
    eventLogger.ts
    replay.ts

  debug/
    DebugPanel.tsx
    debugApi.ts

  tests/
    simulation.test.ts
    projections.test.ts
    botObservations.test.ts
    canonicalSolution.test.ts

e2e/
  claw-machine.spec.ts
```

React + TypeScript is recommended, but equivalent architecture is acceptable.

---

# 39. Definition of Done

The prototype is complete when:

1. The app launches into a polished dark menu.
2. The Claw Machine level is playable.
3. The game world uses pixel art.
4. The player starts from one 2D side view.
5. Two bots observe different projections.
6. The player can command either bot with LEFT, RIGHT, and GRAB.
7. Both bots report what changed after actions.
8. All three views come from one authoritative 3D model.
9. Three keys are hidden beneath plushies.
10. Keys must be placed into the chute.
11. Key 1 changes the player's perspective to the second side view.
12. Key 2 changes the player's perspective to the top view.
13. Key 3 completes the level.
14. The puzzle is deterministic.
15. A canonical automated solution completes the puzzle.
16. Projection logic has unit tests.
17. Bot observation logic has unit tests.
18. Playwright tests cover core interactions.
19. Debug state can be inspected through `window.__PERSPECTIVE__`.
20. Structured logs and replay data are available for user testing.
21. Failed automated runs preserve useful diagnostics.
22. Level content remains data-driven and the menu renders registered definitions without level-specific engine branches.

The central design criterion is:

**At first the player should think they are operating a strange 2D claw machine. Through the bots' observations, they should gradually realize they are collaboratively controlling one ordinary 3D machine from several incomplete 2D views.**
