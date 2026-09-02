/** Cartesian coordinates used by the authoritative simulation. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Inclusive integer limits for the claw machine grid. */
export interface MachineBounds {
  x: { min: number; max: number };
  y: { min: number; max: number };
  z: { min: number; max: number };
}

export type ViewId = "XZ" | "YZ" | "XY";
export type ActorId = "player" | "bot_a" | "bot_b";
export type Command = "LEFT" | "RIGHT" | "GRAB";
export type ObjectKind = "plushie" | "key";
export type SpriteId = "bear" | "blob" | "cat" | "duck" | "frog" | "key" | "rabbit";

export type ClawState = "OPEN" | "CLOSED_EMPTY" | "HOLDING_PLUSHIE" | "HOLDING_KEY";

export interface WorldObjectDefinition {
  id: string;
  kind: ObjectKind;
  label: string;
  sprite: SpriteId;
  position: Vec3;
  grabPriority: number;
}

export interface WorldObject extends WorldObjectDefinition {
  position: Vec3;
  delivered: boolean;
}

export interface ViewAssignments {
  player: ViewId;
  bot_a: ViewId;
  bot_b: ViewId;
}

export interface ViewUnlock {
  keyId: string;
  view: ViewId;
}

export interface Action {
  actor: ActorId;
  command: Command;
}

export interface LevelDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  seed: number;
  bounds: MachineBounds;
  chutePosition: Vec3;
  initialClawPosition: Vec3;
  objects: WorldObjectDefinition[];
  initialAssignments: ViewAssignments;
  viewUnlocks: ViewUnlock[];
  canonicalSolution: Action[];
}

export interface ClawMachineState {
  levelId: string;
  seed: number;
  clawPosition: Vec3;
  clawState: ClawState;
  heldObjectId: string | null;
  objects: WorldObject[];
  keysDelivered: string[];
  currentPlayerView: ViewId;
  actionCount: number;
  completed: boolean;
  lastCommand: Action | null;
  lastSimulationEvent: SimulationEventType | null;
}

export interface ProjectedItem {
  id: string;
  kind: ObjectKind;
  label: string;
  sprite: SpriteId;
  horizontal: number;
  vertical: number;
  depth: number;
  visible: boolean;
  held: boolean;
  delivered: boolean;
}

export interface Projection {
  view: ViewId;
  heldObjectId: string | null;
  claw: {
    horizontal: number;
    vertical: number;
    depth: number;
    state: ClawState;
  };
  items: ProjectedItem[];
}

export interface ProjectionDiff {
  view: ViewId;
  clawMovedHorizontally: number;
  clawMovedVertically: number;
  clawStateChanged: boolean;
  clawStateBefore: ClawState;
  clawStateAfter: ClawState;
  objectGrabbed: ProjectedItem | null;
  objectDropped: ProjectedItem | null;
  deliveredObject: ProjectedItem | null;
  /** Visible keys currently aligned with the claw in this projection. */
  alignedKeys: ProjectedItem[];
  becameVisible: ProjectedItem[];
  becameHidden: ProjectedItem[];
  movedObjects: ProjectedItem[];
}

export type SimulationEventType =
  | "game_started"
  | "level_started"
  | "command_entered"
  | "command_rejected"
  | "claw_move"
  | "claw_move_blocked"
  | "grab_started"
  | "object_grabbed"
  | "object_dropped"
  | "plushie_moved"
  | "key_revealed"
  | "key_grabbed"
  | "key_delivered"
  | "player_view_changed"
  | "level_reset"
  | "level_completed"
  | "action_undone"
  | "claw_closed"
  | "claw_opened";

export interface SimulationEvent {
  type: SimulationEventType;
  actionIndex: number;
  actor?: ActorId;
  command?: Command;
  before?: Vec3;
  after?: Vec3;
  objectId?: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface GameEvent extends SimulationEvent {
  sessionId: string;
  timestamp: number;
}

export interface ActionResult {
  state: ClawMachineState;
  events: SimulationEvent[];
  projections: Record<ViewId, Projection>;
  botMessages: Record<"bot_a" | "bot_b", string[]>;
}

export interface EventStore {
  record(events: SimulationEvent[], metadata?: { actor?: ActorId; command?: Command }): GameEvent[];
  getEvents(): readonly GameEvent[];
  exportJson(): string;
  clear(): void;
}
