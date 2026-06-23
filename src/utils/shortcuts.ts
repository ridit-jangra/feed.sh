type Shortcut = {
  key: string;
  ctrl?: boolean;
  description: string;
  action: (...args: any[]) => void;
};

const registry: Shortcut[] = [];

export function registerShortcut(shortcut: Shortcut): void {
  registry.push(shortcut);
}

export function findShortcut(
  input: string,
  key: { ctrl?: boolean },
): Shortcut | undefined {
  return registry.find((s) => s.key === input && !!s.ctrl === !!key.ctrl);
}

export function getShortcuts(): Shortcut[] {
  return registry;
}

registerShortcut({
  key: "t",
  ctrl: true,
  description: "cycle mode (agent → build → chat)",
  action: ({ mode, setMode }) => {
    // const cycle: Mode[] = ["agent", "build", "chat"];
    // const next = cycle[(cycle.indexOf(mode) + 1) % cycle.length];
    // if (next) setMode(next);
  },
});
