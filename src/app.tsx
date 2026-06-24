// src/App.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Feed } from "./screens/Feed";
import { Create } from "./screens/Create";
import { Login } from "./screens/Login";
import { Setup } from "./screens/Setup";
import { ProfileView } from "./screens/ProfileView";
import { Thread } from "./screens/Thread";
import TextInput from "./components/TextInput";
import { getTheme } from "./utils/theme";
import { useTerminalSize } from "./hooks/useTerminalSize";
import {
  getFeed,
  createPost,
  search,
  toggleLike,
  getReplies,
  createReply,
} from "./db/posts";
import { getMyProfile, getProfiles, getProfileByHandle } from "./db/profiles";
import { getSession } from "./utils/auth";
import { pointer } from "./utils/icons";
import { useRotatingPlaceholder } from "./hooks/useRotatingPlaceholder";
import { useRealtimeFeed } from "./hooks/useRealtimeFeed";
import { findShortcut } from "./utils/shortcuts";
import {
  CommandSuggestions,
  getMatchingCommands,
} from "./components/CommandSuggestions";
import type { Post } from "./types";
import type { Profile, ProfileWithStats } from "./db/profiles";
import type { User } from "@supabase/supabase-js";
import { useMouseWheel } from "./hooks/useMouseWheel";

export function App() {
  const { columns, rows } = useTerminalSize();
  const theme = getTheme();

  // --- auth + profile ---
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);

  // --- input / command bar ---
  const [value, setValue] = useState("");
  const [cursorOffset, setCursorOffset] = useState(0);
  const [lastTypedInput, setLastTypedInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [screen, setScreen] = useState<
    "feed" | "create" | "profile" | "thread"
  >("feed");
  const [focus, setFocus] = useState<"command" | "title" | "content">(
    "command",
  );

  // --- feed ---
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [authorProfiles, setAuthorProfiles] = useState<Map<string, Profile>>(
    new Map(),
  );

  // --- profile view ---
  const [viewedProfile, setViewedProfile] = useState<ProfileWithStats | null>(
    null,
  );
  const [viewedNotFound, setViewedNotFound] = useState(false);
  const [viewedQuery, setViewedQuery] = useState("");

  // --- thread / replies ---
  const [threadParent, setThreadParent] = useState<Post | null>(null);
  const [threadReplies, setThreadReplies] = useState<Post[]>([]);
  const [composingReply, setComposingReply] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [replyOffset, setReplyOffset] = useState(0);

  // --- compose form ---
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const placeholder = useRotatingPlaceholder(value.length === 0);

  const INPUT_RESERVED = 2;
  const viewportHeight = rows - INPUT_RESERVED;

  // author + title + content + meta + gap
  const totalLines = posts.reduce(
    (n, p) => n + 3 + (p.title ? 1 : 0) + p.content.split("\n").length,
    0,
  );
  const maxScroll = Math.max(0, totalLines - viewportHeight);

  // --- boot: session → user → profile ---
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

  // fresh login post-boot → check profile
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

  // load feed once onboarded
  useEffect(() => {
    if (!profile) return;
    setFeedLoading(true);
    getFeed()
      .then(setPosts)
      .catch((e) => console.error("feed load failed", e))
      .finally(() => setFeedLoading(false));
  }, [profile]);

  // resolve author handles when posts/replies change
  useEffect(() => {
    const ids = [
      ...new Set([
        ...posts.map((p) => p.authorId),
        ...threadReplies.map((r) => r.authorId),
        ...(threadParent ? [threadParent.authorId] : []),
      ]),
    ];
    if (ids.length === 0) return;
    getProfiles(ids)
      .then((m) => setAuthorProfiles((prev) => new Map([...prev, ...m])))
      .catch((e) => console.error("author resolve failed", e));
  }, [posts, threadReplies, threadParent]);

  // keep selection in range
  useEffect(() => {
    setSelectedPostIndex((i) => Math.min(i, Math.max(0, posts.length - 1)));
  }, [posts.length]);

  // pin scroll to bottom
  useEffect(() => {
    setScrollTop(maxScroll);
  }, [maxScroll]);

  // --- realtime ---
  const handleNewPost = useCallback((row: any) => {
    const post: Post = {
      id: row.id,
      authorId: row.author_id,
      title: row.title,
      content: row.content,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      likes: 0,
      replies: 0,
    };
    setPosts((prev) =>
      prev.some((p) => p.id === post.id) ? prev : [post, ...prev],
    );
  }, []);

  const handleLikeChange = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes: Math.max(0, p.likes + delta) } : p,
      ),
    );
  }, []);

  const myId = user?.id;
  const handleNewReply = useCallback(
    (row: any) => {
      const reply: Post = {
        id: row.id,
        authorId: row.author_id,
        title: row.title,
        content: row.content,
        parentId: row.parent_id,
        createdAt: new Date(row.created_at),
        likes: 0,
        replies: 0,
      };
      setThreadParent((parent) => {
        if (parent && row.parent_id === parent.id) {
          setThreadReplies((prev) =>
            prev.some((r) => r.id === reply.id) ? prev : [...prev, reply],
          );
        }
        return parent;
      });
      // skip own — already bumped locally in onSubmitReply
      if (row.author_id !== myId) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === row.parent_id ? { ...p, replies: p.replies + 1 } : p,
          ),
        );
      }
    },
    [myId],
  );

  useRealtimeFeed(handleNewPost, handleLikeChange, handleNewReply);

  // --- commands ---
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
          setPosts((prev) =>
            prev.some((p) => p.id === newPost.id) ? prev : [newPost, ...prev],
          );
        }
        setTitle("");
        setContent("");
        setFocus("command");
        setScreen("feed");
      } else if (cmd === "feed") {
        setPosts(await getFeed());
        setScreen("feed");
      } else if (cmd.startsWith("search ")) {
        setPosts(await search(cmd.slice("search ".length)));
        setScreen("feed");
      } else if (cmd === "profile" || cmd.startsWith("profile ")) {
        const arg = cmd.slice("profile".length).trim();
        const handle = arg ? arg : profile!.handle;
        setViewedQuery(handle);
        setViewedNotFound(false);
        setViewedProfile(null);
        setScreen("profile");
        const found = await getProfileByHandle(handle).catch(() => null);
        if (found) setViewedProfile(found);
        else setViewedNotFound(true);
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

  // --- reply composer handlers ---
  async function onSubmitReply() {
    if (!threadParent || !replyValue.trim()) {
      setComposingReply(false);
      return;
    }
    try {
      const reply = await createReply(threadParent.id, replyValue.trim());
      setThreadReplies((prev) =>
        prev.some((r) => r.id === reply.id) ? prev : [...prev, reply],
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === threadParent.id ? { ...p, replies: p.replies + 1 } : p,
        ),
      );
    } catch (e) {
      console.error("reply failed", e);
    }
    setReplyValue("");
    setReplyOffset(0);
    setComposingReply(false);
  }

  function onCancelReply() {
    setReplyValue("");
    setReplyOffset(0);
    setComposingReply(false);
  }

  // --- feed-screen input: select, like, open thread ---
  useInput(
    (input, key) => {
      if (screen === "feed" && value === "") {
        if (key.upArrow) {
          setSelectedPostIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (key.downArrow) {
          setSelectedPostIndex((i) => Math.min(posts.length - 1, i + 1));
          return;
        }
        if (input === "l") {
          const post = posts[selectedPostIndex];
          if (post)
            toggleLike(post.id).catch((e) => console.error("like failed", e));
          return;
        }
        if (input === "r") {
          const post = posts[selectedPostIndex];
          if (post) {
            setThreadParent(post);
            setThreadReplies([]);
            setComposingReply(false);
            setScreen("thread");
            getReplies(post.id)
              .then(setThreadReplies)
              .catch((e) => console.error("replies load failed", e));
          }
          return;
        }
      }

      // command autocomplete
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
      if (shortcut) shortcut.action();
    },
    {
      isActive:
        !!profile && !loading && screen === "feed" && focus === "command",
    },
  );

  // --- thread-screen input: reply / back ---
  useInput(
    (input, key) => {
      if (composingReply) return;
      if (input === "r") {
        setComposingReply(true);
        return;
      }
      if (key.escape) {
        setScreen("feed");
        setThreadParent(null);
      }
    },
    { isActive: screen === "thread" && !composingReply },
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

  // --- render gates ---

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
              selectedPostIndex={selectedPostIndex}
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
        ) : screen === "thread" && threadParent ? (
          <Thread
            parent={threadParent}
            replies={threadReplies}
            authorProfiles={authorProfiles}
            currentUserId={user.id}
            composing={composingReply}
            replyValue={replyValue}
            replyOffset={replyOffset}
            setReplyValue={setReplyValue}
            setReplyOffset={setReplyOffset}
            onSubmitReply={onSubmitReply}
            onCancelReply={onCancelReply}
            columns={columns}
            TextInput={TextInput}
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
          focus={(screen === "feed" || focus === "command") && !composingReply}
          onHistoryUp={onHistoryUp}
          onHistoryDown={onHistoryDown}
          onHistoryReset={onHistoryReset}
          highlightPastedText={true}
        />
      </Box>
    </Box>
  );
}
