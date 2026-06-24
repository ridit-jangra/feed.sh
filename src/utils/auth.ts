import { supabase } from "./supabase";
import {
  HACKCLUB_AUTHORIZE_URL,
  HACKCLUB_CLIENT_ID,
  HACKCLUB_REDIRECT_URI,
  HACKCLUB_SCOPE,
} from "./hackclub";
import type { Session, User } from "@supabase/supabase-js";

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

export async function loginWithHackClub(
  onUrl?: (url: string) => void,
): Promise<AuthResult<{ session: Session; user: User }>> {
  if (!HACKCLUB_CLIENT_ID) {
    return {
      ok: false,
      error: "HACKCLUB_CLIENT_ID is not set — see README for setup",
    };
  }

  const nonce = crypto.randomUUID();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: AuthResult<{ session: Session; user: User }>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      queueMicrotask(() => server.stop(true));
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ ok: false, error: "login timed out — try again" }),
      LOGIN_TIMEOUT_MS,
    );

    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname !== "/callback") {
          return new Response("not found", { status: 404 });
        }

        const state = decodeState(url.searchParams.get("state"));
        if (!state || state.nonce !== nonce) {
          return page("Login failed — bad state. Return to your terminal.");
        }

        const err = url.searchParams.get("error");
        const tokenHash = url.searchParams.get("token_hash");
        if (err || !tokenHash) {
          finish({ ok: false, error: err ?? "login failed, try again" });
          return page("Login failed. Return to your terminal.");
        }

        const type = (url.searchParams.get("type") ?? "email") as any;
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (error || !data.session || !data.user) {
          finish({
            ok: false,
            error: error ? humanize(error.message) : "verification failed",
          });
          return page("Login failed. Return to your terminal.");
        }

        finish({ ok: true, data: { session: data.session, user: data.user } });
        return page(
          "✓ Signed in. You can close this tab and return to your terminal.",
        );
      },
    });

    const state = encodeState({ port: server.port ?? 0, nonce });
    const authorizeUrl = `${HACKCLUB_AUTHORIZE_URL}?${new URLSearchParams({
      client_id: HACKCLUB_CLIENT_ID,
      redirect_uri: HACKCLUB_REDIRECT_URI,
      response_type: "code",
      scope: HACKCLUB_SCOPE,
      state,
    })}`;

    onUrl?.(authorizeUrl);
    openBrowser(authorizeUrl);
  });
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

type State = { port: number; nonce: string };

function encodeState(s: State): string {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}

function decodeState(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
    if (typeof s.port === "number" && typeof s.nonce === "string") return s;
  } catch {
    return null;
  }
  return null;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  } catch {
    return;
  }
}

function page(message: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>feed.sh</title>` +
      `<style>body{font-family:ui-monospace,monospace;background:#0b0b0b;color:#eaeaea;` +
      `display:grid;place-items:center;height:100vh;margin:0}main{text-align:center}</style></head>` +
      `<body><main><h1>feed.sh</h1><p>${message}</p></main></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function humanize(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many"))
    return "too many attempts — wait a minute and try again";
  if (m.includes("expired")) return "that login expired — try again";
  return msg;
}
