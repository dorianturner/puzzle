# Testing

## Test layers

Domain tests live beside the pure engine and cover state transitions, projections, occlusion, parser aliases, observations, telemetry, determinism, and future-level compatibility.

Playwright tests in `tests/e2e` cover menu navigation, real controls, text commands, chat output, reset, the debug API, and canonical completion.

## Useful commands

```sh
npm run test
npm run test:watch
npm run test:e2e
npm run test:e2e:ui
npm run check
```

Playwright starts Vite automatically at `http://127.0.0.1:4173`. In CI it installs Chromium and retains traces, screenshots, videos, and the HTML report when a test fails.

## Stable browser hooks

Use `data-testid` for automation. Important hooks include `play-button`, `game-canvas`, `move-left`, `move-right`, `bot-a-selector`, `bot-b-selector`, `bot-command-input`, `bot-left`, `bot-right`, `bot-grab`, `bot-a-message`, `bot-b-message`, `key-counter`, and `reset-level`.

## Determinism checks

The canonical level seed is `1001`. Compare state and simulation events from two runs of the same action sequence. Session IDs and timestamps are telemetry metadata; use injected clocks or normalize those fields when comparing exported event logs.

## Debugging failures

Open the app with `?debug=1` in a debug-enabled build. Inspect `getState()`, the three `getProjection()` results, and `getEvents()`. Check the last command and simulation event first, then compare the bot projection diff with the player projection.
