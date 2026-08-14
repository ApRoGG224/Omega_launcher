import { useCallback, useEffect, useState } from "react";
import type { Account, ToastType } from "../types";
import { loadAccounts, persistAccounts } from "../services/storage";
import { ipc } from "../services/ipc";
import type { OmegaAuthApi } from "./useOmegaAuth";

export type AccountModalView = "list" | "method" | "offline" | "omega";
export type OmegaFormMode = "register" | "login";

export interface AccountsApi {
  account: Account;
  savedAccounts: Account[];
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  newUsernameInput: string;
  setNewUsernameInput: (v: string) => void;
  accountModalView: AccountModalView;
  setAccountModalView: (v: AccountModalView) => void;
  omegaMode: OmegaFormMode;
  setOmegaMode: (v: OmegaFormMode) => void;
  omegaEmail: string;
  setOmegaEmail: (v: string) => void;
  omegaUsername: string;
  setOmegaUsername: (v: string) => void;
  omegaPassword: string;
  setOmegaPassword: (v: string) => void;
  omegaBusy: boolean;
  omegaError: string | null;
  handleAddOffline: () => void;
  handleSelectAccount: (acc: Account) => void;
  handleAddMicrosoft: () => Promise<void>;
  handleAddOmega: () => Promise<void>;
  handleDeleteAccount: (accName: string) => void;
}

export function useAccounts(
  t: any,
  onLog: (line: string) => void,
  omega?: OmegaAuthApi,
): AccountsApi {
  const [account, setAccount] = useState<Account>(() => {
    const accounts = loadAccounts();
    return accounts[0] || { name: "NightWolf", type: "offline" };
  });
  const [savedAccounts, setSavedAccounts] = useState<Account[]>(() => {
    const accounts = loadAccounts();
    return accounts.length > 0 ? accounts : [{ name: "NightWolf", type: "offline" }];
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [accountModalView, setAccountModalView] = useState<AccountModalView>("list");
  const [omegaMode, setOmegaMode] = useState<OmegaFormMode>("login");
  const [omegaEmail, setOmegaEmail] = useState("");
  const [omegaUsername, setOmegaUsername] = useState("");
  const [omegaPassword, setOmegaPassword] = useState("");
  const [omegaBusy, setOmegaBusy] = useState(false);
  const [omegaError, setOmegaError] = useState<string | null>(null);

  const syncAccountsToDb = useCallback((accounts: Account[]) => {
    void ipc
      .dbSaveAccounts(accounts.map((a) => ({ name: a.name, type: a.type })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await ipc.dbLoadAccounts();
        if (cancelled) return;
        if (rows.length > 0) {
          const mapped: Account[] = rows.map((r) => ({ name: r.name, type: r.type as Account["type"] }));
          setSavedAccounts(mapped);
          setAccount((prev) => mapped.find((a) => a.name === prev.name) || mapped[0] || prev);
        } else {
          const local = loadAccounts();
          if (local.length > 0) syncAccountsToDb(local);
        }
      } catch {
        // Tauri backend unavailable (browser dev) - localStorage cache is used.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncAccountsToDb]);

  const commitAccounts = useCallback(
    (updated: Account[], nextAccount?: Account) => {
      persistAccounts(updated);
      syncAccountsToDb(updated);
      setSavedAccounts(updated);
      if (nextAccount) setAccount(nextAccount);
    },
    [syncAccountsToDb],
  );

  const handleAddOffline = useCallback(() => {
    const trimmed = newUsernameInput.trim();
    if (trimmed !== "" && /^[a-zA-Z0-9_]{3,16}$/.test(trimmed)) {
      const newAcc: Account = { name: trimmed, type: "offline" };
      commitAccounts([newAcc, ...savedAccounts.filter((a) => a.name !== trimmed)], newAcc);
      setNewUsernameInput("");
      setAccountModalView("list");
    }
  }, [newUsernameInput, savedAccounts, commitAccounts]);

  const handleSelectAccount = useCallback((acc: Account) => {
    commitAccounts([acc, ...savedAccounts.filter((a) => a.name !== acc.name)], acc);
    setProfileMenuOpen(false);
  }, [savedAccounts, commitAccounts]);

  const handleAddMicrosoft = useCallback(async () => {
    try {
      setProfileMenuOpen(false);
      onLog(t.logWaitingBrowser);
      const output = (await ipc.loginMicrosoft()) || "";
      const match = output.match(/SUCCESS:(.+)/);
      if (match && match[1]) {
        const msName = match[1].trim();
        const newAcc: Account = { name: msName, type: "microsoft" };
        commitAccounts([newAcc, ...savedAccounts.filter((a) => a.name !== msName)], newAcc);
        onLog(t.logSuccessLogin + msName);
      } else {
        const errMatch = output.match(/ERROR:(.+)/);
        onLog(t.logLoginError + (errMatch ? errMatch[1].trim() : t.logUnknownError));
      }
    } catch (e: any) {
      onLog("[MS_AUTH_ERR]: " + e);
    }
  }, [t, savedAccounts, commitAccounts, onLog]);

  const handleAddOmega = useCallback(async () => {
    if (!omega || !omega.configured) {
      setOmegaError(t.omegaNotConfigured);
      return;
    }
    setOmegaBusy(true);
    setOmegaError(null);
    try {
      let omegaName: string | null = null;
      if (omegaMode === "register") {
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(omegaUsername.trim())) {
          setOmegaError(t.nicknameRules);
          return;
        }
        omegaName = (await omega.register(omegaEmail.trim(), omegaUsername.trim(), omegaPassword)).username;
      } else {
        omegaName = (await omega.login(omegaEmail.trim(), omegaPassword)).username;
      }
      const newAcc: Account = { name: omegaName, type: "omega" };
      commitAccounts([newAcc, ...savedAccounts.filter((a) => a.name !== omegaName)], newAcc);
      setOmegaEmail("");
      setOmegaUsername("");
      setOmegaPassword("");
      setAccountModalView("list");
      setProfileMenuOpen(false);
      onLog(t.omegaSuccess + omegaName);
    } catch (e: any) {
      setOmegaError(e?.message || t.omegaLoginError);
    } finally {
      setOmegaBusy(false);
    }
  }, [omega, omegaMode, omegaEmail, omegaUsername, omegaPassword, t, savedAccounts, commitAccounts, onLog]);

  const handleDeleteAccount = useCallback((accName: string) => {
    const updated = savedAccounts.filter((a) => a.name !== accName);
    persistAccounts(updated);
    setSavedAccounts(updated);
    if (account.name === accName && updated.length > 0) {
      setAccount(updated[0]);
    }
  }, [savedAccounts, account.name]);

  return {
    account,
    savedAccounts,
    profileMenuOpen,
    setProfileMenuOpen,
    newUsernameInput,
    setNewUsernameInput,
    accountModalView,
    setAccountModalView,
    omegaMode,
    setOmegaMode,
    omegaEmail,
    setOmegaEmail,
    omegaUsername,
    setOmegaUsername,
    omegaPassword,
    setOmegaPassword,
    omegaBusy,
    omegaError,
    handleAddOffline,
    handleSelectAccount,
    handleAddMicrosoft,
    handleAddOmega,
    handleDeleteAccount,
  };
}