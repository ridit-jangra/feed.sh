import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Feed } from "./screens/Feed";
import TextInput from "./components/TextInput";
import { getTheme } from "./utils/theme";
import { useTerminalSize } from "./hooks/useTerminalSize";
import { pointer } from "./utils/icons";
import { findShortcut } from "./utils/shortcuts";
import { getMatchingCommands } from "./components/CommandSuggestions";
import type { Post } from "./types";
import { useMouseWheel } from "./hooks/useMouseWheel";

export function App() {
  const { columns, rows } = useTerminalSize();
  const [value, setValue] = useState("");
  const [cursorOffset, setCursorOffset] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [lastTypedInput, setLastTypedInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setPosts([
      {
        id: "1",
        authorId: "ridit",
        content: `# Day 47 of Pixl

Today was mostly cleanup.

- Rewrote movement system
- Fixed inventory bugs
- Added save slots`,
        createdAt: new Date(),
        likes: 14,
        replies: 3,
      },
      {
        id: "2",
        authorId: "gabin",
        content: `accidentally deleted production

we are so back`,
        createdAt: new Date(),
        likes: 42,
        replies: 9,
      },
      {
        id: "3",
        authorId: "jam",
        content: `first external playtester today 😭

they somehow found 3 bugs within 5 minutes`,
        createdAt: new Date(),
        likes: 23,
        replies: 4,
      },
      {
        id: "4",
        authorId: "ridit",
        content: `# Day 48 of Pixl

spent the whole day on the lighting system and i have regrets.

what i thought would take an afternoon:
- add a single point light to the player
- make it flicker a bit

what actually happened:
- rewrote the renderer to support multiple lights
- discovered my tilemap had no concept of "occlusion"
- built a tiny shadowcasting pass at 2am
- it looked terrible
- deleted it
- read three blog posts about 2d lighting
- reimplemented it slightly less terribly

the lesson, as always, is that there are no small features. only features that have not yet revealed their true size.

anyway it glows now. ship it.`,
        createdAt: new Date(),
        likes: 87,
        replies: 12,
      },
      {
        id: "5",
        authorId: "gabin",
        content: `hot take: most "performance problems" are just someone doing work in a loop that didn't need to be in a loop

profiled our build today. one function was 60% of the time. it was sorting an already-sorted array. inside a render. every frame.

we are still so back though`,
        createdAt: new Date(),
        likes: 156,
        replies: 28,
      },
      {
        id: "6",
        authorId: "noa",
        content: `wrote my first shader today and i finally understand why graphics people talk the way they do

you don't write a shader. you whisper a suggestion to the GPU and it does something adjacent to what you meant. then you change one number and the screen turns into a pink void. then you change it back and it's fine. nobody knows why. this is the craft.`,
        createdAt: new Date(),
        likes: 64,
        replies: 7,
      },
      {
        id: "7",
        authorId: "jam",
        content: `playtest round 2

took everything the testers said and rebuilt the tutorial from scratch. new flow:

1. you wake up in the cave (unchanged, people liked it)
2. removed the wall of text, now you learn by doing
3. movement → first enemy → first chest, all in 90 seconds
4. no more "press X to read the lore book" in the first minute

watched a new tester go through it and they didn't get stuck once. then they immediately walked off a cliff i forgot to add a railing to. progress!`,
        createdAt: new Date(),
        likes: 91,
        replies: 15,
      },
      {
        id: "8",
        authorId: "milo",
        content: `reminder that "it works on my machine" is just a distributed systems problem with a sample size of one`,
        createdAt: new Date(),
        likes: 203,
        replies: 19,
      },
      {
        id: "9",
        authorId: "noa",
        content: `audio pass today. added footsteps, ambient cave drips, and a little sting when you pick something up.

never underestimate sound. the game felt 40% more finished and i did not touch a single pixel. just added three wav files and suddenly it has a soul.`,
        createdAt: new Date(),
        likes: 78,
        replies: 6,
      },
      {
        id: "10",
        authorId: "ridit",
        content: `# Day 49 of Pixl

save system rewrite, part 2.

yesterday's "added save slots" was a lie. it saved everything except the one thing players actually care about: where they were standing. quietly shipped a build that loads you back into the title screen with all your items and zero context. several people thought it was a feature.

today: actually serialize the world state. player position, inventory, opened chests, defeated enemies, current quest flags. wrote a migration so old saves don't explode. tested it by saving, quitting, and reloading roughly forty times until i trusted it.

it works now. for real this time. probably.`,
        createdAt: new Date(),
        likes: 112,
        replies: 21,
      },
    ]);
  }, []);

  const INPUT_RESERVED = 2;
  const viewportHeight = rows - INPUT_RESERVED;

  const totalLines = posts.reduce(
    (n, p) => n + 2 + p.content.split("\n").length,
    0,
  );
  const maxScroll = Math.max(0, totalLines - viewportHeight);

  // Anchor the feed to the bottom (newest posts) on load and whenever the
  // content height or viewport changes.
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
        <Text color={getTheme().primary}>{pointer} </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
          onExit={() => process.exit(0)}
          columns={columns - 6}
          cursorOffset={cursorOffset}
          onChangeCursorOffset={setCursorOffset}
          placeholder="ask milo anything..."
          // isDimmed={loading}
          onHistoryUp={onHistoryUp}
          onHistoryDown={onHistoryDown}
          onHistoryReset={onHistoryReset}
          // onEscape={abort}
          // highlightPastedText={true}
        />
      </Box>
    </Box>
  );
}
