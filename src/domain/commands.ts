import type { Command } from "./types";

const aliases: Record<Command, readonly string[]> = {
  LEFT: ["left", "move left", "go left"],
  RIGHT: ["right", "move right", "go right"],
  GRAB: ["grab", "pick up", "drop"],
};

/** Parse only the deliberately small command vocabulary used by the bots. */
export const parseCommand = (input: string): Command | null => {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [command, accepted] of Object.entries(aliases) as [Command, readonly string[]][]) {
    if (accepted.includes(normalized)) return command;
  }
  return null;
};
