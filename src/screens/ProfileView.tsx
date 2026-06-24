import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import type { ProfileWithStats } from "../db/profiles";

export function ProfileView({
  profile,
  isMe,
  notFound,
  query,
}: {
  profile: ProfileWithStats | null;
  isMe: boolean;
  notFound: boolean;
  query: string;
}) {
  const theme = getTheme();

  if (notFound) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color={theme.error}>no user @{query.replace(/^@/, "")}</Text>
        <Text color={theme.secondaryText}>esc / type feed to go back</Text>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color={theme.secondaryText}>loading profile…</Text>
      </Box>
    );
  }

  const joined = profile.createdAt.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
      <Text bold color={theme.primary}>
        {profile.displayName}
        {isMe ? " (you)" : ""}
      </Text>
      <Text color={theme.secondaryText}>@{profile.handle}</Text>

      <Box gap={2}>
        <Text>
          <Text bold color={theme.text}>
            {profile.postCount}
          </Text>{" "}
          <Text color={theme.secondaryText}>posts</Text>
        </Text>
        <Text color={theme.secondaryText}>joined {joined}</Text>
      </Box>

      <Text color={theme.secondaryText}>type feed to go back</Text>
    </Box>
  );
}
