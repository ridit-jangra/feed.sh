# feed.sh

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Auth (Hack Club)

Sign-in goes through [Hack Club Auth](https://auth.hackclub.com). The CLI opens
the browser, a Supabase Edge Function does the OAuth code exchange (it holds the
client secret), and the CLI receives a Supabase session over a temporary
`localhost` callback.

### 1. Create a Hack Club OAuth app

At https://auth.hackclub.com → Developer Apps → "app me up!". Set the redirect
URI to your deployed function URL:

```
https://<project-ref>.supabase.co/functions/v1/hackclub-auth
```

Request scopes `openid profile email`. Note the **Client ID** and **Client Secret**.

### 2. Deploy the Edge Function

```bash
supabase functions deploy hackclub-auth --no-verify-jwt

supabase secrets set \
  HACKCLUB_CLIENT_ID=... \
  HACKCLUB_CLIENT_SECRET=... \
  HACKCLUB_REDIRECT_URI=https://<project-ref>.supabase.co/functions/v1/hackclub-auth
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### 3. Configure the CLI

In `.env` (see `.env.example`):

```
HACKCLUB_CLIENT_ID=...
HACKCLUB_REDIRECT_URI=https://<project-ref>.supabase.co/functions/v1/hackclub-auth
```

---

This project was created using `bun init` in bun v1.3.13. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
