import type { Action, LevelDefinition, MachineBounds, Vec3, WorldObjectDefinition } from "./types";

const bounds: MachineBounds = {
  x: { min: 0, max: 8 },
  y: { min: 0, max: 8 },
  z: { min: 0, max: 6 },
};

const object = (
  id: string,
  kind: WorldObjectDefinition["kind"],
  label: string,
  sprite: WorldObjectDefinition["sprite"],
  position: Vec3,
  grabPriority: number,
): WorldObjectDefinition => ({
  id,
  kind,
  label,
  sprite,
  position,
  grabPriority,
});

const action = (actor: Action["actor"], command: Action["command"]): Action => ({
  actor,
  command,
});

/** The authored prototype level. Coordinates are content, not engine logic. */
export const clawMachineLevel: LevelDefinition = {
  id: "claw-machine",
  number: 1,
  title: "CLAW MACHINE",
  subtitle: "",
  seed: 1001,
  bounds,
  chutePosition: { x: 0, y: 0, z: 0 },
  initialClawPosition: { x: 0, y: 0, z: 6 },
  initialAssignments: {
    player: "XZ",
    bot_a: "YZ",
    bot_b: "XY",
  },
  viewUnlocks: [
    { keyId: "key-1", view: "YZ" },
    { keyId: "key-2", view: "XY" },
  ],
  objects: [
    object("key-1", "key", "a key", "key", { x: 3, y: 2, z: 0 }, 0),
    object("key-2", "key", "a key", "key", { x: 2, y: 0, z: 0 }, 0),
    object("key-3", "key", "a key", "key", { x: 5, y: 0, z: 0 }, 0),
    object("plush-1", "plushie", "pink bear", "bear", { x: 3, y: 2, z: 2 }, 10),
    object("plush-2", "plushie", "yellow duck", "duck", { x: 2, y: 0, z: 2 }, 10),
    object("plush-3", "plushie", "blue frog", "frog", { x: 5, y: 0, z: 2 }, 10),
    object("plush-4", "plushie", "small rabbit", "rabbit", { x: 1, y: 1, z: 1 }, 10),
    object("plush-5", "plushie", "green blob", "blob", { x: 4, y: 1, z: 2 }, 10),
    object("plush-6", "plushie", "orange cat", "cat", { x: 6, y: 3, z: 1 }, 10),
    object("plush-7", "plushie", "small bear", "bear", { x: 7, y: 6, z: 2 }, 10),
    object("plush-8", "plushie", "small duck", "duck", { x: 5, y: 7, z: 1 }, 10),
    object("plush-9", "plushie", "small blob", "blob", { x: 2, y: 7, z: 2 }, 10),
    object("plush-10", "plushie", "small cat", "cat", { x: 7, y: 1, z: 1 }, 10),
  ],
  canonicalSolution: [
    // Key 1: use the starting Y controller and Bot A's X controller.
    action("player", "RIGHT"),
    action("player", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "GRAB"),
    action("bot_a", "RIGHT"),
    action("bot_a", "GRAB"),
    action("bot_a", "LEFT"),
    action("bot_a", "GRAB"),
    action("player", "LEFT"),
    action("player", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "GRAB"),
    // Key 2: the newly unlocked X controller reaches the second key.
    action("bot_a", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "GRAB"),
    action("bot_a", "RIGHT"),
    action("bot_a", "GRAB"),
    action("bot_a", "LEFT"),
    action("bot_a", "GRAB"),
    action("bot_a", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "GRAB"),
    // Key 3: exercise the hidden Z controller, then collect the final key.
    action("player", "LEFT"),
    action("player", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "RIGHT"),
    action("bot_a", "GRAB"),
    action("bot_a", "RIGHT"),
    action("bot_a", "GRAB"),
    action("bot_a", "LEFT"),
    action("bot_a", "GRAB"),
    action("bot_a", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "LEFT"),
    action("bot_a", "GRAB"),
  ],
};

/** The registry is the only menu-facing source of available levels. */
export const LEVELS: readonly LevelDefinition[] = [clawMachineLevel];

export const getLevel = (levelId: string): LevelDefinition => {
  const level = LEVELS.find((candidate) => candidate.id === levelId);
  if (!level) {
    throw new Error(`Unknown level: ${levelId}`);
  }
  return level;
};
