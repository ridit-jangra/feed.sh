import React from "react";
import { Box, Text } from "ink";
import { getTheme } from "../utils/theme";
import { useTerminalSize } from "../hooks/useTerminalSize";
import { diamond, star } from "../utils/icons";
import Spinner from "ink-spinner";
import type { Screen } from "../types";

type Props = {
  loading: boolean;
  screen: Screen;
  handle: string | null;
};

function getScreenColor(screen: Screen) {
  switch (screen) {
    case "create":
      return getTheme().secondary;
    case "feed":
      return getTheme().warning;
    case "profile":
      return getTheme().success;
    case "thread":
      return getTheme().primary;
  }
}

export function StatusBar({
  loading = false,
  screen,
  handle,
}: Props): React.ReactNode {
  const { columns } = useTerminalSize();

  const icon = star;

  const screenPart = ` ${screen} `;
  const iconPart = ` ${icon}`;

  const screenBg = getScreenColor(screen);

  return (
    <Box width={columns} justifyContent="space-between">
      <Box gap={1}>
        {loading ? (
          <Box>
            <Spinner type="bluePulse" />
            {/* <Text>{thinkingMessage}</Text> */}
          </Box>
        ) : (
          <>
            <Box gap={1}>
              <Text color={getTheme().warning}>{diamond}</Text>
              <Text>{handle ? `@${handle}` : ""}</Text>
            </Box>

            {/* {coins !== null && (
              <Box>
                <Text color={getTheme().money}>{coin}</Text>
                <Text color={getTheme().money}>{coins}</Text>
              </Box>
            )} */}
          </>
        )}
      </Box>
      <Box>
        <Text color={getTheme().secondaryText} backgroundColor={screenBg}>
          {iconPart}
          {screenPart}
        </Text>
      </Box>
    </Box>
  );
}
