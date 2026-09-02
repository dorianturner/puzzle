import type {
  ClawMachineState,
  ProjectedItem,
  Projection,
  ProjectionDiff,
  Vec3,
  ViewId,
  WorldObject,
} from "./types";

export interface ScreenPosition {
  horizontal: number;
  vertical: number;
  depth: number;
}

/** Convert a world position into the screen coordinates used by a view. */
export const projectPosition = (position: Vec3, view: ViewId): ScreenPosition => {
  switch (view) {
    case "XZ":
      return {
        horizontal: position.x,
        vertical: position.z,
        depth: position.y,
      };
    case "YZ":
      return {
        horizontal: position.y,
        vertical: position.z,
        depth: position.x,
      };
    case "XY":
      return {
        horizontal: position.y,
        vertical: position.x,
        depth: position.z,
      };
  }
};

const toClawPosition = (state: ClawMachineState, view: ViewId): ScreenPosition => {
  return projectPosition(state.clawPosition, view);
};

const positionKey = (position: ScreenPosition): string =>
  `${position.horizontal}:${position.vertical}`;

const compareVisibility = (a: ProjectedItem, b: ProjectedItem): number => {
  if (a.depth !== b.depth) return b.depth - a.depth;
  return a.id.localeCompare(b.id);
};

const itemFromObject = (
  object: WorldObject,
  view: ViewId,
  state: ClawMachineState,
): ProjectedItem => {
  const position = state.heldObjectId === object.id ? state.clawPosition : object.position;
  const positionedObject = { ...object, position };
  const screen = projectPosition(positionedObject.position, view);
  return {
    id: object.id,
    kind: object.kind,
    label: object.label,
    sprite: object.sprite,
    horizontal: screen.horizontal,
    vertical: screen.vertical,
    depth: screen.depth,
    visible: false,
    held: state.heldObjectId === object.id,
    delivered: object.delivered,
  };
};

/** Project the same authoritative state into one orthographic view. */
export const project = (state: ClawMachineState, view: ViewId): Projection => {
  const items = state.objects.map((object) => itemFromObject(object, view, state));
  const cells = new Map<string, ProjectedItem[]>();

  for (const item of items) {
    if (item.delivered) continue;
    const cell = positionKey(item);
    const existing = cells.get(cell) ?? [];
    existing.push(item);
    cells.set(cell, existing);
  }

  for (const candidates of cells.values()) {
    candidates.sort(compareVisibility);
    const visible = candidates[0];
    if (visible) visible.visible = true;
  }

  const claw = toClawPosition(
    {
      ...state,
      objects: [],
    },
    view,
  );

  return {
    view,
    heldObjectId: state.heldObjectId,
    claw: {
      ...claw,
      state: state.clawState,
    },
    items,
  };
};

export const projectToXZ = (state: ClawMachineState): Projection => project(state, "XZ");
export const projectToYZ = (state: ClawMachineState): Projection => project(state, "YZ");
export const projectToXY = (state: ClawMachineState): Projection => project(state, "XY");

const sameScreenPosition = (a: ProjectedItem, b: ProjectedItem): boolean =>
  a.horizontal === b.horizontal && a.vertical === b.vertical;

const isAlignedKey = (item: ProjectedItem, claw: Projection["claw"], view: ViewId): boolean =>
  item.kind === "key" &&
  item.visible &&
  !item.held &&
  !item.delivered &&
  item.horizontal === claw.horizontal &&
  (view !== "XY" || item.vertical === claw.vertical);

/** Compare two projections without consulting hidden world coordinates. */
export const diffProjection = (previous: Projection, current: Projection): ProjectionDiff => {
  const beforeById = new Map(previous.items.map((item) => [item.id, item]));
  const afterById = new Map(current.items.map((item) => [item.id, item]));
  const becameVisible: ProjectedItem[] = [];
  const becameHidden: ProjectedItem[] = [];
  const movedObjects: ProjectedItem[] = [];

  for (const currentItem of current.items) {
    const previousItem = beforeById.get(currentItem.id);
    if (!previousItem) continue;
    if (!previousItem.visible && currentItem.visible) becameVisible.push(currentItem);
    if (previousItem.visible && !currentItem.visible) becameHidden.push(currentItem);
    const visibleInEitherState = previousItem.visible || currentItem.visible;
    if (
      !sameScreenPosition(previousItem, currentItem) &&
      visibleInEitherState &&
      !currentItem.delivered
    ) {
      movedObjects.push(currentItem);
    }
  }

  const previousHeld = previous.heldObjectId;
  const currentHeld = current.heldObjectId;
  const objectGrabbed =
    previousHeld === null && currentHeld !== null ? (afterById.get(currentHeld) ?? null) : null;
  const objectDropped =
    previousHeld !== null && currentHeld === null ? (beforeById.get(previousHeld) ?? null) : null;
  const currentDropped =
    previousHeld !== null && currentHeld === null ? (afterById.get(previousHeld) ?? null) : null;
  const objectFell =
    objectDropped &&
    currentDropped &&
    objectDropped.kind === "plushie" &&
    current.view !== "XY" &&
    currentDropped.vertical < objectDropped.vertical
      ? currentDropped
      : null;
  const deliveredObject = current.items.find(
    (item) =>
      item.delivered && previous.items.some((before) => before.id === item.id && !before.delivered),
  );
  const alignedKeys = current.items.filter((item) =>
    isAlignedKey(item, current.claw, current.view),
  );

  return {
    view: current.view,
    clawMovedHorizontally: current.claw.horizontal - previous.claw.horizontal,
    clawMovedVertically: current.claw.vertical - previous.claw.vertical,
    clawStateChanged: current.claw.state !== previous.claw.state,
    clawStateBefore: previous.claw.state,
    clawStateAfter: current.claw.state,
    objectGrabbed: objectGrabbed ?? null,
    objectDropped: objectDropped ?? null,
    objectFell,
    deliveredObject: deliveredObject ?? null,
    alignedKeys,
    becameVisible,
    becameHidden,
    movedObjects,
  };
};

export const allProjections = (state: ClawMachineState): Record<ViewId, Projection> => ({
  XZ: projectToXZ(state),
  YZ: projectToYZ(state),
  XY: projectToXY(state),
});
