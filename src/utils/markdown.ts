import { marked } from "marked";
import type { Token } from "marked";
import chalk from "chalk";
import { EOL } from "os";
import { highlight, supportsLanguage } from "cli-highlight";
import { cornerTopLeft, cornerBottomLeft, lineVertical, line } from "./icons";
import { getTheme } from "./theme";

const STRIPPED_TAGS = [
  "commit_analysis",
  "context",
  "function_analysis",
  "pr_analysis",
];

const CODE_THEME = {
  keyword: chalk.hex("#7FBEB3"),
  built_in: chalk.hex("#78B8B5"),
  string: chalk.hex("#C48DBE"),
  number: chalk.hex("#C8B07A"),
  comment: chalk.hex("#6A6A6A").italic,
  function: chalk.hex("#D3A06F"),
  title: chalk.hex("#D3A06F"),
  params: chalk.hex("#D6B66A"),
  attr: chalk.hex("#9A8FD6"),
  class: chalk.hex("#7FB0D9"),
  type: chalk.hex("#7FB0D9"),
  literal: chalk.hex("#78B8B5"),
  regexp: chalk.hex("#BFBFC6"),
  tag: chalk.hex("#C26A72"),
  name: chalk.hex("#7FBEB3"),
  meta: chalk.hex("#D6B66A"),
  symbol: chalk.hex("#9D92D9"),
  subst: chalk.hex("#CFCFD6"),
  section: chalk.hex("#D3A06F"),
  bullet: chalk.hex("#D6B66A"),
  default: chalk.hex("#CFCFD6"),
};

export function stripSystemMessages(content: string): string {
  const regex = new RegExp(`<(${STRIPPED_TAGS.join("|")})>.*?</\\1>\n?`, "gs");
  return content.replace(regex, "").trim();
}

export function applyMarkdown(content: string): string {
  return marked
    .lexer(stripSystemMessages(content))
    .map((_) => format(_))
    .join("")
    .trim();
}

function formatCodeBlock(text: string, lang?: string): string {
  const theme = getTheme();
  const highlighted =
    lang && supportsLanguage(lang)
      ? highlight(text, { language: lang, theme: CODE_THEME })
      : highlight(text, { language: "markdown", theme: CODE_THEME });

  const lines = highlighted.split("\n");

  const top =
    chalk.hex(theme.primary)(cornerTopLeft + line + line + line) +
    (lang ? chalk.hex(theme.primary).bold(` ${lang} `) : "") +
    chalk.hex(theme.primary)(line.repeat(20));

  const body = lines
    .map((l) => chalk.hex(theme.primary)(lineVertical) + " " + l)
    .join(EOL);

  const bottom = chalk.hex(theme.primary)(cornerBottomLeft + line.repeat(24));

  return EOL + top + EOL + body + EOL + bottom + EOL;
}

