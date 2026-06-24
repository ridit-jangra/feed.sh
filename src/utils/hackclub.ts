import { SUPABASE_URL } from "./supabase";

export const HACKCLUB_AUTHORIZE_URL =
  "https://auth.hackclub.com/oauth/authorize";

export const HACKCLUB_CLIENT_ID =
  process.env.HACKCLUB_CLIENT_ID ?? "9f58d5a4ef07c338b2e86c2fd225a2e6";

export const HACKCLUB_REDIRECT_URI =
  process.env.HACKCLUB_REDIRECT_URI ??
  `${SUPABASE_URL}/functions/v1/hackclub-auth`;

export const HACKCLUB_SCOPE = "openid profile email";
