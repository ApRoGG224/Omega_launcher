import React from "react";
import type { ModpackInstance } from "../../types";
import { RecentInstancesPanel } from "./RecentInstancesPanel";
import { ServersPanel } from "./ServersPanel";
import { ConsolePanel } from "./ConsolePanel";
import { FriendsPanel } from "./FriendsPanel";
import type { FriendsApi } from "../../hooks/useFriends";
import type { InviteInfo, PresenceApi } from "../../hooks/usePresence";

export const HomeDashboard = React.memo(({
  t,
  instances,
  selectedInstanceId,
  selectedInstance,
  logs,
  isRunning,
  consoleOpen,
  friendsApi,
  presenceApi,
  invites,
  onDismissInvite,
  onToggleConsole,
  onSelectInstance,
  onPlayInstance,
  onServerLaunch,
  onNotify,
  onCreate,
}: {
  t: any;
  instances: ModpackInstance[];
  selectedInstanceId: string | null;
  selectedInstance: ModpackInstance | null;
  logs: string[];
  isRunning: boolean;
  consoleOpen: boolean;
  friendsApi: FriendsApi;
  presenceApi: PresenceApi;
  invites: InviteInfo[];
  onDismissInvite: (fromId: string) => void;
  onToggleConsole: () => void;
  onSelectInstance: (id: string) => void;
  onPlayInstance: (id: string) => void;
  onServerLaunch: (instanceId: string, serverHostPort: string) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
  onCreate: () => void;
}) => {
  return (
    <div className="home-sketch-dashboard">
      <div className="home-glow-overlay" aria-hidden="true">
        <div className="home-glow-icon">
          <img src="/icons/128x128.png" alt="" />
        </div>
      </div>
      <div className="home-dashboard-panels">
        <RecentInstancesPanel
          t={t}
          instances={instances}
          selectedInstanceId={selectedInstanceId}
          onSelectInstance={onSelectInstance}
          onPlayInstance={onPlayInstance}
          onCreate={onCreate}
        />
        <ServersPanel instances={instances} onLaunch={onServerLaunch} t={t} />
        <ConsolePanel
          t={t}
          logs={logs}
          isRunning={isRunning}
          consoleOpen={consoleOpen}
          onToggleConsole={onToggleConsole}
          selectedInstance={selectedInstance}
        />
        <FriendsPanel
          t={t}
          friends={friendsApi}
          presence={presenceApi}
          instances={instances}
          invites={invites}
          onDismissInvite={onDismissInvite}
          onLaunch={onServerLaunch}
          onNotify={onNotify}
        />
      </div>
    </div>
  );
});