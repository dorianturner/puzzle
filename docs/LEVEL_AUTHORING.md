# Level Authoring

## Add a level

1. Create a `LevelDefinition` beside the existing level data.
2. Give it a unique ID, display metadata, fixed seed, integer bounds, chute position, and claw start.
3. Add 8–12 plushies and exactly three keys with stable IDs and sprites.
4. Place keys beneath or behind plushies so at least one projection is meaningfully ambiguous.
5. Assign the player, Bot A, and Bot B initial views.
6. Define key-to-view unlocks in progression order.
7. Register the definition in `LEVELS`.

Do not add level-specific conditionals to the simulation engine. If a future design needs a new mechanic, add a documented generic rule or a versioned mechanic capability rather than branching on a level ID.

When validating clue quality, remember that bots only announce keys that are visible in their projection. A side-view bot reports a key when the claw shares its horizontal track; the rotated top view reports a key when the claw and key share the same screen cell. Keep those projected alignments intentional when authoring a solution.

## Author and validate a solution

Use the development overlay and `window.__PERSPECTIVE__` to inspect projections while experimenting. Once the intended route is known, store its exact actor/command sequence in `canonicalSolution`.

The canonical solution must:

- start from the level seed;
- deliver keys in authored order;
- verify each required player-view unlock;
- end in `completed: true`;
- remain unchanged when the same seed and commands are replayed.

Keep object IDs stable. Tests and telemetry use them to distinguish a key from a plushie even when labels are identical.
