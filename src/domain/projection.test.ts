import { describe, expect, it } from "vitest";
import { clawMachineLevel } from "./level";
import { diffProjection, projectToXY, projectToXZ, projectToYZ } from "./projection";
import { createInitialState } from "./state";

describe("orthographic projections", () => {
  it("collapses depth in XZ but preserves it in YZ", () => {
    const state = createInitialState(clawMachineLevel);
    state.objects = [
      {
        ...state.objects[0]!,
        id: "object-a",
        position: { x: 2, y: 3, z: 4 },
      },
      {
        ...state.objects[1]!,
        id: "object-b",
        position: { x: 2, y: 8, z: 4 },
      },
    ];

    const xz = projectToXZ(state);
    const yz = projectToYZ(state);
    const xzItems = xz.items.filter((item) => item.id.startsWith("object-"));
    const yzItems = yz.items.filter((item) => item.id.startsWith("object-"));

    expect(xzItems[0]?.horizontal).toBe(xzItems[1]?.horizontal);
    expect(xzItems[0]?.vertical).toBe(xzItems[1]?.vertical);
    expect(xzItems.filter((item) => item.visible)).toHaveLength(1);
    expect(new Set(yzItems.map((item) => item.horizontal)).size).toBe(2);
    expect(yzItems.every((item) => item.visible)).toBe(true);
  });

  it("diffs visible changes without exposing world coordinates", () => {
    const before = projectToXZ(createInitialState(clawMachineLevel));
    const next = createInitialState(clawMachineLevel);
    next.clawPosition.x += 1;
    const diff = diffProjection(before, projectToXZ(next));

    expect(diff.clawMovedHorizontally).toBe(1);
    expect(JSON.stringify(diff)).not.toContain("world coordinates");
  });

  it("presents Y horizontally and X vertically in the XY view", () => {
    const state = createInitialState(clawMachineLevel);
    state.clawPosition = { x: 2, y: 5, z: 4 };

    const xy = projectToXY(state);

    expect(xy.claw.horizontal).toBe(5);
    expect(xy.claw.vertical).toBe(2);
    expect(xy.claw.depth).toBe(4);
  });
});
