import wrapAnsi from "wrap-ansi";

type WrappedText = string[];
type Position = {
  line: number;
  column: number;
};

export class Cursor {
  readonly offset: number;
  constructor(
    readonly measuredText: MeasuredText,
    offset: number = 0,
    readonly selection: number = 0,
  ) {
    this.offset = Math.max(0, Math.min(this.measuredText.text.length, offset));
  }

  static fromText(
    text: string,
    columns: number,
    offset: number = 0,
    selection: number = 0,
  ): Cursor {
    return new Cursor(new MeasuredText(text, columns - 1), offset, selection);
  }

  render(cursorChar: string, mask: string, invert: (text: string) => string) {
    const { line, column } = this.getPosition();
    return this.measuredText
      .getWrappedText()
      .map((text, currentLine, allLines) => {
        let displayText = text;
        if (mask && currentLine === allLines.length - 1) {
          const lastSixStart = Math.max(0, text.length - 6);
          displayText = mask.repeat(lastSixStart) + text.slice(lastSixStart);
        }

        if (line != currentLine) return displayText.trimEnd();

        return (
          displayText.slice(0, column) +
          invert(displayText[column] || cursorChar) +
          displayText.trimEnd().slice(column + 1)
        );
      })
      .join("\n");
  }

  left(): Cursor {
    return new Cursor(this.measuredText, this.offset - 1);
  }

  right(): Cursor {
    return new Cursor(this.measuredText, this.offset + 1);
  }

  up(): Cursor {
    const { line, column } = this.getPosition();
    if (line == 0) {
      return new Cursor(this.measuredText, 0, 0);
    }

    const newOffset = this.getOffset({ line: line - 1, column });
    return new Cursor(this.measuredText, newOffset, 0);
  }

  down(): Cursor {
    const { line, column } = this.getPosition();
    if (line >= this.measuredText.lineCount - 1) {
      return new Cursor(this.measuredText, this.text.length, 0);
    }

    const newOffset = this.getOffset({ line: line + 1, column });
    return new Cursor(this.measuredText, newOffset, 0);
  }

  startOfLine(): Cursor {
    const { line } = this.getPosition();
    return new Cursor(
      this.measuredText,
      this.getOffset({
        line,
        column: 0,
      }),
      0,
    );
  }

  endOfLine(): Cursor {
    const { line } = this.getPosition();
    const column = this.measuredText.getLineLength(line);
    const offset = this.getOffset({ line, column });
    return new Cursor(this.measuredText, offset, 0);
  }

  nextWord(): Cursor {
    let current = new Cursor(this.measuredText, this.offset, this.selection);

    while (current.isOverWordChar() && !current.isAtEnd()) {
      current = current.right();
    }

    while (!current.isOverWordChar() && !current.isAtEnd()) {
      current = current.right();
    }

    return current;
  }

  prevWord(): Cursor {
    let current: Cursor = new Cursor(
      this.measuredText,
      this.offset,
      this.selection,
    );

    if (!current.left().isOverWordChar()) {
      current = current.left();
    }

    while (!current.isOverWordChar() && !current.isAtStart()) {
      current = current.left();
    }

    if (current.isOverWordChar()) {
      while (current.left().isOverWordChar() && !current.isAtStart()) {
        current = current.left();
      }
    }

    return current;
  }

  private modifyText(end: Cursor, insertString: string = ""): Cursor {
    const startOffset = this.offset;
    const endOffset = end.offset;

    const newText =
      this.text.slice(0, startOffset) +
      insertString +
      this.text.slice(endOffset);

    return Cursor.fromText(
      newText,
      this.columns,
      startOffset + insertString.length,
    );
  }

  insert(insertString: string): Cursor {
    const newCursor = this.modifyText(this, insertString);
    return newCursor;
  }

  del(): Cursor {
    if (this.isAtEnd()) {
      return this;
    }
    return this.modifyText(this.right());
  }

  backspace(): Cursor {
    if (this.isAtStart()) {
      return this;
    }
    return this.left().modifyText(this);
  }

  deleteToLineStart(): Cursor {
    return this.startOfLine().modifyText(this);
  }

  deleteToLineEnd(): Cursor {
    if (this.text[this.offset] === "\n") {
      return this.modifyText(this.right());
    }

    return this.modifyText(this.endOfLine());
  }

  deleteWordBefore(): Cursor {
    if (this.isAtStart()) {
      return this;
    }
    return this.prevWord().modifyText(this);
  }

  deleteWordAfter(): Cursor {
    if (this.isAtEnd()) {
      return this;
    }

    return this.modifyText(this.nextWord());
  }

  private isOverWordChar(): boolean {
    const currentChar = this.text[this.offset] ?? "";
    return /\w/.test(currentChar);
  }

  equals(other: Cursor): boolean {
    return (
      this.offset === other.offset && this.measuredText == other.measuredText
    );
  }

  private isAtStart(): boolean {
    return this.offset == 0;
  }
  private isAtEnd(): boolean {
    return this.offset == this.text.length;
  }

