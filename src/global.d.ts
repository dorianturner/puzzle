import type { Action, ClawMachineState, GameEvent, Projection, ViewId } from "./domain";

interface PerspectiveDebugApi {
  getState(): ClawMachineState;
  getEvents(): readonly GameEvent[];
  reset(seed?: number): ClawMachineState;
  execute(action: Action): ClawMachineState;
  setSeed(seed: number): ClawMachineState;
  getProjection(view: ViewId): Projection;
}

declare global {
  interface Window {
    __PERSPECTIVE__?: PerspectiveDebugApi;
  }
}

export {};
