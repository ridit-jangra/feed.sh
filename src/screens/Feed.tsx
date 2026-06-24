// src/screens/Feed.tsx
import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import type { Post } from "../types";
import type { Profile } from "../db/profiles";

export function Feed({
  posts,
  scrollTop,
  viewportHeight,
  currentUserId,
  authorProfiles,
  selectedPostIndex,
}: {
  posts: Post[];
  scrollTop: number;
  viewportHeight: number;
  currentUserId: string | null;
  authorProfiles: Map<string, Profile>;
  selectedPostIndex: number;
}) {
  const theme = getTheme();
  const lines: React.JSX.Element[] = [];

  posts.forEach((p, postIndex) => {
    const isSelected = postIndex === selectedPostIndex;
    const isMine = p.authorId === currentUserId;
    const author = authorProfiles.get(p.authorId);
    const label = isMine ? "you" : author ? `@${author.handle}` : "…";

    // author line (with selection marker)
    lines.push(
      <Text
        key={`${p.id}-author`}
        bold
        color={isSelected ? theme.primary : theme.primary}
      >
        {isSelected ? "▸ " : "  "}
        {label}
      </Text>,
    );

    // title
    if (p.title) {
      lines.push(
        <Text key={`${p.id}-title`} bold color={theme.text}>
          {"  "}
          {p.title}
        </Text>,
      );
    }

    // content
    p.content
      .split("\n")
      .forEach((l, i) =>
        lines.push(<Text key={`${p.id}-line-${i}`}>{"  " + l}</Text>),
      );

    // meta: likes + replies
    lines.push(
      <Text key={`${p.id}-meta`} color={theme.secondaryText}>
        {"  ♥ "}
        {p.likes}
        {"   ↳ "}
        {p.replies}
      </Text>,
    );

    // gap
    lines.push(<Text key={`${p.id}-gap`}> </Text>);
  });

  const visible = lines.slice(scrollTop, scrollTop + viewportHeight);

  return (
    <Box flexDirection="column" height={viewportHeight} paddingX={1}>
      {visible}
    </Box>
  );
}
