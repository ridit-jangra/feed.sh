import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import type { Focus, Post } from "../types";
import type { Profile } from "../db/profiles";
import { comment, heart, pointer } from "../utils/icons";
import { applyMarkdown } from "../utils/markdown";

type Props = {
  posts: Post[];
  topPost: number;
  viewportHeight: number;
  currentUserId: string | null;
  authorProfiles: Map<string, Profile>;
  selectedPostIndex: number;
  focus: Focus;
  setFocus: (f: Focus) => void;
};

export function Feed({
  posts,
  topPost,
  viewportHeight,
  currentUserId,
  authorProfiles,
  selectedPostIndex,
  focus,
}: Props) {
  const theme = getTheme();
  const budget = viewportHeight - 1;
  const lines: React.JSX.Element[] = [];
  let used = 0;

  for (let localIndex = 0; localIndex < posts.length - topPost; localIndex++) {
    const p = posts[topPost + localIndex];
    if (!p) break;
    const postIndex = topPost + localIndex;
    const isSelected = postIndex === selectedPostIndex;
    const isMine = p.authorId === currentUserId;
    const author = authorProfiles.get(p.authorId);
    const label = isMine ? "you" : author ? `@${author.handle}` : "…";

    const contentLines = p.content.split("\n");
    const height = 3 + (p.title ? 1 : 0) + contentLines.length;
    // only render a post if it fits whole; never clip a post mid-way
    if (used + height > budget && lines.length > 0) break;
    used += height;

    lines.push(
      <Text
        key={`${p.id}-author`}
        bold
        wrap="truncate-end"
        color={theme.primary}
      >
        {focus == "feed" && isSelected ? pointer + " " : "  "}
        {label}
      </Text>,
    );

    if (p.title) {
      lines.push(
        <Text key={`${p.id}-title`} bold wrap="truncate-end" color={theme.text}>
          {"  "}
          {p.title}
        </Text>,
      );
    }

    contentLines.forEach((l, i) =>
      lines.push(
        <Text key={`${p.id}-line-${i}`} wrap="truncate-end">
          {"  " + applyMarkdown(l)}
        </Text>,
      ),
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
  }

  const visible = lines;

  return (
    <Box
      flexDirection="column"
      height={viewportHeight}
      paddingX={1}
      paddingTop={1}
      overflow="hidden"
    >
      {visible}
    </Box>
  );
}
