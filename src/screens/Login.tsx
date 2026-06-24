import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "../components/TextInput";
import { getTheme } from "../utils/theme";
import { requestCode, verifyCode } from "../utils/auth";
import type { Session, User } from "@supabase/supabase-js";

type Stage = "email" | "code";

type Props = {
  columns: number;
  onAuthed: (session: Session, user: User) => void;
};

export function Login({ columns, onAuthed }: Props) {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [emailOffset, setEmailOffset] = useState(0);
  const [code, setCode] = useState("");
  const [codeOffset, setCodeOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const theme = getTheme();

  async function submitEmail() {
    if (busy) return;
    setError("");
    setBusy(true);
    const res = await requestCode(email);
    setBusy(false);
    if (res.ok) {
      setStage("code");
    } else {
      setError(res.error);
    }
  }

  async function submitCode() {
    if (busy) return;
    setError("");
    setBusy(true);
    const res = await verifyCode(email, code);
    setBusy(false);
    if (res.ok) {
      onAuthed(res.data.session, res.data.user);
    } else {
      setError(res.error);
    }
  }

  return (
    <Box flexDirection="column" paddingX={1} gap={1}>
      <Text bold color={theme.primary}>
        feed.sh
      </Text>

      {stage === "email" ? (
        <>
          <Text color={theme.secondaryText}>
            sign in with your email — we'll send a code.
          </Text>
          <Box>
            <Text color={theme.primary}>{"› "}</Text>
            <TextInput
              value={email}
              onChange={setEmail}
              columns={columns - 4}
              cursorOffset={emailOffset}
              onChangeCursorOffset={setEmailOffset}
              focus={!busy}
              placeholder="you@example.com"
              onSubmit={submitEmail}
            />
          </Box>
        </>
      ) : (
        <>
          <Text color={theme.secondaryText}>
            enter the 8-digit code sent to {email}.
          </Text>
          <Box>
            <Text color={theme.primary}>{"› "}</Text>
            <TextInput
              value={code}
              onChange={setCode}
              columns={columns - 4}
              cursorOffset={codeOffset}
              onChangeCursorOffset={setCodeOffset}
              focus={!busy}
              placeholder="00000000"
              onSubmit={submitCode}
              onEscape={() => {
                setStage("email");
                setCode("");
                setCodeOffset(0);
                setError("");
              }}
            />
          </Box>
        </>
      )}

      {busy && <Text color={theme.secondaryText}>…sending</Text>}
      {error && <Text color={theme.error}>{error}</Text>}

      <Text color={theme.secondaryText}>
        {stage === "email"
          ? "enter: send code"
          : "enter: sign in · esc: change email"}
      </Text>
    </Box>
  );
}
