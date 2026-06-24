import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HACKCLUB_TOKEN_URL = "https://auth.hackclub.com/oauth/token";
const HACKCLUB_ME_URL = "https://auth.hackclub.com/api/v1/me";

const CLIENT_ID = Deno.env.get("HACKCLUB_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("HACKCLUB_CLIENT_SECRET")!;
const REDIRECT_URI = Deno.env.get("HACKCLUB_REDIRECT_URI")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type State = { port: number; nonce: string };

function decodeState(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const s = JSON.parse(json);
    if (typeof s.port === "number" && typeof s.nonce === "string") return s;
  } catch {
    return null;
  }
  return null;
}

function backToCli(
  state: State,
  raw: string,
  params: Record<string, string>,
): Response {
  const u = new URL(`http://localhost:${state.port}/callback`);
  u.searchParams.set("state", raw);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return Response.redirect(u.toString(), 302);
}

function fail(message: string, status = 400): Response {
  return new Response(message, { status });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const rawState = url.searchParams.get("state");
  const state = decodeState(rawState);

  const providerError = url.searchParams.get("error");
  if (providerError) {
    if (state && rawState)
      return backToCli(state, rawState, { error: providerError });
    return fail(`oauth error: ${providerError}`);
  }

  const code = url.searchParams.get("code");
  if (!code || !state || !rawState) return fail("missing code or state");

  const tokenRes = await fetch(HACKCLUB_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!tokenRes.ok) {
    return backToCli(state, rawState, { error: "token_exchange_failed" });
  }
  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token as string;

  const meRes = await fetch(HACKCLUB_ME_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!meRes.ok) {
    return backToCli(state, rawState, { error: "profile_fetch_failed" });
  }
  const me = await meRes.json();
  const identity = me.identity ?? {};
  const email: string | undefined = identity.primary_email;
  if (!email) {
    return backToCli(state, rawState, { error: "no_email_on_account" });
  }
  const hackclubId = String(identity.id ?? identity.slack_id ?? "");

  const name = [identity.first_name, identity.last_name]
    .filter(Boolean)
    .join(" ") || null;

  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      hackclub_id: hackclubId,
      slack_id: identity.slack_id ?? null,
      name,
    },
  });
  if (createErr && !/already.*regist|exists/i.test(createErr.message)) {
    return backToCli(state, rawState, { error: "user_provisioning_failed" });
  }

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    return backToCli(state, rawState, { error: "session_mint_failed" });
  }

  return backToCli(state, rawState, {
    token_hash: link.properties.hashed_token,
    type: link.properties.verification_type ?? "magiclink",
  });
});
