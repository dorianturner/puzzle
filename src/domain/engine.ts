import { allProjections, diffProjection } from "./projection";
import { cloneState, createInitialState } from "./state";
import { generateBotObservations } from "./observations";
import type {
  Action,
  ActionResult,
  ActorId,
  ClawMachineState,
  Command,
  LevelDefinition,
  SimulationEvent,
  Vec3,
  ViewId,
  WorldObject,
} from "./types";

const views: readonly ViewId[] = ["XZ", "YZ", "XY"];

const event = (
  type: SimulationEvent["type"],
  actionIndex: number,
  fields: Omit<SimulationEvent, "type" | "actionIndex"> = {},
): SimulationEvent => ({ type, actionIndex, ...fields });

const actorView = (state: ClawMachineState, level: LevelDefinition, actor: ActorId): ViewId =>
  actor === "player" ? state.currentPlayerView : level.initialAssignments[actor];

const movementAxis = (view: ViewId): "x" | "y" => (view === "YZ" ? "y" : "x");

const movePosition = (
  position: Vec3,
  axis: "x" | "y",
  delta: number,
  level: LevelDefinition,
): Vec3 => {
  const next = { ...position, [axis]: position[axis] + delta };
  const limit = level.bounds[axis];
  return {
    ...next,
    [axis]: Math.min(limit.max, Math.max(limit.min, next[axis])),
  };
};

const atSameHorizontalPosition = (a: Vec3, b: Vec3): boolean => a.x === b.x && a.y === b.y;

const getHeldObject = (state: ClawMachineState): WorldObject | null =>
  state.heldObjectId === null
    ? null
    : (state.objects.find((object) => object.id === state.heldObjectId) ?? null);

const eligibleObjects = (state: ClawMachineState): WorldObject[] =>
  state.objects.filter(
    (object) =>
      !object.delivered &&
      object.id !== state.heldObjectId &&
      atSameHorizontalPosition(object.position, state.clawPosition),
  );

const chooseObject = (state: ClawMachineState): WorldObject | null => {
  const candidates = eligibleObjects(state);
  candidates.sort(
    (a, b) =>
      b.grabPriority - a.grabPriority || b.position.z - a.position.z || a.id.localeCompare(b.id),
  );
  return candidates[0] ?? null;
};

const samePosition = (a: Vec3, b: Vec3): boolean => a.x === b.x && a.y === b.y && a.z === b.z;

const updateHeldObject = (state: ClawMachineState): void => {
  const heldObject = getHeldObject(state);
  if (heldObject) heldObject.position = { ...state.clawPosition };
};

const maybeUnlockView = (
  state: ClawMachineState,
  level: LevelDefinition,
  keyId: string,
  actionIndex: number,
  events: SimulationEvent[],
): void => {
  const unlock = level.viewUnlocks.find((candidate) => candidate.keyId === keyId);
  if (!unlock || state.currentPlayerView === unlock.view) return;
  state.currentPlayerView = unlock.view;
  events.push(
    event("player_view_changed", actionIndex, {
      details: { view: unlock.view, unlockedBy: keyId },
    }),
  );
};

const executeGrab = (
  state: ClawMachineState,
  level: LevelDefinition,
  action: Action,
  actionIndex: number,
  events: SimulationEvent[],
): void => {
  events.push(event("grab_started", actionIndex, { actor: action.actor, command: action.command }));

  if (state.clawState === "CLOSED_EMPTY") {
    state.clawState = "OPEN";
    events.push(
      event("claw_opened", actionIndex, { actor: action.actor, command: action.command }),
    );
    return;
  }

  if (state.clawState === "OPEN") {
    const object = chooseObject(state);
    state.clawState = "CLOSED_EMPTY";
    events.push(
      event("claw_closed", actionIndex, { actor: action.actor, command: action.command }),
    );
    if (!object) return;

    state.heldObjectId = object.id;
    state.clawState = object.kind === "key" ? "HOLDING_KEY" : "HOLDING_PLUSHIE";
    object.position = { ...state.clawPosition };
    events.push(event("object_grabbed", actionIndex, { objectId: object.id }));
    if (object.kind === "key")
      events.push(event("key_grabbed", actionIndex, { objectId: object.id }));
    return;
  }

  const heldObject = getHeldObject(state);
  if (!heldObject) {
    state.clawState = "OPEN";
    events.push(
      event("claw_opened", actionIndex, { actor: action.actor, command: action.command }),
    );
    return;
  }

  const before = { ...heldObject.position };
  heldObject.position = { ...state.clawPosition };
  state.heldObjectId = null;
  state.clawState = "OPEN";
  events.push(
    event("object_dropped", actionIndex, {
      objectId: heldObject.id,
      before,
      after: heldObject.position,
    }),
  );

  if (heldObject.kind === "plushie") {
    events.push(
      event("plushie_moved", actionIndex, {
        objectId: heldObject.id,
        before,
        after: heldObject.position,
      }),
    );
    return;
  }

  if (!atSameHorizontalPosition(heldObject.position, level.chutePosition)) return;

  heldObject.delivered = true;
  state.keysDelivered.push(heldObject.id);
  events.push(event("key_delivered", actionIndex, { objectId: heldObject.id }));
  maybeUnlockView(state, level, heldObject.id, actionIndex, events);
  if (state.keysDelivered.length === 3) {
    state.completed = true;
    events.push(event("level_completed", actionIndex));
  }
};

