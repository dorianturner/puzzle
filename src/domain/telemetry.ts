import type { EventStore, GameEvent, SimulationEvent } from "./types";

/** In-memory structured event sink with injectable time for deterministic tests. */
export const createEventStore = (
  sessionId: string,
  now: () => number = () => Date.now(),
): EventStore => {
  const events: GameEvent[] = [];
  return {
    record(simulationEvents, metadata = {}) {
      const enriched = simulationEvents.map((simulationEvent: SimulationEvent): GameEvent => ({
        ...simulationEvent,
        actor: simulationEvent.actor ?? metadata.actor,
        command: simulationEvent.command ?? metadata.command,
        sessionId,
        timestamp: now(),
      }));
      events.push(...enriched);
      return enriched;
    },
    getEvents: () => [...events],
    exportJson: () => JSON.stringify(events, null, 2),
    clear: () => {
      events.length = 0;
    },
  };
};
