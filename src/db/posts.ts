import { supabase } from "../utils/supabase";
import type { Post } from "../types";

type PostRow = {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  parent_id: string | null;
  created_at: string;
  likes: { count: number }[];
  replies: { count: number }[];
};

function hydrate(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    content: row.content,
    parentId: row.parent_id,
    createdAt: new Date(row.created_at),
    likes: row.likes?.[0]?.count ?? 0,
    replies: row.replies?.[0]?.count ?? 0,
  };
}

const SELECT =
  "id, author_id, title, content, parent_id, created_at, " +
  "likes:likes(count), replies:posts!parent_id(count)";

export async function getFeed(limit = 50, offset = 0): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data as unknown as PostRow[]).map(hydrate);
}

export async function createPost(
  title: string | null,
  content: string,
  parentId: string | null = null,
): Promise<Post> {
  const { data: auth } = await supabase.auth.getUser();
  const authorId = auth.user?.id;
  if (!authorId) throw new Error("not logged in");

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: authorId, title, content, parent_id: parentId })
    .select(SELECT)
    .single();

  if (error) throw error;
  return hydrate(data as unknown as PostRow);
}

export async function getReplies(parentId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as PostRow[]).map(hydrate);
}

export async function search(term: string, limit = 50): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT)
    .or(`content.ilike.%${term}%,title.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as PostRow[]).map(hydrate);
}

export async function toggleLike(postId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("not logged in");

  const { data: existing } = await supabase
    .from("likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    return false;
  }
  await supabase.from("likes").insert({ post_id: postId, user_id: userId });
  return true;
}
