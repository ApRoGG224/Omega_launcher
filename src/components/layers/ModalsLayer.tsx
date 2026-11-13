import React from "react";
import { OmegaStoreModal } from "../modals/OmegaStoreModal";
import { InstancesModal } from "../modals/InstancesModal";
import { AccountsModal } from "../modals/AccountsModal";
import { SettingsModal } from "../modals/SettingsModal";
import { FriendsModal } from "../modals/FriendsModal";
import type {
  ActiveModal,
  InstanceData,
  AccountData,
} from "../../types";
import "../../styles/layer4-modals.css";

interface ModalsLayerProps {
  activeModal: ActiveModal;
  onClose: () => void;
  // Store props
  onEquipSkin: (skinUrl: string, model: "default" | "slim") => void;
  onEquipCape: (capeUrl: string) => void;
  // Instances props
  instances: InstanceData[];
  selectedInstanceId: string;
  onSelectInstance: (instance: InstanceData) => void;
  onCreateInstance: (instance: InstanceData) => void;
  onLaunchInstance: (instance: InstanceData) => void;
  // Accounts props
  account: AccountData;
  onSelectAccount: (acc: AccountData) => void;
}

export const ModalsLayer: React.FC<ModalsLayerProps> = ({
  activeModal,
  onClose,
  onEquipSkin,
  onEquipCape,
  instances,
  selectedInstanceId,
  onSelectInstance,
  onCreateInstance,
  onLaunchInstance,
  account,
  onSelectAccount,
}) => {
  if (!activeModal) return null;

  return (
    <div className="layer-modals-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} />
      {activeModal === "store" && (
        <OmegaStoreModal
          onClose={onClose}
          onEquipSkin={onEquipSkin}
          onEquipCape={onEquipCape}
        />
      )}

      {activeModal === "instances" && (
        <InstancesModal
          onClose={onClose}
          instances={instances}
          selectedInstanceId={selectedInstanceId}
          onSelectInstance={onSelectInstance}
          onCreateInstance={onCreateInstance}
        />
      )}

      {activeModal === "accounts" && (
        <AccountsModal
          onClose={onClose}
          activeAccount={account}
          onSelectAccount={onSelectAccount}
        />
      )}

      {activeModal === "settings" && (
        <SettingsModal
          onClose={onClose}
        />
      )}

      {activeModal === "friends" && <FriendsModal onClose={onClose} />}
    </div>
  );
};
