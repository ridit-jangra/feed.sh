import { useState } from "react";
import { type Key } from "ink";
import { Cursor } from "../utils/Cursor";

type MaybeCursor = void | Cursor;
type InputHandler = (input: string) => MaybeCursor;
type InputMapper = (input: string) => MaybeCursor;

function mapInput(input_map: Array<[string, InputHandler]>): InputMapper {
  return function (input: string): MaybeCursor {
    const handler = new Map(input_map).get(input) ?? (() => {});
    return handler(input);
  };
}

export type UseTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onExit?: () => void;
  onExitMessage?: (show: boolean, key?: string) => void;
  onMessage?: (show: boolean, message?: string) => void;
  onHistoryUp?: () => void;
  onHistoryDown?: () => void;
  onHistoryReset?: () => void;
  onEscape?: () => void;
  mask?: string;
  multiline?: boolean;
  cursorChar: string;
  invert: (text: string) => string;
  columns: number;
  onImagePaste?: (base64Image: string) => void;
  disableCursorMovementForUpDownKeys?: boolean;
  externalOffset: number;
  onOffsetChange: (offset: number) => void;
  disabled?: boolean;
  enterInsertsNewline?: boolean;
  clearOnEscape?: boolean;
};

export type UseTextInputResult = {
  renderedValue: string;
  onInput: (input: string, key: Key) => void;
  offset: number;
  setOffset: (offset: number) => void;
};

export function useTextInput({
  value: originalValue,
  onChange,
  onSubmit,
  onExit,
  onMessage,
  onHistoryUp,
  onHistoryDown,
  onHistoryReset,
  mask = "",
  multiline = false,
  cursorChar,
  invert,
  columns,
  onImagePaste,
  disableCursorMovementForUpDownKeys = false,
  externalOffset,
  onOffsetChange,
  onEscape,
  disabled,
  enterInsertsNewline = false,
  clearOnEscape = false,
}: UseTextInputProps): UseTextInputResult {
  const offset = externalOffset;
  const setOffset = onOffsetChange;
  const cursor = Cursor.fromText(originalValue, columns, offset);
  const [imagePasteErrorTimeout, setImagePasteErrorTimeout] =
    useState<NodeJS.Timeout | null>(null);

  function maybeClearImagePasteErrorTimeout() {
    if (!imagePasteErrorTimeout) return;
    clearTimeout(imagePasteErrorTimeout);
    setImagePasteErrorTimeout(null);
    onMessage?.(false);
  }

  function handleCtrlC() {
    maybeClearImagePasteErrorTimeout();
    if (originalValue) {
      onChange("");
      onHistoryReset?.();
    } else {
      onExit?.();
    }
  }

  function handleEscape() {
    maybeClearImagePasteErrorTimeout();
    if (clearOnEscape && originalValue) {
      onChange("");
    }
    onEscape?.();
  }

  function clear() {
    return Cursor.fromText("", columns, 0);
  }

  function handleCtrlD(): MaybeCursor {
    maybeClearImagePasteErrorTimeout();
    if (cursor.text === "") {
      onExit?.();
      return cursor;
    }
    return cursor.del();
  }

  const handleCtrl = mapInput([
    ["a", () => cursor.startOfLine()],
    ["b", () => cursor.left()],
    [
      "c",
      () => {
        handleCtrlC();
        return cursor;
      },
    ],
    ["d", handleCtrlD],
    ["e", () => cursor.endOfLine()],
    ["f", () => cursor.right()],
    ["h", () => cursor.backspace()],
    ["k", () => cursor.deleteToLineEnd()],
    ["l", () => clear()],
    ["n", () => downOrHistoryDown()],
    ["p", () => upOrHistoryUp()],
    ["u", () => cursor.deleteToLineStart()],
    ["w", () => cursor.deleteWordBefore()],
  ]);

  const handleMeta = mapInput([
    ["b", () => cursor.prevWord()],
    ["f", () => cursor.nextWord()],
    ["d", () => cursor.deleteWordAfter()],
  ]);

  function handleEnter(key: Key): MaybeCursor {
    if (
      multiline &&
      cursor.offset > 0 &&
      cursor.text[cursor.offset - 1] === "\\"
    ) {
      return cursor.backspace().insert("\n");
    }
    if (key.meta) return cursor.insert("\n");
    if (enterInsertsNewline) return cursor.insert("\n");
    if (!disabled) onSubmit?.(originalValue);
  }

  function upOrHistoryUp(): MaybeCursor {
    if (disableCursorMovementForUpDownKeys) {
      onHistoryUp?.();
      return cursor;
    }
    const cursorUp = cursor.up();
    if (cursorUp.equals(cursor)) onHistoryUp?.();
    return cursorUp;
  }

  function downOrHistoryDown(): MaybeCursor {
    if (disableCursorMovementForUpDownKeys) {
      onHistoryDown?.();
      return cursor;
    }
    const cursorDown = cursor.down();
    if (cursorDown.equals(cursor)) onHistoryDown?.();
    return cursorDown;
  }

  function mapKey(key: Key): InputMapper {
    switch (true) {
      case key.escape:
        return () => {
          handleEscape();
          return cursor;
        };
      case key.leftArrow && (key.ctrl || key.meta):
        return () => cursor.prevWord();
      case key.rightArrow && (key.ctrl || key.meta):
        return () => cursor.nextWord();
      case key.backspace || key.delete:
        return key.meta
          ? () => cursor.deleteWordBefore()
          : () => cursor.backspace();
      case key.delete:
        return key.meta ? () => cursor.deleteToLineEnd() : () => cursor.del();
      case key.ctrl:
        return handleCtrl;
      case key.home:
        return () => cursor.startOfLine();
      case key.end:
        return () => cursor.endOfLine();
      case key.pageDown:
        return () => cursor.endOfLine();
      case key.pageUp:
        return () => cursor.startOfLine();
      case key.meta:
        return handleMeta;
      case key.return:
        return () => handleEnter(key);
      case key.tab:
        return () => {};
      case key.upArrow:
        return upOrHistoryUp;
      case key.downArrow:
        return downOrHistoryDown;
      case key.leftArrow:
        return () => cursor.left();
      case key.rightArrow:
        return () => cursor.right();
    }
    return function (input: string) {
      switch (true) {
        case input === "\x1b[H" || input === "\x1b[1~":
          return cursor.startOfLine();
        case input === "\x1b[F" || input === "\x1b[4~":
          return cursor.endOfLine();
        default:
          return cursor.insert(input.replace(/\r/g, "\n"));
      }
    };
  }

  function onInput(input: string, key: Key): void {
    const nextCursor = mapKey(key)(input);
    if (nextCursor) {
      if (!cursor.equals(nextCursor)) {
        setOffset(nextCursor.offset);
        if (cursor.text !== nextCursor.text) {
          onChange(nextCursor.text);
        }
      }
    }
  }

  return {
    onInput,
    renderedValue: cursor.render(cursorChar, mask, invert),
    offset,
    setOffset,
  };
}
