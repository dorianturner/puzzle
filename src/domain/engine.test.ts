import { describe, expect, it } from "vitest";
import { applyAction, executeSequence } from "./engine";
import { clawMachineLevel } from "./level";
import { allProjections, diffProjection } from "./projection";
import { createInitialState } from "./state";
import type { LevelDefinition } from "./types";

describe("Claw Machine simulation", () => {
  it("completes the authored canonical solution from seed 1001", () => {
    const result = executeSequence(clawMachineLevel, clawMachineLevel.canonicalSolution, 1001);
    const eventTypes = result.events.map((event) => event.type);

    expect(result.state.seed).toBe(1001);
    expect(result.state.keysDelivered).toEqual(["key-1", "key-2", "key-3"]);
    expect(result.state.currentPlayerView).toBe("XY");
    expect(result.state.completed).toBe(true);
    expect(eventTypes).toContain("level_completed");
  });

  it("replays the same seed and action sequence identically", () => {
    const first = executeSequence(clawMachineLevel, clawMachineLevel.canonicalSolution, 1001);
    const second = executeSequence(clawMachineLevel, clawMachineLevel.canonicalSolution, 1001);

    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
  });

  it("constrains movement and logs a blocked boundary action", () => {
    const state = createInitialState(clawMachineLevel);
    state.clawPosition = { x: 0, y: 0, z: 6 };
    const result = applyAction(state, { actor: "player", command: "LEFT" }, clawMachineLevel);

    expect(result.state.clawPosition).toEqual({ x: 0, y: 0, z: 6 });
    expect(result.events.some((event) => event.type === "claw_move_blocked")).toBe(true);
    expect(result.botMessages.bot_a.join(" ")).toContain("did not move on my screen");
  });

  it("drops plushies to the floor with gravity and reports the fall", () => {
    const state = createInitialState(clawMachineLevel);
    const plushie = state.objects.find((object) => object.id === "plush-5")!;
    state.clawPosition = { x: 4, y: 1, z: 6 };
    plushie.position = { ...state.clawPosition };
    state.heldObjectId = plushie.id;
    state.clawState = "HOLDING_PLUSHIE";

    const result = applyAction(state, { actor: "player", command: "GRAB" }, clawMachineLevel);
    const dropped = result.state.objects.find((object) => object.id === plushie.id);

    expect(dropped?.position).toEqual({ x: 4, y: 1, z: 0 });
    expect(result.events.some((event) => event.type === "object_fell")).toBe(true);
    expect(result.botMessages.bot_a).toContain("The plushie fell into place.");
    expect(result.botMessages.bot_b).not.toContain("The plushie fell into place.");
  });

  it("settles a dropped plushie on top of an object at the same X/Y cell", () => {
    const state = createInitialState(clawMachineLevel);
    state.objects = state.objects.filter(
      (object) => object.id === "key-2" || object.id === "plush-1",
    );
    const plushie = state.objects.find((object) => object.id === "plush-1")!;
    state.clawPosition = { x: 2, y: 0, z: 6 };
    plushie.position = { ...state.clawPosition };
    state.heldObjectId = plushie.id;
    state.clawState = "HOLDING_PLUSHIE";

    const result = applyAction(state, { actor: "player", command: "GRAB" }, clawMachineLevel);

    expect(result.state.objects.find((object) => object.id === plushie.id)?.position.z).toBe(1);
  });

  it.each([
    {
      actor: "player" as const,
      view: "XZ" as const,
      axis: "y" as const,
      expected: { XZ: [0, 0], YZ: [1, 0], XY: [1, 0] } as const,
    },
    {
      actor: "bot_a" as const,
      view: "YZ" as const,
      axis: "x" as const,
      expected: { XZ: [1, 0], YZ: [0, 0], XY: [0, 1] } as const,
    },
    {
      actor: "bot_b" as const,
      view: "XY" as const,
      axis: "z" as const,
      expected: { XZ: [0, 1], YZ: [0, 1], XY: [0, 0] } as const,
    },
  ])("moves only on the axis hidden by $view", ({ actor, view, axis, expected }) => {
    const state = createInitialState(clawMachineLevel);
    state.clawPosition = { x: 4, y: 4, z: 2 };
    const before = allProjections(state);
    const result = applyAction(state, { actor, command: "RIGHT" }, clawMachineLevel);
    const after = result.projections;

    expect(result.events.find((event) => event.type === "claw_move")?.details?.axis).toBe(axis);
    expect(after[view].claw.horizontal).toBe(before[view].claw.horizontal);
    expect(after[view].claw.vertical).toBe(before[view].claw.vertical);
    const ownViewDiff = diffProjection(before[view], after[view]);
    expect(ownViewDiff.movedObjects).toHaveLength(0);
    expect(ownViewDiff.clawMovedHorizontally).toBe(0);
    expect(ownViewDiff.clawMovedVertically).toBe(0);
    for (const projectionView of ["XZ", "YZ", "XY"] as const) {
      const [horizontalDelta, verticalDelta] = expected[projectionView];
      expect(after[projectionView].claw.horizontal - before[projectionView].claw.horizontal).toBe(
        horizontalDelta,
      );
      expect(after[projectionView].claw.vertical - before[projectionView].claw.vertical).toBe(
        verticalDelta,
      );
    }
  });

  it("reports the initial axis contract through bot observations", () => {
    const playerMove = applyAction(
      { ...createInitialState(clawMachineLevel), clawPosition: { x: 4, y: 4, z: 2 } },
      { actor: "player", command: "RIGHT" },
      clawMachineLevel,
    );
    expect(playerMove.botMessages.bot_a[0]).toBe("The claw moved right on my screen.");
    expect(playerMove.botMessages.bot_b[0]).toBe("The claw moved right on my screen.");

    const botAMove = applyAction(
      { ...createInitialState(clawMachineLevel), clawPosition: { x: 4, y: 4, z: 2 } },
      { actor: "bot_a", command: "RIGHT" },
      clawMachineLevel,
    );
    expect(botAMove.botMessages.bot_a[0]).toBe("The claw did not move on my screen.");
    expect(botAMove.botMessages.bot_b[0]).toBe("The claw moved up on my screen.");

    const botBMove = applyAction(
      { ...createInitialState(clawMachineLevel), clawPosition: { x: 4, y: 4, z: 2 } },
      { actor: "bot_b", command: "RIGHT" },
      clawMachineLevel,
    );
    expect(botBMove.botMessages.bot_a[0]).toBe("The claw moved up on my screen.");
    expect(botBMove.botMessages.bot_b[0]).toBe("The claw did not move on my screen.");
  });

  it("tells bots when their projection aligns with a visible key", () => {
    const state = createInitialState(clawMachineLevel);
    state.clawPosition = { x: 8, y: 1, z: 6 };
    const result = applyAction(state, { actor: "player", command: "RIGHT" }, clawMachineLevel);

    expect(result.botMessages.bot_a).toContain("I'm over a key on my screen.");
    expect(result.botMessages.bot_b).not.toContain("I'm over a key on my screen.");

    const topState = createInitialState(clawMachineLevel);
    topState.objects.find((object) => object.id === "plush-1")!.delivered = true;
    topState.clawPosition = { x: 3, y: 1, z: 6 };
    const topResult = applyAction(
      topState,
      { actor: "player", command: "RIGHT" },
      clawMachineLevel,
    );

    expect(topResult.botMessages.bot_b).toContain("I'm over a key on my screen.");
  });

  it("supports a future level definition without engine changes", () => {
    const futureLevel: LevelDefinition = {
      ...clawMachineLevel,
      id: "future-level",
      objects: [],
      canonicalSolution: [],
    };
    const state = createInitialState(futureLevel, 2002);
    const result = applyAction(state, { actor: "player", command: "RIGHT" }, futureLevel);

    expect(result.state.levelId).toBe("future-level");
    expect(result.state.clawPosition.y).toBe(1);
  });
});
