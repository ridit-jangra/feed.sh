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
}: {
  posts: Post[];
  scrollTop: number;
  viewportHeight: number;
  currentUserId: string | null;
  authorProfiles: Map<string, Profile>;
}) {
  const theme = getTheme();
  const lines: React.JSX.Element[] = [];

  posts.forEach((p) => {
    const isMine = p.authorId === currentUserId;
    const author = authorProfiles.get(p.authorId);
    const label = isMine ? "you" : author ? `@${author.handle}` : "…"; // not resolved yet

    lines.push(
      <Text key={`${p.id}-author`} bold color={theme.primary}>
        {label}
      </Text>,
    );

    if (p.title) {
      lines.push(
        <Text key={`${p.id}-title`} bold color={theme.text}>
          {p.title}
        </Text>,
      );
    }

    p.content
      .split("\n")
      .forEach((l, i) =>
        lines.push(<Text key={`${p.id}-line-${i}`}>{l}</Text>),
      );

    lines.push(<Text key={`${p.id}-gap`}> </Text>);
  });

  const visible = lines.slice(scrollTop, scrollTop + viewportHeight);

  return (
    <Box flexDirection="column" height={viewportHeight} paddingX={1}>
      {visible}
    </Box>
  );
}
