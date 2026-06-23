import { Database } from "bun:sqlite";
import { randomUUID } from "crypto";
import type { Post } from "../types";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const DB_PATH = join(__dirname, "../../test-db/", "feed.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id          TEXT PRIMARY KEY,
    author_id   TEXT NOT NULL,
    content     TEXT NOT NULL,
    parent_id   TEXT REFERENCES posts(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    synced      INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS likes (
    post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    synced      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_posts_created  ON posts(created_at);
  CREATE INDEX IF NOT EXISTS idx_posts_parent   ON posts(parent_id);
  CREATE INDEX IF NOT EXISTS idx_likes_post     ON likes(post_id);
`);

const insertPostStmt = db.query(`
  INSERT INTO posts (id, author_id, content, parent_id, created_at, synced)
  VALUES ($id, $author, $content, $parent, $created, 0)
`);

const toggleLikeInsert = db.query(`
  INSERT OR IGNORE INTO likes (post_id, user_id, created_at, synced)
  VALUES ($post, $user, $created, 0)
`);
const toggleLikeDelete = db.query(`
  DELETE FROM likes WHERE post_id = $post AND user_id = $user
`);
const hasLikeStmt = db.query(
  `SELECT 1 FROM likes WHERE post_id = $post AND user_id = $user`,
);

const feedStmt = db.query(`
  SELECT
    p.id, p.author_id AS authorId, p.content,
    p.parent_id AS parentId, p.created_at AS createdAt,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)              AS likes,
    (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id)           AS replies
  FROM posts p
  WHERE p.parent_id IS NULL
  ORDER BY p.created_at DESC
  LIMIT $limit OFFSET $offset
`);

const repliesStmt = db.query(`
  SELECT
    p.id, p.author_id AS authorId, p.content,
    p.parent_id AS parentId, p.created_at AS createdAt,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)              AS likes,
    0                                                                 AS replies
  FROM posts p
  WHERE p.parent_id = $parent
  ORDER BY p.created_at ASC
`);

const searchStmt = db.query(`
  SELECT
    p.id, p.author_id AS authorId, p.content,
    p.parent_id AS parentId, p.created_at AS createdAt,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)              AS likes,
    (SELECT COUNT(*) FROM posts r WHERE r.parent_id = p.id)           AS replies
  FROM posts p
  WHERE p.content LIKE $q
  ORDER BY p.created_at DESC
  LIMIT $limit
`);

export function createPost(
  authorId: string,
  content: string,
  parentId: string | null = null,
): Post {
  const id = randomUUID();
  const createdAtMs = Date.now();
  insertPostStmt.run({
    $id: id,
    $author: authorId,
    $content: content,
    $parent: parentId,
    $created: createdAtMs,
  });
  return {
    id,
    authorId,
    content,
    parentId,
    createdAt: new Date(createdAtMs),
    likes: 0,
    replies: 0,
  };
}

type PostRow = Omit<Post, "createdAt"> & { createdAt: number };

function hydrate(row: PostRow): Post {
  return { ...row, createdAt: new Date(row.createdAt) };
}

export function replyTo(
  authorId: string,
  parentId: string,
  content: string,
): Post {
  return createPost(authorId, content, parentId);
}
export function getFeed(limit = 50, offset = 0): Post[] {
  return (feedStmt.all({ $limit: limit, $offset: offset }) as PostRow[]).map(
    hydrate,
  );
}

export function getReplies(parentId: string): Post[] {
  return (repliesStmt.all({ $parent: parentId }) as PostRow[]).map(hydrate);
}

export function search(term: string, limit = 50): Post[] {
  return (searchStmt.all({ $q: `%${term}%`, $limit: limit }) as PostRow[]).map(
    hydrate,
  );
}

export function toggleLike(postId: string, userId: string): boolean {
  const liked = hasLikeStmt.get({ $post: postId, $user: userId });
  if (liked) {
    toggleLikeDelete.run({ $post: postId, $user: userId });
    return false;
  }
  toggleLikeInsert.run({ $post: postId, $user: userId, $created: Date.now() });
  return true;
}

export { db };
