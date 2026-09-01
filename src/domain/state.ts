import type { ClawMachineState, LevelDefinition, WorldObject } from "./types";

const cloneObject = (object: WorldObject): WorldObject => ({
  ...object,
  position: { ...object.position },
});

/** Create a fresh state from authored level data. No random source is consulted. */
export const createInitialState = (
  level: LevelDefinition,
  seed = level.seed,
): ClawMachineState => ({
  levelId: level.id,
  seed,
  clawPosition: { ...level.initialClawPosition },
  clawState: "OPEN",
  heldObjectId: null,
  objects: level.objects.map((object) => ({
    ...object,
    position: { ...object.position },
    delivered: false,
  })),
  keysDelivered: [],
  currentPlayerView: level.initialAssignments.player,
  actionCount: 0,
  completed: false,
  lastCommand: null,
  lastSimulationEvent: "level_started",
});

/** Clone state for an undo snapshot without sharing mutable object positions. */
export const cloneState = (state: ClawMachineState): ClawMachineState => ({
  ...state,
  clawPosition: { ...state.clawPosition },
  heldObjectId: state.heldObjectId,
  objects: state.objects.map(cloneObject),
  keysDelivered: [...state.keysDelivered],
  lastCommand: state.lastCommand ? { ...state.lastCommand } : null,
});

export const resetState = (level: LevelDefinition, seed = level.seed): ClawMachineState =>
  createInitialState(level, seed);
