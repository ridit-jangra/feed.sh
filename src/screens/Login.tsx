import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../utils/theme";
import { loginWithHackClub } from "../utils/auth";
import type { Session, User } from "@supabase/supabase-js";

type Stage = "idle" | "waiting" | "error";

type Props = {
  columns: number;
  onAuthed: (session: Session, user: User) => void;
};

export function Login({ onAuthed }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [authUrl, setAuthUrl] = useState("");
  const [error, setError] = useState("");
  const theme = getTheme();

  async function start() {
    setStage("waiting");
    setError("");
    setAuthUrl("");
    const res = await loginWithHackClub(setAuthUrl);
    if (res.ok) {
      onAuthed(res.data.session, res.data.user);
    } else {
      setError(res.error);
      setStage("error");
    }
  }

  useInput((_input, key) => {
    if ((stage === "idle" || stage === "error") && key.return) {
      void start();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} gap={1}>
      <Text bold color={theme.primary}>
        feed.sh
      </Text>

      {stage === "waiting" ? (
        <Box flexDirection="column" gap={1}>
          <Text color={theme.secondaryText}>
            opening Hack Club in your browser…
          </Text>
          {authUrl && (
            <Box flexDirection="column">
              <Text color={theme.secondaryText}>
                if it didn't open, visit:
              </Text>
              <Text color={theme.primary}>{authUrl}</Text>
            </Box>
          )}
          <Text color={theme.secondaryText}>
            waiting for you to finish signing in…
          </Text>
        </Box>
      ) : (
        <>
          <Text color={theme.secondaryText}>sign in with your Hack Club account.</Text>
          {error && <Text color={theme.error}>{error}</Text>}
          <Text color={theme.secondaryText}>
            enter: {stage === "error" ? "try again" : "sign in with Hack Club"}
          </Text>
        </>
      )}
    </Box>
  );
}
