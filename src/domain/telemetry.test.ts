import { describe, expect, it } from "vitest";
import { createEventStore } from "./telemetry";

describe("structured event store", () => {
  it("adds stable metadata and exports JSON", () => {
    const store = createEventStore("test-session", () => 1234);
    const events = store.record([{ type: "level_started", actionIndex: 0 }]);

    expect(events[0]).toMatchObject({
      type: "level_started",
      actionIndex: 0,
      sessionId: "test-session",
      timestamp: 1234,
    });
    expect(JSON.parse(store.exportJson())).toHaveLength(1);
  });
});