  public get text(): string {
    return this.measuredText.text;
  }

  private get columns(): number {
    return this.measuredText.columns + 1;
  }

  private getPosition(): Position {
    return this.measuredText.getPositionFromOffset(this.offset);
  }

  private getOffset(position: Position): number {
    return this.measuredText.getOffsetFromPosition(position);
  }
}

class WrappedLine {
  constructor(
    public readonly text: string,
    public readonly startOffset: number,
    public readonly isPrecededByNewline: boolean,
    public readonly endsWithNewline: boolean = false,
  ) {}

  equals(other: WrappedLine): boolean {
    return this.text === other.text && this.startOffset === other.startOffset;
  }

  get length(): number {
    return this.text.length + (this.endsWithNewline ? 1 : 0);
  }
}

export class MeasuredText {
  private wrappedLines: WrappedLine[];

  constructor(
    readonly text: string,
    readonly columns: number,
  ) {
    this.wrappedLines = this.measureWrappedText();
  }

  private measureWrappedText(): WrappedLine[] {
    const wrappedText = wrapAnsi(this.text, this.columns, {
      hard: true,
      trim: false,
    });

    const wrappedLines: WrappedLine[] = [];
    let searchOffset = 0;
    let lastNewLinePos = -1;

    const lines = wrappedText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i]!;
      const isPrecededByNewline = (startOffset: number) =>
        i == 0 || (startOffset > 0 && this.text[startOffset - 1] === "\n");

      if (text.length === 0) {
        lastNewLinePos = this.text.indexOf("\n", lastNewLinePos + 1);

        if (lastNewLinePos !== -1) {
          const startOffset = lastNewLinePos;
          const endsWithNewline = true;

          wrappedLines.push(
            new WrappedLine(
              text,
              startOffset,
              isPrecededByNewline(startOffset),
              endsWithNewline,
            ),
          );
        } else {
          const startOffset = this.text.length;
          wrappedLines.push(
            new WrappedLine(
              text,
              startOffset,
              isPrecededByNewline(startOffset),
              false,
            ),
          );
        }
      } else {
        const startOffset = this.text.indexOf(text, searchOffset);
        if (startOffset === -1) {
          throw new Error("Failed to find wrapped line in original text");
        }

        searchOffset = startOffset + text.length;

        const potentialNewlinePos = startOffset + text.length;
        const endsWithNewline =
          potentialNewlinePos < this.text.length &&
          this.text[potentialNewlinePos] === "\n";

        if (endsWithNewline) {
          lastNewLinePos = potentialNewlinePos;
        }

        wrappedLines.push(
          new WrappedLine(
            text,
            startOffset,
            isPrecededByNewline(startOffset),
            endsWithNewline,
          ),
        );
      }
    }

    return wrappedLines;
  }

  public getWrappedText(): WrappedText {
    return this.wrappedLines.map((line) =>
      line.isPrecededByNewline ? line.text : line.text.trimStart(),
    );
  }

  private getLine(line: number): WrappedLine {
    return this.wrappedLines[
      Math.max(0, Math.min(line, this.wrappedLines.length - 1))
    ]!;
  }

  public getOffsetFromPosition(position: Position): number {
    const wrappedLine = this.getLine(position.line);
    const startOffsetPlusColumn = wrappedLine.startOffset + position.column;

    if (wrappedLine.text.length === 0 && wrappedLine.endsWithNewline) {
      return wrappedLine.startOffset;
    }

    const lineEnd = wrappedLine.startOffset + wrappedLine.text.length;

    const maxOffset = wrappedLine.endsWithNewline ? lineEnd + 1 : lineEnd;

    return Math.min(startOffsetPlusColumn, maxOffset);
  }

  public getLineLength(line: number): number {
    const currentLine = this.getLine(line);
    const nextLine = this.getLine(line + 1);
    if (nextLine.equals(currentLine)) {
      return this.text.length - currentLine.startOffset;
    }

    return nextLine.startOffset - currentLine.startOffset - 1;
  }

  public getPositionFromOffset(offset: number): Position {
    const lines = this.wrappedLines;
    for (let line = 0; line < lines.length; line++) {
      const currentLine = lines[line]!;
      const nextLine = lines[line + 1];
      if (
        offset >= currentLine.startOffset &&
        (!nextLine || offset < nextLine.startOffset)
      ) {
        const leadingWhitepace = currentLine.isPrecededByNewline
          ? 0
          : currentLine.text.length - currentLine.text.trimStart().length;
        const column = Math.max(
          0,
          Math.min(
            offset - currentLine.startOffset - leadingWhitepace,
            currentLine.text.length,
          ),
        );
        return {
          line,
          column,
        };
      }
    }

    const line = lines.length - 1;
    return {
      line,
      column: this.wrappedLines[line]!.text.length,
    };
  }

  public get lineCount(): number {
    return this.wrappedLines.length;
  }
  equals(other: MeasuredText): boolean {
    return this.text === other.text && this.columns === other.columns;
  }
}
