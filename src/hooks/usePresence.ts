import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "../services/supabase";
import { ipc } from "../services/ipc";
import type { OmegaAuthApi } from "./useOmegaAuth";

export interface PresenceState {
  status: "online" | "in_game";
  instanceName?: string;
  serverHost?: string;
}

export interface GameStatusInfo {
  instanceName?: string;
  serverHost?: string;
}

export interface InviteInfo {
  fromId: string;
  fromName: string;
  hostPort: string;
  toId?: string;
}

export interface PresenceApi {
  active: boolean;
  presences: Record<string, PresenceState>;
  setGameStatus: (status: GameStatusInfo | null) => void;
  sendInvite: (friendId: string, fromName: string, hostPort: string) => void;
  getMyHost: () => Promise<string>;
}

export function usePresence(
  omega: OmegaAuthApi,
  onInvite?: (invite: InviteInfo) => void,
): PresenceApi {
  const [presences, setPresences] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameStatusRef = useRef<GameStatusInfo | null>(null);
  const onInviteRef = useRef(onInvite);
  onInviteRef.current = onInvite;

  useEffect(() => {
    if (!omega.profile || !supabaseConfigured) {
      setPresences({});
      return;
    }
    const sb = getSupabase();
    const channel = sb.channel("presence:omega", {
      config: { presence: { key: omega.profile.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const mapped: Record<string, PresenceState> = {};
        for (const [key, infos] of Object.entries(state)) {
          const info = infos[infos.length - 1];
          if (!info) continue;
          mapped[key] = {
            status: info.status,
            instanceName: info.instanceName,
            serverHost: info.serverHost,
          };
        }
        setPresences(mapped);
      })
      .on("broadcast", { event: "invite" }, (payload) => {
        const invite = payload.payload as InviteInfo | undefined;
        if (invite && invite.fromId !== omega.profile!.id && invite.toId === omega.profile!.id) {
          onInviteRef.current?.(invite);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            status: gameStatusRef.current ? "in_game" : "online",
            instanceName: gameStatusRef.current?.instanceName,
            serverHost: gameStatusRef.current?.serverHost,
          });
        }
      });
    channelRef.current = channel;
    return () => {
      void sb.removeChannel(channel);
      channelRef.current = null;
      setPresences({});
    };
  }, [omega.profile]);

  const setGameStatus = useCallback((status: GameStatusInfo | null) => {
    gameStatusRef.current = status;
    const channel = channelRef.current;
    if (!channel) return;
    void channel.track({
      status: status ? "in_game" : "online",
      instanceName: status?.instanceName,
      serverHost: status?.serverHost,
    });
  }, []);

  const sendInvite = useCallback((friendId: string, fromName: string, hostPort: string) => {
    const channel = channelRef.current;
    if (!channel || !omega.profile) return;
    void channel.send({
      type: "broadcast",
      event: "invite",
      payload: { fromId: omega.profile.id, fromName, hostPort, toId: friendId },
    });
  }, [omega.profile]);

  const getMyHost = useCallback(async () => {
    const ip = await ipc.getLocalIp();
    return ip ? `${ip}:25565` : "";
  }, []);

  return {
    active: !!omega.profile,
    presences,
    setGameStatus,
    sendInvite,
    getMyHost,
  };
}
