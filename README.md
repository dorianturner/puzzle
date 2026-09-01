# Perspective

Perspective is a deterministic browser puzzle prototype. The Claw Machine level asks the player to infer one 3D machine from three incomplete orthographic views.

## Requirements

- Node.js 22 or newer
- npm
- Chromium (Playwright installs its own CI browser)

Install dependencies and start the local app:

```sh
npm ci
npm run dev
```

Open the Vite URL shown in the terminal. The production build can be checked with:

```sh
npm run check
npm run preview
```

`npm run check` runs TypeScript, ESLint, Prettier, Stylelint, Markdownlint, unit tests, the production build, and Playwright tests.

## Architecture

The simulation in `src/domain` owns all positions, object state, claw behavior, progression, projections, and deterministic events. The Canvas renderer receives projections and never mutates simulation state. The DOM shell owns controls, the read-only bot feed, and accessibility semantics.

Levels are registered through the `LEVELS` registry. The current registry contains Claw Machine and Calibration Bay. Adding another level means adding authored data that implements `LevelDefinition`; movement, grab/drop mechanics, projection, observation, progression, and level navigation remain shared.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/LEVEL_AUTHORING.md](docs/LEVEL_AUTHORING.md), and [docs/TESTING.md](docs/TESTING.md) for details.

## Debugging

In development, use the backtick key or append `?debug=1` to show the state overlay. The browser exposes `window.__PERSPECTIVE__` with state snapshots, projections, events, reset, seed, and action execution helpers.

## CI/CD

GitHub Actions validates every pull request and push to `main`. A successful `main` build is published to GitHub Pages. Enable Pages with GitHub Actions as the source and make the quality workflow a required branch-protection check.
