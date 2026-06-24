import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function requestCode(email: string): Promise<AuthResult<null>> {
  const trimmed = email.trim().toLowerCase();
  if (!isValidEmail(trimmed)) {
    return { ok: false, error: "that doesn't look like an email" };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: { shouldCreateUser: true },
  });

  if (error) return { ok: false, error: humanize(error.message) };
  return { ok: true, data: null };
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<AuthResult<{ session: Session; user: User }>> {
  const trimmed = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const { data, error } = await supabase.auth.verifyOtp({
    email: trimmed,
    token: cleanCode,
    type: "email",
  });

  if (error) return { ok: false, error: humanize(error.message) };
  if (!data.session || !data.user) {
    return { ok: false, error: "verification failed, try again" };
  }

  return { ok: true, data: { session: data.session, user: data.user } };
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function humanize(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many"))
    return "too many attempts — wait a minute and try again";
  if (m.includes("expired")) return "that code expired — request a new one";
  if (m.includes("invalid")) return "that code isn't right";
  return msg;
}