function format(
  token: Token,
  listDepth = 0,
  orderedListNumber: number | null = null,
  parent: Token | null = null,
): string {
  const theme = getTheme();
  switch (token.type) {
    case "blockquote":
      return chalk
        .hex(theme.secondaryText)
        .italic((token.tokens ?? []).map((_) => format(_)).join(""));
    case "code":
      return formatCodeBlock(token.text, token.lang);
    case "codespan":
      return chalk.hex("#C48DBE")(token.text);
    case "em":
      return chalk.italic((token.tokens ?? []).map((_) => format(_)).join(""));
    case "strong":
      return chalk.bold((token.tokens ?? []).map((_) => format(_)).join(""));
    case "heading":
      switch (token.depth) {
        case 1:
          return (
            chalk
              .hex(theme.primary)
              .bold.italic.underline(
                (token.tokens ?? []).map((_) => format(_)).join(""),
              ) +
            EOL +
            EOL
          );
        case 2:
          return (
            chalk
              .hex(theme.secondary)
              .bold((token.tokens ?? []).map((_) => format(_)).join("")) +
            EOL +
            EOL
          );
        default:
          return (
            chalk
              .hex(theme.secondaryText)
              .bold((token.tokens ?? []).map((_) => format(_)).join("")) +
            EOL +
            EOL
          );
      }
    case "hr":
      return chalk.hex(theme.secondaryBorder)("─".repeat(40)) + EOL;
    case "image":
      return chalk.hex(theme.secondaryText)(
        `[Image: ${token.title}: ${token.href}]`,
      );
    case "link":
      return chalk.hex(theme.secondary).underline(token.href);
    case "list": {
      return token.items
        .map((_: Token, index: number) =>
          format(
            _,
            listDepth,
            token.ordered ? token.start + index : null,
            token,
          ),
        )
        .join("");
    }
    case "list_item":
      return (token.tokens ?? [])
        .map(
          (_) =>
            `${"  ".repeat(listDepth)}${format(_, listDepth + 1, orderedListNumber, token)}`,
        )
        .join("");
    case "paragraph":
      return (token.tokens ?? []).map((_) => format(_)).join("") + EOL;
    case "space":
      return EOL;
    case "text":
      if (parent?.type === "list_item") {
        const bullet =
          orderedListNumber === null
            ? chalk.hex(theme.primary)("-")
            : chalk.hex(theme.primary)(
                getListNumber(listDepth, orderedListNumber) + ".",
              );
        return `${bullet} ${token.tokens ? token.tokens.map((_) => format(_, listDepth, orderedListNumber, token)).join("") : token.text}${EOL}`;
      } else {
        return token.text;
      }
    case "table": {
      const headers = (token.header as any[]).map((h: any) =>
        ((h.tokens ?? []) as Token[]).map((_) => format(_)).join(""),
      );
      const rows = (token.rows as any[][]).map((row: any[]) =>
        row.map((cell: any) =>
          ((cell.tokens ?? []) as Token[]).map((_) => format(_)).join(""),
        ),
      );

      const colWidths = headers.map((h: string, i: number) =>
        Math.max(h.length, ...rows.map((r: string[]) => (r[i] ?? "").length)),
      );

      const formatRow = (cells: string[]) =>
        cells.map((c, i) => c.padEnd(colWidths[i] ?? 0)).join("  ");

      const header = chalk.hex(theme.primary).bold(formatRow(headers));
      const separator = chalk.hex(theme.secondaryBorder)(
        colWidths.map((w: number) => "─".repeat(w)).join("  "),
      );
      const body = rows.map((r: string[]) => formatRow(r)).join(EOL);

      return header + EOL + separator + EOL + body + EOL;
    }
  }
  return "";
}

const DEPTH_1_LIST_NUMBERS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "aa",
  "ab",
  "ac",
  "ad",
  "ae",
  "af",
  "ag",
  "ah",
  "ai",
  "aj",
  "ak",
  "al",
  "am",
  "an",
  "ao",
  "ap",
  "aq",
  "ar",
  "as",
  "at",
  "au",
  "av",
  "aw",
  "ax",
  "ay",
  "az",
];
const DEPTH_2_LIST_NUMBERS = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
  "xiii",
  "xiv",
  "xv",
  "xvi",
  "xvii",
  "xviii",
  "xix",
  "xx",
  "xxi",
  "xxii",
  "xxiii",
  "xxiv",
  "xxv",
  "xxvi",
  "xxvii",
  "xxviii",
  "xxix",
  "xxx",
  "xxxi",
  "xxxii",
  "xxxiii",
  "xxxiv",
  "xxxv",
  "xxxvi",
  "xxxvii",
  "xxxviii",
  "xxxix",
  "xl",
];

function getListNumber(listDepth: number, orderedListNumber: number): string {
  switch (listDepth) {
    case 0:
    case 1:
      return orderedListNumber.toString();
    case 2:
      return DEPTH_1_LIST_NUMBERS[orderedListNumber - 1]!;
    case 3:
      return DEPTH_2_LIST_NUMBERS[orderedListNumber - 1]!;
    default:
      return orderedListNumber.toString();
  }
}
