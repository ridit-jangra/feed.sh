import { join } from "path";
import { homedir } from "os";
import { mkdirSync } from "fs";

export const FEED_BASE_DIR =
  process.env.MILO_CONFIG_DIR ?? join(homedir(), ".feed.sh");

mkdirSync(FEED_BASE_DIR, { recursive: true });

export const CONFIG_FILE = join(FEED_BASE_DIR, "config.json");
export const BOOTSTRAP_FILE = join(FEED_BASE_DIR, "bootstrap.txt");
export const AUTH_FILE = join(FEED_BASE_DIR, "auth.json");
export const SESSION_PATH = join(FEED_BASE_DIR, "session.json");

export const EDGE_BASE = "";
