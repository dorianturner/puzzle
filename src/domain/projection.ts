import type {
  ClawMachineState,
  ProjectedItem,
  Projection,
  ProjectionDiff,
  ViewId,
  WorldObject,
} from "./types";

interface ScreenPosition {
  horizontal: number;
  vertical: number;
  depth: number;
}

const toScreenPosition = (object: WorldObject, view: ViewId): ScreenPosition => {
  switch (view) {
    case "XZ":
      return {
        horizontal: object.position.x,
        vertical: object.position.z,
        depth: object.position.y,
      };
    case "YZ":
      return {
        horizontal: object.position.y,
        vertical: object.position.z,
        depth: object.position.x,
      };
    case "XY":
      return {
        horizontal: object.position.x,
        vertical: object.position.y,
        depth: object.position.z,
      };
  }
};

const toClawPosition = (state: ClawMachineState, view: ViewId): ScreenPosition => {
  const { x, y, z } = state.clawPosition;
  switch (view) {
    case "XZ":
      return { horizontal: x, vertical: z, depth: y };
    case "YZ":
      return { horizontal: y, vertical: z, depth: x };
    case "XY":
      return { horizontal: x, vertical: y, depth: z };
  }
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
  const screen = toScreenPosition(positionedObject, view);
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

const samePosition = (a: ProjectedItem, b: ProjectedItem): boolean =>
  a.horizontal === b.horizontal && a.vertical === b.vertical && a.depth === b.depth;

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
    if (!samePosition(previousItem, currentItem) && !currentItem.delivered) {
      movedObjects.push(currentItem);
    }
  }

  const previousHeld = previous.heldObjectId;
  const currentHeld = current.heldObjectId;
  const objectGrabbed =
    previousHeld === null && currentHeld !== null ? (afterById.get(currentHeld) ?? null) : null;
  const objectDropped =
    previousHeld !== null && currentHeld === null ? (beforeById.get(previousHeld) ?? null) : null;
  const deliveredObject = current.items.find(
    (item) =>
      item.delivered && previous.items.some((before) => before.id === item.id && !before.delivered),
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
    deliveredObject: deliveredObject ?? null,
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
