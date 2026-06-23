import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import type { Post } from "../types";

export function Feed({
  posts,
  scrollTop,
  viewportHeight,
}: {
  posts: Post[];
  scrollTop: number;
  viewportHeight: number;
}) {
  const lines: React.JSX.Element[] = [];
  posts.forEach((p) => {
    lines.push(
      <Text key={`${p.id}-author`} bold color={getTheme().primary}>
        {p.authorId}
      </Text>,
    );
    p.content
      .split("\n")
      .forEach((l, i) =>
        lines.push(<Text key={`${p.id}-line-${i}`}>{l}</Text>),
      );
    lines.push(<Text key={`${p.id}-gap`}> </Text>);
  });

  const visible = lines.slice(scrollTop, scrollTop + viewportHeight);

  return (
    <Box
      flexDirection="column"
      justifyContent="flex-end"
      height={viewportHeight}
      paddingX={1}
    >
      {visible}
    </Box>
  );
}
