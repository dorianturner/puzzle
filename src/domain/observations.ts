import type { ProjectedItem, ProjectionDiff, ViewId } from "./types";

const describeGrab = (item: ProjectedItem): string =>
  item.kind === "key"
    ? "The claw closed over something metallic."
    : "The claw closed around a plushie.";

const describeDrop = (item: ProjectedItem): string =>
  item.kind === "key" ? "The claw released the key." : "The claw released the plushie.";

/** Generate constrained natural-language observations from a projection diff only. */
export const generateBotObservations = (diff: ProjectionDiff, botView: ViewId): string[] => {
  void botView;
  const messages: string[] = [];

  if (diff.clawMovedHorizontally > 0) {
    messages.push("The claw moved right on my screen.");
  } else if (diff.clawMovedHorizontally < 0) {
    messages.push("The claw moved left on my screen.");
  } else if (diff.clawMovedVertically > 0) {
    messages.push("The claw moved up on my screen.");
  } else if (diff.clawMovedVertically < 0) {
    messages.push("The claw moved down on my screen.");
  } else {
    messages.push("The claw did not move on my screen.");
  }

  if (diff.objectGrabbed) messages.push(describeGrab(diff.objectGrabbed));
  if (diff.objectDropped) messages.push(describeDrop(diff.objectDropped));
  if (diff.clawStateChanged && diff.clawStateAfter === "CLOSED_EMPTY") {
    messages.push("The claw closed, but nothing came with it.");
  } else if (diff.clawStateChanged && diff.clawStateAfter === "OPEN") {
    messages.push("The claw opened.");
  }

  for (const item of diff.becameVisible) {
    messages.push(item.kind === "key" ? "A key is visible now." : "A plushie shifted into view.");
  }
  for (const item of diff.becameHidden) {
    if (item.kind === "key") {
      messages.push(
        item.delivered ? "The key vanished from view." : "The key disappeared behind something.",
      );
    }
  }
  if (diff.movedObjects.some((item) => item.kind === "plushie") && !diff.objectDropped) {
    messages.push("A plushie moved.");
  }
  if (diff.deliveredObject) messages.push("The key disappeared into the prize chute.");

  return messages;
};
