import type { Command } from "./types";

const COMMANDS: Command[] = [];

export function getCommands(): Command[] {
  return COMMANDS.filter((c) => c.isEnabled);
}

export function findCommand(
  input: string,
): { command: Command; args: string } | null {
  if (!input.startsWith("/")) return null;
  const [name, ...rest] = input.slice(1).split(" ");
  const args = rest.join(" ");
  const command = COMMANDS.find(
    (c) => c.userFacingName() === name || c.aliases?.includes(name ?? ""),
  );
  if (!command || !command.isEnabled) return null;
  return { command, args };
}
