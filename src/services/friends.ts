import { getSupabase } from "./supabase";
import type { OmegaProfile } from "./omega";

export interface FriendEntry {
  id: string;
  username: string;
  friend_code: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
}

export interface FriendsData {
  friends: FriendEntry[];
  requests: FriendEntry[];
}

async function currentUserId(): Promise<string> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user?.id) throw new Error("Not logged in");
  return data.user.id;
}

export async function searchProfiles(query: string): Promise<OmegaProfile[]> {
  const sb = getSupabase();
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data, error } = await sb.rpc("search_profiles", { query: trimmed });
  if (error) throw new Error(error.message);
  return (data ?? []) as OmegaProfile[];
}

export async function sendFriendRequest(friendId: string): Promise<void> {
  const sb = getSupabase();
  const me = await currentUserId();
  const { error } = await sb
    .from("friends")
    .insert({ user_id: me, friend_id: friendId, status: "pending" });
  if (error) throw new Error(error.message);
}

export async function acceptFriendRequest(friendId: string): Promise<void> {
  const sb = getSupabase();
  const me = await currentUserId();
  const { error } = await sb
    .from("friends")
    .update({ status: "accepted" })
    .eq("user_id", friendId)
    .eq("friend_id", me);
  if (error) throw new Error(error.message);
}

export async function declineFriendRequest(friendId: string): Promise<void> {
  const sb = getSupabase();
  const me = await currentUserId();
  const { error } = await sb
    .from("friends")
    .delete()
    .eq("user_id", friendId)
    .eq("friend_id", me);
  if (error) throw new Error(error.message);
}

export async function removeFriend(friendId: string): Promise<void> {
  const sb = getSupabase();
  const me = await currentUserId();
  await sb.from("friends").delete().eq("user_id", me).eq("friend_id", friendId);
  await sb.from("friends").delete().eq("user_id", friendId).eq("friend_id", me);
}

export async function loadFriends(): Promise<FriendsData> {
  const sb = getSupabase();
  const me = await currentUserId();
  const { data: rows, error } = await sb
    .from("friends")
    .select("user_id, friend_id, status")
    .or(`user_id.eq.${me},friend_id.eq.${me}`);
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return { friends: [], requests: [] };

  const ids = rows.map((r) => (r.user_id === me ? r.friend_id : r.user_id));
  const { data: profiles, error: profileError } = await sb
    .from("profiles")
    .select("id, username, friend_code")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const friends: FriendEntry[] = [];
  const requests: FriendEntry[] = [];
  for (const row of rows) {
    const isOutgoing = row.user_id === me;
    const counterpartId = isOutgoing ? row.friend_id : row.user_id;
    const profile = byId.get(counterpartId);
    if (!profile) continue;
    const entry: FriendEntry = {
      id: counterpartId,
      username: profile.username,
      friend_code: profile.friend_code,
      status: row.status,
      direction: isOutgoing ? "outgoing" : "incoming",
    };
    if (row.status === "accepted") friends.push(entry);
    else requests.push(entry);
  }
  friends.sort((a, b) => a.username.localeCompare(b.username));
  return { friends, requests };
}
