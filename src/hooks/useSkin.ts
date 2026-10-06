import { useCallback, useEffect, useState } from "react";
import { ipc } from "../services/ipc";

export type SkinSource = "ely" | "microsoft" | "custom";
export type SkinModel = "auto" | "classic" | "slim";

export interface SkinApi {
  skinSource: SkinSource;
  setSkinSource: (source: SkinSource) => void;
  skinModel: SkinModel;
  setSkinModel: (model: SkinModel) => void;
  customSkinUrl: string | null;
  customCapeUrl: string | null;
  capeEnabled: boolean;
  setCapeEnabled: (enabled: boolean) => void;
  activeSkinUrl: string | null;
  activeCapeUrl: string | null;
  skinLoading: boolean;
  uploadSkin: (file: File) => Promise<void>;
  uploadCape: (file: File) => Promise<void>;
  setPresetSkin: (url: string, model?: SkinModel) => void;
  setPresetCape: (url: string) => void;
  resetSkin: () => void;
  resetCape: () => void;
}

export function useSkin(accountName?: string): SkinApi {
  const [skinSource, setSkinSourceState] = useState<SkinSource>(() => {
    return (localStorage.getItem("omega:skinSource") as SkinSource) || "ely";
  });
  const [skinModel, setSkinModelState] = useState<SkinModel>(() => {
    return (localStorage.getItem("omega:skinModel") as SkinModel) || "auto";
  });
  const [customSkinUrl, setCustomSkinUrl] = useState<string | null>(() => {
    return localStorage.getItem("omega:customSkin");
  });
  const [customCapeUrl, setCustomCapeUrl] = useState<string | null>(() => {
    return localStorage.getItem("omega:customCape");
  });
  const [capeEnabled, setCapeEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("omega:capeEnabled") === "true";
  });

  const [activeSkinUrl, setActiveSkinUrl] = useState<string | null>(null);
  const [activeCapeUrl, setActiveCapeUrl] = useState<string | null>(null);
  const [skinLoading, setSkinLoading] = useState(false);

  const setSkinSource = useCallback((source: SkinSource) => {
    setSkinSourceState(source);
    localStorage.setItem("omega:skinSource", source);
  }, []);

  const setSkinModel = useCallback((model: SkinModel) => {
    setSkinModelState(model);
    localStorage.setItem("omega:skinModel", model);
  }, []);

  const setCapeEnabled = useCallback((enabled: boolean) => {
    setCapeEnabledState(enabled);
    localStorage.setItem("omega:capeEnabled", String(enabled));
  }, []);

  const uploadSkin = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setCustomSkinUrl(dataUrl);
          setSkinSourceState("custom");
          localStorage.setItem("omega:customSkin", dataUrl);
          localStorage.setItem("omega:skinSource", "custom");
          resolve();
        } else {
          reject(new Error("Empty skin data"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }, []);

  const uploadCape = useCallback(async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setCustomCapeUrl(dataUrl);
          setCapeEnabledState(true);
          localStorage.setItem("omega:customCape", dataUrl);
          localStorage.setItem("omega:capeEnabled", "true");
          resolve();
        } else {
          reject(new Error("Empty cape data"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }, []);

  const setPresetSkin = useCallback((url: string, model: SkinModel = "auto") => {
    setCustomSkinUrl(url);
    setSkinSourceState("custom");
    setSkinModelState(model);
    localStorage.setItem("omega:customSkin", url);
    localStorage.setItem("omega:skinSource", "custom");
    localStorage.setItem("omega:skinModel", model);
  }, []);

  const setPresetCape = useCallback((url: string) => {
    setCustomCapeUrl(url);
    setCapeEnabledState(true);
    localStorage.setItem("omega:customCape", url);
    localStorage.setItem("omega:capeEnabled", "true");
  }, []);

  const resetSkin = useCallback(() => {
    setCustomSkinUrl(null);
    setSkinSourceState("ely");
    localStorage.removeItem("omega:customSkin");
    localStorage.setItem("omega:skinSource", "ely");
  }, []);

  const resetCape = useCallback(() => {
    setCustomCapeUrl(null);
    setCapeEnabledState(false);
    localStorage.removeItem("omega:customCape");
    localStorage.setItem("omega:capeEnabled", "false");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setSkinLoading(true);
      void resolveSkin();
    }, 200);

    const resolveSkin = async () => {
      const name = (accountName || "Steve").trim();

      if (skinSource === "custom") {
        if (!cancelled) {
          setActiveSkinUrl(customSkinUrl);
          setActiveCapeUrl(capeEnabled ? customCapeUrl : null);
          setSkinLoading(false);
        }
        return;
      }

      if (skinSource === "microsoft") {
        try {
          const officialUrl = await ipc.getMicrosoftSkin(name).catch(() => null);
          if (officialUrl && !cancelled) {
            setActiveSkinUrl(officialUrl.replace(/^http:\/\//, "https://"));
            setActiveCapeUrl(null);
            setSkinLoading(false);
            return;
          }
        } catch {
          // fallback to minotar
        }

        if (!cancelled) {
          setActiveSkinUrl(`https://minotar.net/skin/${encodeURIComponent(name)}`);
          setActiveCapeUrl(null);
          setSkinLoading(false);
        }
        return;
      }

      if (skinSource === "ely") {
        try {
          const res = await fetch(`https://skinsystem.ely.by/textures/${encodeURIComponent(name)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.SKIN?.url && !cancelled) {
              const url = data.SKIN.url.replace(/^http:\/\//, "https://");
              setActiveSkinUrl(url);
              if (data?.CAPE?.url && capeEnabled) {
                setActiveCapeUrl(data.CAPE.url.replace(/^http:\/\//, "https://"));
              } else {
                setActiveCapeUrl(null);
              }
              setSkinLoading(false);
              return;
            }
          }
        } catch {
          // fallback to minotar
        }

        if (!cancelled) {
          setActiveSkinUrl(`https://minotar.net/skin/${encodeURIComponent(name)}`);
          setActiveCapeUrl(null);
          setSkinLoading(false);
        }
        return;
      }
    };

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [skinSource, accountName, customSkinUrl, customCapeUrl, capeEnabled]);

  return {
    skinSource,
    setSkinSource,
    skinModel,
    setSkinModel,
    customSkinUrl,
    customCapeUrl,
    capeEnabled,
    setCapeEnabled,
    activeSkinUrl,
    activeCapeUrl,
    skinLoading,
    uploadSkin,
    uploadCape,
    setPresetSkin,
    setPresetCape,
    resetSkin,
    resetCape,
  };
}
