import { CONFIG_FILE } from "./env";
import { existsSync, readFileSync, writeFileSync } from "fs";
import type { Theme } from "../types";

const darkTheme: Theme = {
  name: "dark",
  primary: "#7C6FF0",
  secondary: "#5FD4C4",
  border: "#3A3550",
  secondaryBorder: "#4A4458",
  text: "#ECECF1",
  secondaryText: "#8B8799",
  money: "#5FD48A",
  suggestion: "#7C6FF0",
  success: "#4ADE80",
  error: "#F87171",
  warning: "#FBBF24",
  diff: {
    added: "#1E3A2B",
    removed: "#3A1E28",
    addedDimmed: "#2A3A30",
    removedDimmed: "#3A2E33",
  },
};

const catppuccinTheme: Theme = {
  name: "catppuccin",
  primary: "#CBA6F7",
  secondary: "#89DCEB",
  border: "#45475A",
  secondaryBorder: "#585B70",
  text: "#CDD6F4",
  secondaryText: "#A6ADC8",
  money: "#A6E3A1",
  suggestion: "#B4BEFE",
  success: "#A6E3A1",
  error: "#F38BA8",
  warning: "#F9E2AF",
  diff: {
    added: "#2A3B2E",
    removed: "#3F2A35",
    addedDimmed: "#313A34",
    removedDimmed: "#3A3036",
  },
};

function getConfig(): { theme?: string } {
  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify({ theme: darkTheme.name }));
    return { theme: darkTheme.name };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function getTheme(override?: string): Theme {
  const config = getConfig();
  switch (override ?? config.theme) {
    default:
      return catppuccinTheme;
  }
}
