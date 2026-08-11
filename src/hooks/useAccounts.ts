import { useCallback, useEffect, useState } from "react";
import type { Account, ToastType } from "../types";
import { loadAccounts, persistAccounts } from "../services/storage";
import { ipc } from "../services/ipc";

export type AccountModalView = "list" | "method" | "offline";

export interface AccountsApi {
  account: Account;
  savedAccounts: Account[];
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  newUsernameInput: string;
  setNewUsernameInput: (v: string) => void;
  accountModalView: AccountModalView;
  setAccountModalView: (v: AccountModalView) => void;
  handleAddOffline: () => void;
  handleSelectAccount: (acc: Account) => void;
  handleAddMicrosoft: () => Promise<void>;
  handleDeleteAccount: (accName: string) => void;
}

export function useAccounts(
  t: any,
  onLog: (line: string) => void,
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
    handleAddOffline,
    handleSelectAccount,
    handleAddMicrosoft,
    handleDeleteAccount,
  };
}