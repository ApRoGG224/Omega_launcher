import { useCallback, useEffect, useState } from "react";
import {
  acceptFriendRequest,
  declineFriendRequest,
  loadFriends,
  removeFriend,
  searchProfiles,
  sendFriendRequest,
  type FriendEntry,
} from "../services/friends";
import { resizeAvatarImage } from "../services/omega";
import type { OmegaProfile } from "../services/omega";
import type { OmegaAuthApi } from "./useOmegaAuth";

export interface FriendsApi {
  active: boolean;
  ownCode: string | null;
  ownUsername: string | null;
  ownAvatar: string | null;
  updateOwnAvatar: (file: File) => Promise<void>;
  friends: FriendEntry[];
  requests: FriendEntry[];
  loading: boolean;
  addByCode: (code: string) => Promise<void>;
  acceptRequest: (friendId: string) => Promise<void>;
  declineRequest: (friendId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFriends(omega: OmegaAuthApi): FriendsApi {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!omega.profile) {
      setFriends([]);
      setRequests([]);
      return;
    }
    try {
      setLoading(true);
      const data = await loadFriends();
      setFriends(data.friends);
      setRequests(data.requests);
    } catch {
      // supabase unavailable (no .env / offline) - keep last state
    } finally {
      setLoading(false);
    }
  }, [omega.profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addByCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!omega.profile || !trimmed) return;
      const results = await searchProfiles(trimmed);
      const me = omega.profile.id;
      let match = results.find(
        (p) => p.friend_code.toUpperCase() === trimmed.toUpperCase() && p.id !== me,
      );
      if (!match) {
        match = results.find(
          (p) => p.username.toLowerCase() === trimmed.toLowerCase() && p.id !== me,
        );
      }
      if (!match) throw new Error("friendNotFound");
      await sendFriendRequest(match.id);
      await refresh();
    },
    [omega.profile, refresh],
  );

  const acceptRequest = useCallback(
    async (friendId: string) => {
      await acceptFriendRequest(friendId);
      await refresh();
    },
    [refresh],
  );

  const declineRequest = useCallback(
    async (friendId: string) => {
      await declineFriendRequest(friendId);
      await refresh();
    },
    [refresh],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      await removeFriend(friendId);
      await refresh();
    },
    [refresh],
  );

  const updateOwnAvatar = useCallback(
    async (file: File) => {
      if (!omega.profile) return;
      const dataUrl = await resizeAvatarImage(file);
      await omega.updateAvatar(dataUrl);
    },
    [omega],
  );

  return {
    active: !!omega.profile,
    ownCode: omega.profile?.friend_code ?? null,
    ownUsername: omega.profile?.username ?? null,
    ownAvatar: omega.profile?.avatar_url ?? null,
    updateOwnAvatar,
    friends,
    requests,
    loading,
    addByCode,
    acceptRequest,
    declineRequest,
    removeFriend,
    refresh,
  };
}