const appendVisibilityEvents = (
  before: ReturnType<typeof allProjections>,
  after: ReturnType<typeof allProjections>,
  actionIndex: number,
  events: SimulationEvent[],
): void => {
  const revealed = new Set<string>();
  for (const view of views) {
    const diff = diffProjection(before[view], after[view]);
    for (const item of diff.becameVisible) {
      if (item.kind === "key" && !revealed.has(item.id)) {
        revealed.add(item.id);
        events.push(event("key_revealed", actionIndex, { objectId: item.id }));
      }
    }
  }
};

/** Apply one command to a cloned state and derive every presentation-facing result. */
export const applyAction = (
  state: ClawMachineState,
  action: Action,
  level: LevelDefinition,
): ActionResult => {
  const beforeState = cloneState(state);
  const nextState = cloneState(state);
  const actionIndex = state.actionCount + 1;
  const events: SimulationEvent[] = [
    event("command_entered", actionIndex, { actor: action.actor, command: action.command }),
  ];
  nextState.actionCount = actionIndex;
  nextState.lastCommand = { ...action };

  if (state.completed) {
    events.push(
      event("command_rejected", actionIndex, {
        actor: action.actor,
        command: action.command,
        details: { reason: "level_completed" },
      }),
    );
  } else if (action.command === "GRAB") {
    executeGrab(nextState, level, action, actionIndex, events);
  } else {
    const axis = movementAxis(actorView(nextState, level, action.actor));
    const delta = action.command === "LEFT" ? -1 : 1;
    const after = movePosition(nextState.clawPosition, axis, delta, level);
    if (samePosition(after, nextState.clawPosition)) {
      events.push(
        event("claw_move_blocked", actionIndex, {
          actor: action.actor,
          command: action.command,
          before: nextState.clawPosition,
          after,
          details: { axis },
        }),
      );
    } else {
      const before = { ...nextState.clawPosition };
      nextState.clawPosition = after;
      updateHeldObject(nextState);
      events.push(
        event("claw_move", actionIndex, {
          actor: action.actor,
          command: action.command,
          before,
          after,
          details: { axis },
        }),
      );
    }
  }

  nextState.lastSimulationEvent = events.at(-1)?.type ?? null;
  const beforeProjections = allProjections(beforeState);
  const projections = allProjections(nextState);
  appendVisibilityEvents(beforeProjections, projections, actionIndex, events);
  const botMessages = {
    bot_a: generateBotObservations(
      diffProjection(
        beforeProjections[level.initialAssignments.bot_a],
        projections[level.initialAssignments.bot_a],
      ),
      level.initialAssignments.bot_a,
    ),
    bot_b: generateBotObservations(
      diffProjection(
        beforeProjections[level.initialAssignments.bot_b],
        projections[level.initialAssignments.bot_b],
      ),
      level.initialAssignments.bot_b,
    ),
  };

  return { state: nextState, events, projections, botMessages };
};

export const initialActionResult = (level: LevelDefinition, seed = level.seed): ActionResult => {
  const state = createInitialState(level, seed);
  const projections = allProjections(state);
  return {
    state,
    events: [event("game_started", 0), event("level_started", 0)],
    projections,
    botMessages: { bot_a: [], bot_b: [] },
  };
};

export const executeSequence = (
  level: LevelDefinition,
  actions: readonly Action[],
  seed = level.seed,
): ActionResult => {
  let result = initialActionResult(level, seed);
  for (const action of actions) result = applyAction(result.state, action, level);
  return result;
};

export const commandFromDirection = (direction: "left" | "right"): Command =>
  direction === "left" ? "LEFT" : "RIGHT";
