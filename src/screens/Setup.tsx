import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "../components/TextInput";
import { getTheme } from "../utils/theme";
import { isHandleAvailable, createProfile } from "../db/profiles";
import type { Profile } from "../db/profiles";

type Step = "handle" | "name";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function Setup({
  columns,
  onDone,
}: {
  columns: number;
  onDone: (profile: Profile) => void;
}) {
  const [step, setStep] = useState<Step>("handle");
  const [handle, setHandle] = useState("");
  const [handleOffset, setHandleOffset] = useState(0);
  const [name, setName] = useState("");
  const [nameOffset, setNameOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const theme = getTheme();

  async function submitHandle() {
    if (busy) return;
    const h = handle.toLowerCase().trim();
    if (!HANDLE_RE.test(h)) {
      setError("3–20 chars: lowercase letters, numbers, underscore");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const free = await isHandleAvailable(h);
      if (!free) {
        setError("that handle is taken");
        setBusy(false);
        return;
      }
      setHandle(h);
      setStep("name");
    } catch {
      setError("couldn't check handle, try again");
    }
    setBusy(false);
  }

  async function submitName() {
    if (busy) return;
    const n = name.trim();
    if (n.length < 1) {
      setError("enter a display name");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const profile = await createProfile(handle, n);
      onDone(profile);
    } catch (e: any) {
      // unique violation race, or validation
      setError(
        e?.message?.includes("duplicate")
          ? "handle just got taken — go back"
          : "couldn't save, try again",
      );
      setBusy(false);
    }
  }

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
      <Text bold color={theme.primary}>
        welcome to feed.sh
      </Text>

      {step === "handle" ? (
        <Box flexDirection="column" gap={1}>
          <Text>pick a username</Text>
          <Text color={theme.secondaryText}>
            this is how people find you. you can't change it easily.
          </Text>
          <Box>
            <Text color={theme.primary}>@</Text>
            <TextInput
              value={handle}
              onChange={(v) =>
                setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              columns={columns - 6}
              cursorOffset={handleOffset}
              onChangeCursorOffset={setHandleOffset}
              focus={!busy}
              placeholder="username"
              onSubmit={submitHandle}
            />
          </Box>
          <Text color={theme.secondaryText}>enter: continue</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={1}>
          <Text>what's your name?</Text>
          <Text color={theme.secondaryText}>
            this shows on your posts. can be anything.
          </Text>
          <Box>
            <Text color={theme.primary}>{"› "}</Text>
            <TextInput
              value={name}
              onChange={setName}
              columns={columns - 4}
              cursorOffset={nameOffset}
              onChangeCursorOffset={setNameOffset}
              focus={!busy}
              placeholder="your name"
              onSubmit={submitName}
              onEscape={() => {
                setStep("handle");
                setError("");
              }}
            />
          </Box>
          <Text color={theme.secondaryText}>enter: finish · esc: back</Text>
        </Box>
      )}

      {busy && <Text color={theme.secondaryText}>…</Text>}
      {error && <Text color={theme.error}>{error}</Text>}
    </Box>
  );
}
