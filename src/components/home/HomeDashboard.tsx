import React from "react";
import type { Language, ModpackInstance } from "../../types";
import { RecentInstancesPanel } from "./RecentInstancesPanel";
import { ServersPanel } from "./ServersPanel";
import { ConsolePanel } from "./ConsolePanel";
import { FriendsPanel } from "./FriendsPanel";

export const HomeDashboard = React.memo(({
  instances,
  selectedInstanceId,
  selectedInstance,
  logs,
  isRunning,
  consoleOpen,
  onToggleConsole,
  onSelectInstance,
  onPlayInstance,
  onCreate,
}: {
  instances: ModpackInstance[];
  selectedInstanceId: string | null;
  selectedInstance: ModpackInstance | null;
  logs: string[];
  isRunning: boolean;
  consoleOpen: boolean;
  onToggleConsole: () => void;
  onSelectInstance: (id: string) => void;
  onPlayInstance: (id: string) => void;
  onCreate: () => void;
}) => {
  return (
    <div className="home-sketch-dashboard">
      <RecentInstancesPanel
        instances={instances}
        selectedInstanceId={selectedInstanceId}
        onSelectInstance={onSelectInstance}
        onPlayInstance={onPlayInstance}
        onCreate={onCreate}
      />
      <ServersPanel />
      <ConsolePanel
        logs={logs}
        isRunning={isRunning}
        consoleOpen={consoleOpen}
        onToggleConsole={onToggleConsole}
        selectedInstance={selectedInstance}
      />
      <FriendsPanel />
    </div>
  );
});