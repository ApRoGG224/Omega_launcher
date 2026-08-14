import { getSupabase } from "./supabase";

export interface OmegaProfile {
  id: string;
  username: string;
  friend_code: string;
  avatar_url?: string | null;
}

const FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateFriendCode(): string {
  const rand = new Uint32Array(6);
  crypto.getRandomValues(rand);
  let code = "OMG-";
  for (let i = 0; i < 6; i++) {
    code += FRIEND_CODE_ALPHABET[rand[i] % FRIEND_CODE_ALPHABET.length];
  }
  return code;
}

function rowToProfile(row: any): OmegaProfile {
  return {
    id: row.id,
    username: row.username,
    friend_code: row.friend_code,
    avatar_url: row.avatar_url ?? null,
  };
}

export async function updateOmegaAvatar(dataUrl: string): Promise<OmegaProfile> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Not logged in");
  const { error } = await sb.from("profiles").update({ avatar_url: dataUrl }).eq("id", uid);
  if (error) throw new Error(error.message);
  return { id: uid, username: "", friend_code: "", avatar_url: dataUrl };
}

export async function resizeAvatarImage(file: File, size = 128): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not available"));
      const min = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - min) / 2,
        (img.height - min) / 2,
        min,
        min,
        0,
        0,
        size,
        size,
      );
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Invalid image file"));
    img.src = dataUrl;
  });
}

export async function omegaRegister(email: string, username: string, password: string): Promise<OmegaProfile> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw new Error(error.message);
  const user = data.user;
  if (!user) throw new Error("Registration failed");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFriendCode();
    const { error: insertError } = await sb
      .from("profiles")
      .insert({ id: user.id, username, friend_code: code });
    if (!insertError) return { id: user.id, username, friend_code: code };
  }
  throw new Error("Could not generate a unique friend code");
}

export async function omegaLogin(email: string, password: string): Promise<OmegaProfile> {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  const profile = await omegaGetProfile();
  if (!profile) throw new Error("Profile not found");
  return profile;
}

export async function omegaLogout(): Promise<void> {
  const sb = getSupabase();
  await sb.auth.signOut();
}

export async function omegaGetSession() {
  const sb = getSupabase();
  return (await sb.auth.getSession()).data.session;
}

export async function omegaGetProfile(): Promise<OmegaProfile | null> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return null;
  const { data: row } = await sb
    .from("profiles")
    .select("id, username, friend_code, avatar_url")
    .eq("id", uid)
    .maybeSingle();
  return row ? rowToProfile(row) : null;
}
