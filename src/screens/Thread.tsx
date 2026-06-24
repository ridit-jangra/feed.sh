import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import type { Post } from "../types";
import type { Profile } from "../db/profiles";

export function Thread({
  parent,
  replies,
  authorProfiles,
  currentUserId,
  composing,
  replyValue,
  replyOffset,
  setReplyValue,
  setReplyOffset,
  onSubmitReply,
  onCancelReply,
  columns,
  TextInput,
}: {
  parent: Post;
  replies: Post[];
  authorProfiles: Map<string, Profile>;
  currentUserId: string | null;
  composing: boolean;
  replyValue: string;
  replyOffset: number;
  setReplyValue: (v: string) => void;
  setReplyOffset: (n: number) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  columns: number;
  TextInput: any;
}) {
  const theme = getTheme();

  const label = (authorId: string) => {
    if (authorId === currentUserId) return "you";
    const a = authorProfiles.get(authorId);
    return a ? `@${a.handle}` : "…";
  };

  return (
    <Box flexDirection="column" paddingX={1} gap={0}>
      <Text bold color={theme.primary}>
        {label(parent.authorId)}
      </Text>
      {parent.title && (
        <Text bold color={theme.text}>
          {parent.title}
        </Text>
      )}
      {parent.content.split("\n").map((l, i) => (
        <Text key={`p-${i}`}>{l}</Text>
      ))}
      <Text color={theme.secondaryText}>
        ♥ {parent.likes} ↳ {parent.replies}
      </Text>

      <Text color={theme.secondaryText}>────────────────────────────</Text>

      {replies.length === 0 ? (
        <Text color={theme.secondaryText}>no replies yet</Text>
      ) : (
        replies.map((r) => (
          <Box key={r.id} flexDirection="column" marginBottom={1}>
            <Text bold color={theme.secondary}>
              {label(r.authorId)}
            </Text>
            {r.content.split("\n").map((l, i) => (
              <Text key={`${r.id}-${i}`}>{l}</Text>
            ))}
          </Box>
        ))
      )}

      {composing ? (
        <Box marginTop={1}>
          <Text color={theme.primary}>{"↳ "}</Text>
          <TextInput
            value={replyValue}
            onChange={setReplyValue}
            columns={columns - 4}
            cursorOffset={replyOffset}
            onChangeCursorOffset={setReplyOffset}
            focus={true}
            placeholder="write a reply..."
            onSubmit={onSubmitReply}
            onEscape={onCancelReply}
          />
        </Box>
      ) : (
        <Text color={theme.secondaryText}>r: reply · esc / feed: back</Text>
      )}
    </Box>
  );
}
