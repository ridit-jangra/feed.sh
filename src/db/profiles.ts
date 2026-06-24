import { supabase } from "../utils/supabase";

export type Profile = {
  id: string;
  handle: string;
  displayName: string;
};

type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
};

export type ProfileWithStats = Profile & {
  postCount: number;
  createdAt: Date;
};

function hydrate(row: ProfileRow): Profile {
  return { id: row.id, handle: row.handle, displayName: row.display_name };
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? hydrate(data as ProfileRow) : null;
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("handle")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return !data;
}

export async function createProfile(
  handle: string,
  displayName: string,
): Promise<Profile> {
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) throw new Error("not logged in");

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id, handle: handle.toLowerCase(), display_name: displayName })
    .select("id, handle, display_name")
    .single();

  if (error) throw error;
  return hydrate(data as ProfileRow);
}

export async function getProfiles(
  ids: string[],
): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", ids);

  if (error) throw error;
  const map = new Map<string, Profile>();
  (data as ProfileRow[]).forEach((r) => map.set(r.id, hydrate(r)));
  return map;
}

export async function getProfileByHandle(handle: string) {
  const clean = handle.replace(/^@/, "").toLowerCase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, created_at")
    .eq("handle", clean)
    .maybeSingle();

  if (error) {
    console.error("profile query error:", error);
    throw error;
  }
  if (!data) return null;

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", (data as any).id)
    .is("parent_id", null);

  const row = data as any;
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    createdAt: new Date(row.created_at),
    postCount: count ?? 0,
  };
}

export async function getPostsByAuthor(authorId: string, limit = 50) {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, author_id, title, content, parent_id, created_at, " +
        "likes:likes(count), replies:posts!parent_id(count)",
    )
    .eq("author_id", authorId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as any[];
}
