import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "../components/TextInput";
import { getTheme } from "../utils/theme";
import type { Focus } from "../types";

type Props = {
  columns: number;
  focus: Focus;
  setFocus: (f: Focus) => void;
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
};

export function Create({
  columns,
  focus,
  setFocus,
  title,
  setTitle,
  content,
  setContent,
}: Props) {
  const [titleOffset, setTitleOffset] = useState(0);
  const [contentOffset, setContentOffset] = useState(0);
  const theme = getTheme();

  return (
    <Box flexDirection="column" paddingX={1} gap={1}>
      <Text bold color={theme.primary}>
        New post
      </Text>

      <Box flexDirection="column">
        <Text color={theme.secondaryText}>Title</Text>
        <Box>
          <Text color={focus === "title" ? theme.primary : theme.secondaryText}>
            {"› "}
          </Text>
          <TextInput
            value={title}
            onChange={setTitle}
            columns={columns - 4}
            cursorOffset={titleOffset}
            onChangeCursorOffset={setTitleOffset}
            focus={focus === "title"}
            onHistoryDown={() => setFocus("content")}
            placeholder="post title..."
            onSubmit={() => setFocus("content")}
            onEscape={() => setFocus("command")}
            clearOnEscape={false}
          />
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text color={theme.secondaryText}>Content</Text>
        <Box
          borderStyle="round"
          borderColor={
            focus === "content" ? theme.primary : theme.secondaryText
          }
          paddingX={1}
        >
          <TextInput
            value={content}
            onChange={setContent}
            columns={columns - 4}
            cursorOffset={contentOffset}
            onChangeCursorOffset={setContentOffset}
            focus={focus === "content"}
            multiline
            enterInsertsNewline
            clearOnEscape={false}
            placeholder="write something..."
            onEscape={() => setFocus("command")}
            onHistoryUp={() => setFocus("title")}
          />
        </Box>
      </Box>

      <Text color={theme.secondaryText}>
        {focus === "content"
          ? "enter: new line · esc: back to command"
          : focus === "title"
            ? "enter: go to content · esc: back to command"
            : "type 'done' to post · 'create' fields above"}
      </Text>
    </Box>
  );
}
