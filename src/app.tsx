import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Feed } from "./screens/Feed";
import { Create } from "./screens/Create";
import type { User } from "@supabase/supabase-js";
import TextInput from "./components/TextInput";
import { getSession } from "./utils/auth";
import { Login } from "./screens/Login";
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
import type { Focus, Post } from "./types";
import { useMouseWheel } from "./hooks/useMouseWheel";

export function App() {
  const { columns, rows } = useTerminalSize();
  const [value, setValue] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [cursorOffset, setCursorOffset] = useState(0);
  const [focus, setFocus] = useState<Focus>("command");
  const [screen, setScreen] = useState<"feed" | "create">("feed");
  const [posts, setPosts] = useState<Post[]>(() => getFeed());
  const [scrollTop, setScrollTop] = useState(0);
  const [lastTypedInput, setLastTypedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentFocused, setContentFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
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

  useEffect(() => {
    getSession().then((session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
  }, []);

  function onSubmit(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    const cmd = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

    if (cmd === "create") {
      setScreen("create");
      setFocus("title");
    } else if (cmd === "done" && screen === "create") {
      const body = title.trim() ? `# ${title.trim()}\n${content}` : content;
      if (content.trim() || title.trim()) {
        createPost(user!.id, title.trim() || null, content);
        setPosts(getFeed());
      }
      setTitle("");
      setContent("");
      setFocus("command");
      setScreen("feed");
    } else if (cmd === "feed") {
      setScreen("feed");
      setPosts(getFeed());
    } else if (cmd.startsWith("search ")) {
      setPosts(search(cmd.slice("search ".length)));
      setScreen("feed");
    }

    setHistory((h) => [...h, trimmed]);
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
      if (key.escape && screen !== "feed") {
        setScreen("feed");
        return;
      }
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
    { isActive: !loading && screen === "feed" },
  );

  const handleWheel = useCallback(
    (dir: "up" | "down") => {
      if (screen !== "feed") return;
      setScrollTop((s) =>
        dir === "up" ? Math.max(0, s - 3) : Math.min(maxScroll, s + 3),
      );
    },
    [maxScroll, screen],
  );

  useMouseWheel(handleWheel);

  if (!authChecked) {
    return <Text color={getTheme().secondaryText}>…</Text>;
  }

  if (!user) {
    return (
      <Box flexDirection="column" height={rows}>
        <Login columns={columns} onAuthed={(_s, u) => setUser(u)} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        {screen === "feed" ? (
          <Feed
            posts={posts}
            scrollTop={scrollTop}
            viewportHeight={viewportHeight}
            currentUserId={user.id}
          />
        ) : (
          <Create
            columns={columns}
            focus={focus}
            setFocus={setFocus}
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
          />
        )}
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
          focus={focus === "command"}
          onHistoryDown={onHistoryDown}
          onHistoryReset={onHistoryReset}
          // onEscape={abort}
          highlightPastedText={true}
        />
      </Box>
    </Box>
  );
}
