# Architecture

## Ownership boundaries

`ClawMachineState` is the only source of truth. It contains the claw position and state, held object, object positions, delivered keys, current player view, seed, action count, completion state, and the last command/event.

The application follows this one-way action pipeline:

```text
input -> parse/validate -> applyAction -> projections -> bot observations -> UI -> events
```

`applyAction` clones the incoming state, applies one discrete command, resolves grab/drop behavior, unlocks views, and returns a new state. Animation is presentation-only and cannot change outcomes.

## Projections

`projectPosition`, `projectToXZ`, `projectToYZ`, and `projectToXY` map the same 3D positions onto horizontal, vertical, and collapsed-depth coordinates. Items sharing a projected cell are sorted by depth and stable ID; only the front item is marked visible. This gives bots an observation surface without giving them hidden coordinates.

`diffProjection` compares two projections and records visible keys aligned with the claw. Side views treat a shared horizontal track as alignment; the rotated top view requires the same screen cell. `generateBotObservations` consumes only that diff and a bot view, so bots can say “I'm over a key on my screen” without receiving hidden coordinates. Its templates never print coordinates, axis names, solutions, or hidden locations.

## Levels

`LevelDefinition` contains machine bounds, chute and claw starts, object data, initial view assignments, view unlocks, and a canonical test solution. `LEVELS` is the menu registry and currently contains only Claw Machine. Future levels are added by registering another definition; the engine has no level-specific branches.

Grid positions are integers. Initially, YOU use `XZ` and control Y, Bot A uses `YZ` and controls X, and Bot B uses `XY` and controls Z: each actor controls the axis collapsed by that actor's view. The XY projection presents Y horizontally and X vertically so YOU's movement appears left/right to both bots. A movement at a boundary is a deterministic no-op with a `claw_move_blocked` event. Grab candidates are sorted by configured priority, descending height, then ID. A key is delivered only when a held key is released at the chute.

## Presentation

The DOM provides the menu, explicit operator controls, read-only bot feed, status, and accessible labels. Canvas renders the current player projection and pixel-art primitives with smoothing disabled. It projects `level.chutePosition` through the same `projectPosition` mapping and draws a clearly labelled `PRIZE HOLE` marker in every view. The `public/assets/pixel/sprite-sheet.png` file is the committed art reference for future sprite extraction; the renderer has a deterministic code-drawn fallback so missing image loading cannot affect gameplay.

The default perspective transition is 600 ms and runs only when the active projection visibly changes or the player unlocks a new view. Simulation state changes before the transition begins, and reduced-motion preferences shorten the visual transition.

## Telemetry and debug API

The domain produces typed `SimulationEvent` values. `createEventStore` enriches them with session ID and timestamp, keeps them in memory, writes development events to the console, and exports JSON. No event is sent over the network.

Development/test builds expose:

```ts
window.__PERSPECTIVE__.getState()
window.__PERSPECTIVE__.getEvents()
window.__PERSPECTIVE__.reset(seed?)
window.__PERSPECTIVE__.execute(action)
window.__PERSPECTIVE__.setSeed(seed)
window.__PERSPECTIVE__.getProjection("XZ" | "YZ" | "XY")
```
