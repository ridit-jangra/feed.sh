import type React from "react";

export interface Post {
  id: string;
  authorId: string;

  content: string;

  createdAt: Date;
  updatedAt?: Date;

  likes: number;
  replies: number;
}

export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  border: string;
  secondaryBorder: string;
  text: string;
  secondaryText: string;
  suggestion: string;
  success: string;
  error: string;
  money: string;
  warning: string;
  diff: {
    added: string;
    removed: string;
    addedDimmed: string;
    removedDimmed: string;
  };
}

export type Command = {
  name: string;
  description: string;
  isEnabled: boolean;
  isHidden: boolean;
  aliases?: string[];
  subcommands?: {
    name: string;
    description?: string;
  }[];
  userFacingName(): string;
} & LocalCommand;

type LocalCommand = {
  type: "local";
  call(args: string, context: CommandContext): Promise<string | void>;
};

export type CommandContext = {
  setScreen: (screen: string) => void;
};
