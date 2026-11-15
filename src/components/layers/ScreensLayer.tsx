import React, { useEffect } from "react";
import { StoreScreen } from "../screens/StoreScreen";
import { InstancesScreen } from "../screens/InstancesScreen";
import { ModrinthScreen } from "../screens/ModrinthScreen";
import { AccountsScreen } from "../screens/AccountsScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { ServersScreen } from "../screens/ServersScreen";
import { ConsoleScreen } from "../screens/ConsoleScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import type { InstanceData, AccountData } from "../../types";

export type ScreenId =
  | "home"
  | "store"
  | "instances"
  | "modrinth"
  | "accounts"
  | "friends"
  | "servers"
  | "console"
  | "settings";

interface ScreensLayerProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  // Store props
  onEquipSkin: (skinUrl: string, model: "default" | "slim") => void;
  onEquipCape: (capeUrl: string | null) => void;
  // Instances props
  instances: InstanceData[];
  selectedInstanceId: string;
  onSelectInstance: (instance: InstanceData) => void;
  onCreateInstance: (instance: InstanceData) => void;
  onDeleteInstance?: (id: string) => void;
  onUpdateInstance?: (instance: InstanceData) => void;
  onLaunchInstance: (instance: InstanceData) => void;
  // Accounts props
  account: AccountData;
  accounts?: AccountData[];
  omegaAccount?: import("../../types").OmegaAccountState;
  onSelectAccount: (acc: AccountData) => void;
  onOpenOmegaLogin?: () => void;
  onUnlinkOmega?: () => void;
  onCreateOfflineAccount?: (name: string) => void;
  onDeleteAccount?: (id: string) => void;
  onLoginMicrosoft?: () => Promise<void>;
  onLoginEly?: () => Promise<void>;
  // Console props
  logs?: import("../screens/ConsoleScreen").LogEntry[];
  onClearLogs?: () => void;
  // Direct connect
  onDirectConnect: (serverName: string, ip: string) => void;
  // Game running state
  isRunning: boolean;
  // Settings props
  bgIndex: number;
  isBgAutoPlay: boolean;
  onSelectBg: (index: number) => void;
  onNextBg: () => void;
  onPrevBg: () => void;
  onToggleBgAutoPlay: () => void;
  onInstallMod: (modName: string) => void;
  onInstallModpack?: (modpack: { title: string; author?: string; desc?: string; loaders?: string[] }) => void;
  // Appearance customization
  topBarLayout?: import("../../constants/launcherLayout").TopBarItemId[];
  onSaveTopBarLayout?: (layout: import("../../constants/launcherLayout").TopBarItemId[]) => void;
  onResetTopBarLayout?: () => void;
  bottomBarLayout?: import("../../constants/launcherLayout").BottomBarItemId[];
  onSaveBottomBarLayout?: (layout: import("../../constants/launcherLayout").BottomBarItemId[], alignment?: import("../../constants/launcherLayout").BottomBarAlignment) => void;
  onResetBottomBarLayout?: () => void;
  bottomBarAlignment?: import("../../constants/launcherLayout").BottomBarAlignment;
  onChangeBottomBarAlignment?: (alignment: import("../../constants/launcherLayout").BottomBarAlignment) => void;
  buttonShapePreset?: import("../../constants/launcherLayout").ButtonShapePreset;
  onChangeButtonShapePreset?: (preset: import("../../constants/launcherLayout").ButtonShapePreset) => void;
  skinUrl?: string;
  selectedInstance?: InstanceData | null;
  menusCustomization?: import("../../types/menuCustomization").MenusCustomizationState;
  onOpenMenuCustomizer?: (zone: import("../../types/menuCustomization").CustomizerZoneId) => void;
  onUpdateMenusCustomization?: (state: import("../../types/menuCustomization").MenusCustomizationState) => void;
  onResetZoneCustomization?: (zone: import("../../types/menuCustomization").CustomizerZoneId) => void;
}

