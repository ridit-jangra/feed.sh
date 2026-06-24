import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Feed } from "./screens/Feed";
import { Create } from "./screens/Create";
import { Login } from "./screens/Login";
import { Setup } from "./screens/Setup";
import TextInput from "./components/TextInput";
import { getTheme } from "./utils/theme";
import { useTerminalSize } from "./hooks/useTerminalSize";
import { getFeed, createPost, search } from "./db/posts";
import { getMyProfile, getProfileByHandle, getProfiles } from "./db/profiles";
import { getSession } from "./utils/auth";
import { pointer } from "./utils/icons";
import { useRotatingPlaceholder } from "./hooks/useRotatingPlaceholder";
import { findShortcut } from "./utils/shortcuts";
import {
  CommandSuggestions,
  getMatchingCommands,
} from "./components/CommandSuggestions";
import type { Post } from "./types";
import type { Profile, ProfileWithStats } from "./db/profiles";
import type { User } from "@supabase/supabase-js";
import { useMouseWheel } from "./hooks/useMouseWheel";
import { ProfileView } from "./screens/ProfileView";

export function App() {
  const { columns, rows } = useTerminalSize();
  const theme = getTheme();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);

  const [value, setValue] = useState("");
  const [cursorOffset, setCursorOffset] = useState(0);
  const [lastTypedInput, setLastTypedInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [screen, setScreen] = useState<"feed" | "create" | "profile">("feed");
  const [viewedProfile, setViewedProfile] = useState<ProfileWithStats | null>(
    null,
  );
  const [viewedNotFound, setViewedNotFound] = useState(false);
  const [viewedQuery, setViewedQuery] = useState("");
  const [focus, setFocus] = useState<"command" | "title" | "content">(
    "command",
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [authorProfiles, setAuthorProfiles] = useState<Map<string, Profile>>(
    new Map(),
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const placeholder = useRotatingPlaceholder(value.length === 0);

  const INPUT_RESERVED = 2;
  const viewportHeight = rows - INPUT_RESERVED;

  const totalLines = posts.reduce(
    (n, p) => n + 2 + (p.title ? 1 : 0) + p.content.split("\n").length,
    0,
  );
  const maxScroll = Math.max(0, totalLines - viewportHeight);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        const u = session?.user ?? null;
        if (cancelled) return;
        setUser(u);

        if (u) {
          const p = await getMyProfile().catch((e) => {
            console.error("profile check failed", e);
            return null;
          });
          if (cancelled) return;
          setProfile(p);
        }
      } catch (e) {
        console.error("boot failed", e);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (booting || !user || profile) return;
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => console.error("profile check failed", e));
    return () => {
      cancelled = true;
    };
  }, [user, booting, profile]);

  useEffect(() => {
    if (!profile) return;
    setFeedLoading(true);
    getFeed()
      .then(setPosts)
      .catch((e) => console.error("feed load failed", e))
      .finally(() => setFeedLoading(false));
  }, [profile]);

  useEffect(() => {
    if (posts.length === 0) return;
    const ids = [...new Set(posts.map((p) => p.authorId))];
    getProfiles(ids)
      .then(setAuthorProfiles)
      .catch((e) => console.error("author resolve failed", e));
  }, [posts]);

  useEffect(() => {
    setScrollTop(maxScroll);
  }, [maxScroll]);

  async function onSubmit(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;
    const cmd = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

    try {
      if (cmd === "create") {
        setScreen("create");
        setFocus("title");
      } else if (cmd === "done" && screen === "create") {
        if (content.trim() || title.trim()) {
          const newPost = await createPost(title.trim() || null, content);
          setPosts((prev) => [newPost, ...prev]);
        }
        setTitle("");
        setContent("");
        setFocus("command");
        setScreen("feed");
      } else if (cmd === "profile" || cmd.startsWith("profile ")) {
        const arg = cmd.slice("profile".length).trim();
        const handle = arg ? arg : profile!.handle;
        setViewedQuery(handle);
        setViewedNotFound(false);
        setViewedProfile(null);
        setScreen("profile");
        try {
          const found = await getProfileByHandle(handle);
          if (found) setViewedProfile(found);
          else setViewedNotFound(true);
        } catch (e) {
          console.error("profile lookup failed", e);
          setViewedNotFound(true);
        }
      } else if (cmd === "feed") {
        setPosts(await getFeed());
        setScreen("feed");
      } else if (cmd.startsWith("search ")) {
        setPosts(await search(cmd.slice("search ".length)));
        setScreen("feed");
      }
    } catch (e) {
      console.error("command failed", e);
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
    {
      isActive:
        !!profile && !loading && screen === "feed" && focus === "command",
    },
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

  if (booting) {
    return <Text color={theme.secondaryText}>…</Text>;
  }

  if (!user) {
    return (
      <Box flexDirection="column" height={rows}>
        <Login columns={columns} onAuthed={(_s, u) => setUser(u)} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box flexDirection="column" height={rows}>
        <Setup columns={columns} onDone={setProfile} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={rows}>
      <Box flexDirection="column" flexGrow={1}>
        {screen === "feed" ? (
          feedLoading ? (
            <Box paddingX={1}>
              <Text color={theme.secondaryText}>loading feed…</Text>
            </Box>
          ) : (
            <Feed
              posts={posts}
              scrollTop={scrollTop}
              viewportHeight={viewportHeight}
              currentUserId={user.id}
              authorProfiles={authorProfiles}
            />
          )
        ) : screen === "create" ? (
          <Create
            columns={columns}
            focus={focus}
            setFocus={setFocus}
            title={title}
            setTitle={setTitle}
            content={content}
            setContent={setContent}
          />
        ) : (
          <ProfileView
            profile={viewedProfile}
            isMe={viewedProfile?.id === user.id}
            notFound={viewedNotFound}
            query={viewedQuery}
          />
        )}
      </Box>

      <Box paddingX={1}>
        <CommandSuggestions query={value} selectedIndex={selectedIndex} />
        <Text color={theme.primary}>{pointer} </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
          onExit={() => process.exit(0)}
          columns={columns - 6}
          cursorOffset={cursorOffset}
          onChangeCursorOffset={setCursorOffset}
          placeholder={placeholder}
          focus={screen === "feed" || focus === "command"}
          onHistoryUp={onHistoryUp}
          onHistoryDown={onHistoryDown}
          onHistoryReset={onHistoryReset}
          highlightPastedText={true}
        />
      </Box>
    </Box>
  );
}
