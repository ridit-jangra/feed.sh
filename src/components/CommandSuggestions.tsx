import React from "react";
import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import { getCommands } from "../commands";
import { pointerSmall } from "../utils/icons";
import type { Command } from "../types";

type Props = {
  query: string;
  selectedIndex: number;
};

function HighlightedName({ name, query }: { name: string; query: string }) {
  if (!query) return <Text color={getTheme().secondary}>/{name}</Text>;

  const matched = query.slice(1).toLowerCase();
  const matchEnd = matched.length;

  return (
    <Text>
      <Text color={getTheme().secondaryText} dimColor>
        /
      </Text>
      {name.split("").map((char, i) => (
        <Text
          key={i}
          color={i < matchEnd ? getTheme().primary : getTheme().secondary}
        >
          {char}
        </Text>
      ))}
    </Text>
  );
}

type MatchResult =
  | { type: "none" }
  | { type: "commands"; items: Command[] }
  | {
      type: "subcommands";
      command: Command;
      items: { name: string; description?: string }[];
    };

function getMatching(query: string): MatchResult {
  if (!query.startsWith("/")) return { type: "none" };

  const parts = query.slice(1).split(" ");
  const base = parts[0]?.toLowerCase() ?? "";
  const sub = parts[1]?.toLowerCase() ?? "";

  const commands = getCommands().filter(
    (c) =>
      !c.isHidden &&
      (c.userFacingName().startsWith(base) ||
        c.aliases?.some((a) => a.startsWith(base))),
  );

  if (parts.length === 1 || query.endsWith(" ")) {
    const exact = commands.find(
      (c) => c.userFacingName() === base || c.aliases?.includes(base),
    );

    if (exact?.subcommands) {
      return {
        type: "subcommands",
        command: exact,
        items: exact.subcommands,
      };
    }
  }

  if (parts.length >= 2) {
    const exact = getCommands().find(
      (c) => c.userFacingName() === base || c.aliases?.includes(base),
    );

    if (exact?.subcommands) {
      return {
        type: "subcommands",
        command: exact,
        items: exact.subcommands.filter((s) => s.name.startsWith(sub)),
      };
    }
  }

  return { type: "commands", items: commands };
}

function getWindow<T>(items: T[], selectedIndex: number, maxVisible: number) {
  let start = selectedIndex - Math.floor(maxVisible / 2);
  start = Math.max(0, start);

  const end = Math.min(start + maxVisible, items.length);

  if (end - start < maxVisible) {
    start = Math.max(0, end - maxVisible);
  }

  return {
    start,
    end,
    visible: items.slice(start, end),
  };
}

export function CommandSuggestions({
  query,
  selectedIndex,
}: Props): React.ReactNode {
  const result = getMatching(query);
  if (result.type === "none") return null;

  const MAX_VISIBLE = 4;

  if (result.type === "commands") {
    const matches = result.items;
    if (matches.length === 0) return null;

    const { start, end, visible } = getWindow(
      matches,
      selectedIndex,
      MAX_VISIBLE,
    );

    return (
      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        {start > 0 && (
          <Text color={getTheme().secondaryText} dimColor>
            ↑ more
          </Text>
        )}

        {visible.map((c, i) => {
          const actualIndex = start + i;
          const isSelected = actualIndex === selectedIndex;
          const name = c.userFacingName();
          const aliases = c.aliases ? ` (${c.aliases.join(", ")})` : "";

          return (
            <Box key={name} gap={1}>
              <Text
                color={
                  isSelected ? getTheme().primary : getTheme().secondaryText
                }
                dimColor={!isSelected}
              >
                {pointerSmall}
              </Text>

              <HighlightedName name={name + aliases} query={query} />

              <Text color={getTheme().secondaryText} dimColor>
                — {c.description}
              </Text>
            </Box>
          );
        })}

        {end < matches.length && (
          <Text color={getTheme().secondaryText} dimColor>
            ↓ more
          </Text>
        )}
      </Box>
    );
  }

  if (result.type === "subcommands") {
    const { command, items } = result;
    if (items.length === 0) return null;

    const { start, end, visible } = getWindow(
      items,
      selectedIndex,
      MAX_VISIBLE,
    );

    return (
      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        {start > 0 && (
          <Text color={getTheme().secondaryText} dimColor>
            ↑ more
          </Text>
        )}

        {visible.map((s, i) => {
          const actualIndex = start + i;
          const isSelected = actualIndex === selectedIndex;

          return (
            <Box key={s.name} gap={1}>
              <Text
                color={
                  isSelected ? getTheme().primary : getTheme().secondaryText
                }
                dimColor={!isSelected}
              >
                {pointerSmall}
              </Text>

              <Text>
                <Text color={getTheme().secondaryText} dimColor>
                  /
                </Text>
                <Text color={getTheme().primary}>
                  {command.userFacingName()}
                </Text>
                <Text> {s.name}</Text>
              </Text>

              {s.description && (
                <Text color={getTheme().secondaryText} dimColor>
                  — {s.description}
                </Text>
              )}
            </Box>
          );
        })}

        {end < items.length && (
          <Text color={getTheme().secondaryText} dimColor>
            ↓ more
          </Text>
        )}
      </Box>
    );
  }

  return null;
}

export function getMatchingCommands(query: string): Command[] {
  if (!query.startsWith("/")) return [];

  const parts = query.slice(1).split(" ");
  const base = parts[0]?.toLowerCase() ?? "";
  const sub = parts[1]?.toLowerCase();

  const commands = getCommands().filter((c) => !c.isHidden);

  if (parts.length === 1) {
    return commands.filter(
      (c) =>
        c.userFacingName().startsWith(base) ||
        c.aliases?.some((a) => a.startsWith(base)),
    );
  }

  const cmd = commands.find(
    (c) => c.userFacingName() === base || c.aliases?.includes(base),
  );

  if (!cmd || !cmd.subcommands) return [];

  return cmd.subcommands
    .filter((s) => !sub || s.name.startsWith(sub))
    .map((s) => ({
      ...cmd,
      userFacingName: () => `${cmd.userFacingName()} ${s.name}`,
      description: s.description,
    })) as any;
}