export const ScreensLayer: React.FC<ScreensLayerProps> = React.memo(({
  activeScreen,
  onNavigate,
  onEquipSkin,
  onEquipCape,
  instances,
  selectedInstanceId,
  onSelectInstance,
  onCreateInstance,
  onDeleteInstance,
  onUpdateInstance,
  onLaunchInstance,
  account,
  accounts = [],
  omegaAccount,
  onSelectAccount,
  onOpenOmegaLogin,
  onUnlinkOmega,
  onCreateOfflineAccount,
  onDeleteAccount,
  onLoginMicrosoft,
  onLoginEly,
  logs,
  onClearLogs,
  onDirectConnect,
  isRunning,
  bgIndex,
  isBgAutoPlay,
  onSelectBg,
  onNextBg,
  onPrevBg,
  onToggleBgAutoPlay,
  onInstallMod,
  onInstallModpack,
  topBarLayout,
  onSaveTopBarLayout,
  onResetTopBarLayout,
  bottomBarLayout,
  onSaveBottomBarLayout,
  onResetBottomBarLayout,
  bottomBarAlignment,
  onChangeBottomBarAlignment,
  buttonShapePreset,
  onChangeButtonShapePreset,
  skinUrl,
  selectedInstance,
  menusCustomization,
  onOpenMenuCustomizer,
  onUpdateMenusCustomization,
  onResetZoneCustomization,
}) => {
  // Global Escape key returns to Home (FEATURES.md Section 10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeScreen !== "home") {
        onNavigate("home");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeScreen, onNavigate]);

  if (activeScreen === "home") {
    return null; // Home screen shows 3D stage and launch dock directly
  }

  return (
    <>
      {activeScreen === "store" && (
        <StoreScreen
          onBack={() => onNavigate("home")}
          onEquipSkin={onEquipSkin}
          onEquipCape={onEquipCape}
          currentSkinUrl={skinUrl}
          account={account}
          onLoginMicrosoft={onLoginMicrosoft}
        />
      )}

      {activeScreen === "instances" && (
        <InstancesScreen
          onBack={() => onNavigate("home")}
          instances={instances}
          selectedInstanceId={selectedInstanceId}
          onSelectInstance={onSelectInstance}
          onCreateInstance={onCreateInstance}
          onDeleteInstance={onDeleteInstance}
          onUpdateInstance={onUpdateInstance}
          onLaunchInstance={onLaunchInstance}
        />
      )}

      {activeScreen === "modrinth" && (
        <ModrinthScreen
          onBack={() => onNavigate("home")}
          onInstallMod={onInstallMod}
          onInstallModpack={onInstallModpack}
        />
      )}

      {activeScreen === "accounts" && (
        <AccountsScreen
          onBack={() => onNavigate("home")}
          activeAccount={account}
          accounts={accounts}
          onSelectAccount={onSelectAccount}
          omegaAccount={omegaAccount}
          onOpenOmegaLogin={onOpenOmegaLogin}
          onUnlinkOmega={onUnlinkOmega}
          onCreateOfflineAccount={onCreateOfflineAccount}
          onDeleteAccount={onDeleteAccount}
          onLoginMicrosoft={onLoginMicrosoft}
          onLoginEly={onLoginEly}
        />
      )}

      {activeScreen === "friends" && (
        <FriendsScreen
          onBack={() => onNavigate("home")}
          onJoinFriend={onDirectConnect}
        />
      )}

      {activeScreen === "servers" && (
        <ServersScreen
          onBack={() => onNavigate("home")}
          onDirectConnect={onDirectConnect}
        />
      )}

      {activeScreen === "console" && (
        <ConsoleScreen
          onBack={() => onNavigate("home")}
          isRunning={isRunning}
          logs={logs}
          onClearLogs={onClearLogs}
        />
      )}

      {activeScreen === "settings" && (
        <SettingsScreen
          onBack={() => onNavigate("home")}
          bgIndex={bgIndex}
          isBgAutoPlay={isBgAutoPlay}
          onSelectBg={onSelectBg}
          onNextBg={onNextBg}
          onPrevBg={onPrevBg}
          onToggleBgAutoPlay={onToggleBgAutoPlay}
          topBarLayout={topBarLayout}
          onSaveTopBarLayout={onSaveTopBarLayout}
          onResetTopBarLayout={onResetTopBarLayout}
          bottomBarLayout={bottomBarLayout}
          onSaveBottomBarLayout={onSaveBottomBarLayout}
          onResetBottomBarLayout={onResetBottomBarLayout}
          bottomBarAlignment={bottomBarAlignment}
          onChangeBottomBarAlignment={onChangeBottomBarAlignment}
          buttonShapePreset={buttonShapePreset}
          onChangeButtonShapePreset={onChangeButtonShapePreset}
          account={account}
          skinUrl={skinUrl}
          selectedInstance={selectedInstance}
          instances={instances}
          menusCustomization={menusCustomization}
          onOpenMenuCustomizer={onOpenMenuCustomizer}
          onUpdateMenusCustomization={onUpdateMenusCustomization}
          onResetZoneCustomization={onResetZoneCustomization}
        />
      )}
    </>
  );
});
