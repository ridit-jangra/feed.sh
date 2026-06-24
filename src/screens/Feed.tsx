import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import type { Focus, Post } from "../types";
import type { Profile } from "../db/profiles";
import { comment, heart, pointer } from "../utils/icons";
import { applyMarkdown } from "../utils/markdown";

type Props = {
  posts: Post[];
  scrollTop: number;
  viewportHeight: number;
  currentUserId: string | null;
  authorProfiles: Map<string, Profile>;
  selectedPostIndex: number;
  focus: Focus;
  setFocus: (f: Focus) => void;
};

export function Feed({
  posts,
  scrollTop,
  viewportHeight,
  currentUserId,
  authorProfiles,
  selectedPostIndex,
  focus,
}: Props) {
  const theme = getTheme();
  const lines: React.JSX.Element[] = [];

  posts.forEach((p, postIndex) => {
    const isSelected = postIndex === selectedPostIndex;
    const isMine = p.authorId === currentUserId;
    const author = authorProfiles.get(p.authorId);
    const label = isMine ? "you" : author ? `@${author.handle}` : "…";

    lines.push(
      <Text
        key={`${p.id}-author`}
        bold
        color={isSelected ? theme.primary : theme.primary}
      >
        {focus == "feed" && isSelected ? pointer + " " : "  "}
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
        lines.push(<Text key={`${p.id}-line-${i}`}>{applyMarkdown(l)}</Text>),
      );

    lines.push(
      <Box key={`${p.id}-meta`}>
        <Text color={theme.error}>{heart + " "}</Text>
        <Text>{p.likes}</Text>
        <Text color={theme.success}>{"    " + comment + " "}</Text>
        <Text>{p.replies}</Text>
      </Box>,
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
