import { useCallback, useEffect, useState } from "react";
import { supabaseConfigured } from "../services/supabase";
import {
  omegaGetProfile,
  omegaGetSession,
  omegaLogin,
  omegaLogout,
  omegaRegister,
  type OmegaProfile,
} from "../services/omega";

export interface OmegaAuthApi {
  configured: boolean;
  loading: boolean;
  profile: OmegaProfile | null;
  register: (email: string, username: string, password: string) => Promise<OmegaProfile>;
  login: (email: string, password: string) => Promise<OmegaProfile>;
  logout: () => Promise<void>;
}

export function useOmegaAuth(): OmegaAuthApi {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<OmegaProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const session = await omegaGetSession();
        if (cancelled) return;
        if (!session) {
          setProfile(null);
          return;
        }
        const p = await omegaGetProfile();
        if (!cancelled) setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const p = await omegaRegister(email, username, password);
    setProfile(p);
    return p;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const p = await omegaLogin(email, password);
    setProfile(p);
    return p;
  }, []);

  const logout = useCallback(async () => {
    await omegaLogout();
    setProfile(null);
  }, []);

  return {
    configured: supabaseConfigured,
    loading,
    profile,
    register,
    login,
    logout,
  };
}
