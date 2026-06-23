import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Feed } from "./screens/Feed";
import TextInput from "./components/TextInput";
import { getTheme } from "./utils/theme";
import { useTerminalSize } from "./hooks/useTerminalSize";
import { getFeed, createPost, search } from "./db/store";
import { pointer } from "./utils/icons";
import { useRotatingPlaceholder } from "./hooks/useRotatingPlaceholder";
import { findShortcut } from "./utils/shortcuts";
import {
  CommandSuggestions,
  getMatchingCommands,
} from "./components/CommandSuggestions";
import type { Post } from "./types";
import { useMouseWheel } from "./hooks/useMouseWheel";

export function App() {
  const { columns, rows } = useTerminalSize();
  const [value, setValue] = useState("");
  const [cursorOffset, setCursorOffset] = useState(0);
  const [posts, setPosts] = useState<Post[]>(() => getFeed());
  const [scrollTop, setScrollTop] = useState(0);
  const [lastTypedInput, setLastTypedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const INPUT_RESERVED = 2;
  const viewportHeight = rows - INPUT_RESERVED;
  const placeholder = useRotatingPlaceholder(value.length === 0);

  const totalLines = posts.reduce(
    (n, p) => n + 2 + p.content.split("\n").length,
    0,
  );
  const maxScroll = Math.max(0, totalLines - viewportHeight);

  useEffect(() => {
    setScrollTop(maxScroll);
  }, [maxScroll]);

  function onSubmit(input: string) {
    if (!input.trim()) return;
    setValue("");
    setCursorOffset(0);
  }

  function onHistoryUp() {
    if (historyIndex < history.length) {
      if (historyIndex === 0 && value.trim() !== "") {
        setLastTypedInput(value);
      }
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const entry = history[historyIndex] ?? "";
      setValue(entry);
      setCursorOffset(entry.length);
    }
  }

  function onHistoryDown() {
    if (historyIndex > 1) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const entry = history[newIndex - 1] ?? "";
      setValue(entry);
      setCursorOffset(entry.length);
    } else if (historyIndex === 1) {
      setHistoryIndex(0);
      setValue(lastTypedInput);
      setCursorOffset(lastTypedInput.length);
    }
  }

  function onHistoryReset() {
    setHistoryIndex(0);
    setLastTypedInput("");
  }

  useInput(
    (input, key) => {
      if (key.tab && value.startsWith("/")) {
        const matches = getMatchingCommands(value);
        if (matches.length === 0) return;
        const match = matches[selectedIndex] ?? matches[0];
        if (match) {
          const completed = "/" + match.userFacingName() + " ";
          setValue(completed);
          setCursorOffset(completed.length);
        }
      }
      if (key.upArrow && value.startsWith("/")) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }
      if (key.downArrow && value.startsWith("/")) {
        const matches = getMatchingCommands(value);
        setSelectedIndex((i) => Math.min(matches.length - 1, i + 1));
      }
      const shortcut = findShortcut(input, key);
      if (shortcut) {
        shortcut.action();
      }
    },
    { isActive: !loading },
  );

  const handleWheel = useCallback(
    (dir: "up" | "down") => {
      setScrollTop((s) =>
        dir === "up" ? Math.max(0, s - 3) : Math.min(maxScroll, s + 3),
      );
    },
    [maxScroll],
  );

  useMouseWheel(handleWheel);

  return (
    <Box flexDirection="column" height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        <Feed
          posts={posts}
          scrollTop={scrollTop}
          viewportHeight={viewportHeight}
        />
      </Box>
      <Box paddingX={1}>
        <CommandSuggestions query={value} selectedIndex={selectedIndex} />
        <Text color={getTheme().primary}>{pointer} </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
          onExit={() => process.exit(0)}
          columns={columns - 6}
          cursorOffset={cursorOffset}
          onChangeCursorOffset={setCursorOffset}
          placeholder={placeholder}
          // isDimmed={loading}
          onHistoryUp={onHistoryUp}
          onHistoryDown={onHistoryDown}
          onHistoryReset={onHistoryReset}
          // onEscape={abort}
          highlightPastedText={true}
        />
      </Box>
    </Box>
  );
}
