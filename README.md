# feed.sh

A tiny social feed that lives where you already do — the command line. Sign in,
scroll, post, like, and reply without ever leaving your shell. It's built with
[Ink](https://github.com/vadimdemedes/ink) (React for the terminal), so it feels
like a real app, not a wall of `curl` output.

```
  feed.sh
  ────────────────────────────────────
  @alice · 2m
  shipped my first terminal app today 🚀
  ♥ 12   💬 3

  @bob · 5m
  who needs a browser anyway
  ♥ 8    💬 1
  ────────────────────────────────────
  › create
```

## What it does

- **Post without leaving the keyboard.** Type `create`, write your post,
  hit `done`. That's it.
- **Like and reply inline.** Select any post and press `l` to like it or `r` to
  open the thread and jump into the conversation.
- **Threads.** Every post can be opened into a full reply thread, and you can
  compose your reply right there.
- **Profiles.** Run `profile` to see your own, or `profile @handle` to peek at
  someone else's — handle, bio, and their stats.
- **Search.** `search <words>` filters the feed down to what you're looking for.
- **A real command bar.** Commands with autocomplete, tab-completion,
  and up/down history — like a shell prompt that talks back.
- **Sign in with Hack Club.** One-tap OAuth through your browser; your session is
  saved locally so you stay logged in.
- **Mouse and keyboard friendly.** Scroll with the wheel.

## Commands

| Command           | What it does                      |
| ----------------- | --------------------------------- |
| `feed`            | Reload the main feed              |
| `create`          | Start composing a new post        |
| `done`            | Publish the post you're composing |
| `search <query>`  | Search posts                      |
| `profile`         | View your own profile             |
| `profile @handle` | View someone else's profile       |

**Keys (in the feed):** `↑`/`↓` to move between posts, `l` to like, `r` to open
the thread. **In a thread:** `r` to reply, `Esc` to go back.

## Install

The fastest way to start scrolling:

```sh
bunx @ridit/feed.sh
```

Or install it globally:

```sh
npm install -g @ridit/feed.sh
feed.sh
```

---

## Local setup

Want to hack on it? You'll need [Bun](https://bun.sh) and a
[Supabase](https://supabase.com) project (with Hack Club OAuth configured).

```sh
# 1. clone & install
git clone https://github.com/ridit-jangra/Feed.sh.git
cd feed.sh
bun install

# 2. configure environment
cp .env.example .env
```

Fill in `.env`:

```sh
SUPABASE_URL=          # your Supabase project URL
SUPABASE_ANON_KEY=     # your Supabase anon/public key
HACKCLUB_CLIENT_ID=    # Hack Club OAuth client id
HACKCLUB_REDIRECT_URI= # OAuth redirect, e.g. http://<project_id>.supabse.com:...
```

> Bun loads `.env` automatically — no `dotenv` needed.

```sh
# 3. run in dev (hot reload)
bun run dev

# 4. build the distributable CLI
bun run build      # outputs dist/index.mjs
```

The Supabase edge function that powers Hack Club auth lives in
`supabase/functions/hackclub-auth`. Local config and your saved session are
written to `~/.feed.sh/`.

### Scripts

| Script            | Does                            |
| ----------------- | ------------------------------- |
| `bun run dev`     | Run from source with hot reload |
| `bun run build`   | Bundle the CLI to `dist/`       |
| `bun run lint`    | Lint `src/`                     |
| `bun run format`  | Format `src/` with Prettier     |
| `bun run release` | Cut a release (patch)           |

## License

MIT © [Ridit Jangra](https://ridit.space)
