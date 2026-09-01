import { describe, expect, it } from "vitest";
import { parseCommand } from "./commands";

describe("bot command parser", () => {
  it.each([
    ["left", "LEFT"],
    [" MOVE LEFT ", "LEFT"],
    ["go right", "RIGHT"],
    ["pick up", "GRAB"],
    ["drop", "GRAB"],
  ])("maps %s to %s", (input, expected) => {
    expect(parseCommand(input)).toBe(expected);
  });

  it("rejects commands outside the supported vocabulary", () => {
    expect(parseCommand("solve the puzzle")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });
});
