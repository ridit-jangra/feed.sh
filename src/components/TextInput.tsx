import React, { type JSX } from "react";
import { Text, useInput } from "ink";
import chalk from "chalk";
import { useTextInput } from "../hooks/useTextInput";
import { getTheme } from "../utils/theme";
import { type Key } from "ink";

export type Props = {
  readonly onHistoryUp?: () => void;
  readonly onHistoryDown?: () => void;
  readonly placeholder?: string;
  readonly multiline?: boolean;
  readonly focus?: boolean;
  readonly mask?: string;
  readonly showCursor?: boolean;
  readonly highlightPastedText?: boolean;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly onExit?: () => void;
  readonly onExitMessage?: (show: boolean, key?: string) => void;
  readonly onMessage?: (show: boolean, message?: string) => void;
  readonly onHistoryReset?: () => void;
  readonly columns: number;
  readonly onImagePaste?: (base64Image: string) => void;
  readonly onPaste?: (text: string) => void;
  readonly isDimmed?: boolean;
  readonly disableCursorMovementForUpDownKeys?: boolean;
  readonly cursorOffset: number;
  readonly onChangeCursorOffset: (offset: number) => void;
  readonly onEscape?: () => void;
  disabled?: boolean;
};

// SGR mouse reports: ESC [ < btn ; col ; row (M=press, m=release).
// The ESC is optional because Ink strips a leading ESC from unresolved
// sequences before handing them to useInput (see ink/build/hooks/use-input.js),
// so these arrive here as a bare "[<…M".
const MOUSE_SEQUENCE = /\x1b?\[<\d+;\d+;\d+[Mm]/g;

export default function TextInput({
  value: originalValue,
  placeholder = "",
  focus = true,
  mask,
  multiline = false,
  showCursor = true,
  onChange,
  onSubmit,
  onExit,
  onHistoryUp,
  onHistoryDown,
  onExitMessage,
  onMessage,
  onHistoryReset,
  columns,
  onImagePaste,
  onPaste,
  isDimmed = false,
  disableCursorMovementForUpDownKeys = false,
  cursorOffset,
  onChangeCursorOffset,
  onEscape,
  disabled,
}: Props): JSX.Element {
  const { onInput, renderedValue } = useTextInput({
    value: originalValue,
    onChange,
    onSubmit,
    onExit,
    onExitMessage,
    onMessage,
    onHistoryReset,
    onHistoryUp,
    onHistoryDown,
    mask,
    multiline,
    cursorChar: showCursor ? " " : "",
    invert: chalk.inverse,
    columns,
    onImagePaste,
    disableCursorMovementForUpDownKeys,
    externalOffset: cursorOffset,
    onOffsetChange: onChangeCursorOffset,
    onEscape,
    disabled,
  });

  const [pasteState, setPasteState] = React.useState<{
    chunks: string[];
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({ chunks: [], timeoutId: null });

  const resetPasteTimeout = (
    currentTimeoutId: ReturnType<typeof setTimeout> | null,
  ) => {
    if (currentTimeoutId) clearTimeout(currentTimeoutId);
    return setTimeout(() => {
      setPasteState(({ chunks }) => {
        const pastedText = chunks.join("");
        Promise.resolve().then(() => onPaste!(pastedText));
        return { chunks: [], timeoutId: null };
      });
    }, 100);
  };

  const wrappedOnInput = (input: string, key: Key): void => {
    // Strip any SGR mouse reports before they reach the text field.
    // A single stdin chunk can batch many mouse events together, optionally
    // mixed with real keystrokes — remove the mouse bytes, keep the rest.
    if (MOUSE_SEQUENCE.test(input)) {
      MOUSE_SEQUENCE.lastIndex = 0; // reset because the regex is global
      const cleaned = input.replace(MOUSE_SEQUENCE, "");
      MOUSE_SEQUENCE.lastIndex = 0;
      if (cleaned.length === 0) return; // pure mouse data → drop entirely
      input = cleaned; // had real characters too → pass those through
    }

    const isSpecialKey =
      key.backspace ||
      key.delete ||
      key.leftArrow ||
      key.rightArrow ||
      key.upArrow ||
      key.downArrow ||
      key.return ||
      key.escape ||
      key.ctrl ||
      key.meta;

    if (
      onPaste &&
      !isSpecialKey &&
      (input.length > 800 || pasteState.timeoutId)
    ) {
      setPasteState(({ chunks, timeoutId }) => ({
        chunks: [...chunks, input],
        timeoutId: resetPasteTimeout(timeoutId),
      }));
      return;
    }

    onInput(input, key);
  };

  useInput(wrappedOnInput, { isActive: focus });

  let renderedPlaceholder = placeholder
    ? chalk.hex(getTheme().secondaryText)(placeholder)
    : undefined;

  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? chalk.inverse(placeholder[0]) +
          chalk.hex(getTheme().secondaryText)(placeholder.slice(1))
        : chalk.inverse(" ");
  }

  const showPlaceholder = originalValue.length === 0 && placeholder;

  return (
    <Text wrap="truncate-end" dimColor={isDimmed}>
      {showPlaceholder ? renderedPlaceholder : renderedValue}
    </Text>
  );
}
