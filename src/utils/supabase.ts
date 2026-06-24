import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { SESSION_PATH } from "./env";

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://iezrpwcedsdasziyzqzv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "sb_publishable_JOEbpf48NDnABgGmNo9aoQ_wBoPrgw4";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set them in your environment or .env file.",
  );
}

function readStore(): Record<string, string> {
  if (!existsSync(SESSION_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SESSION_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, string>) {
  mkdirSync(dirname(SESSION_PATH), { recursive: true });
  writeFileSync(SESSION_PATH, JSON.stringify(data), { mode: 0o600 });
}

const fileStorage = {
  getItem: (key: string): string | null => {
    return readStore()[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    const data = readStore();
    data[key] = value;
    writeStore(data);
  },
  removeItem: (key: string): void => {
    const data = readStore();
    delete data[key];
    writeStore(data);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: fileStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
