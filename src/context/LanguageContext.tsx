import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { translations, type Language } from "../i18n";
import { getStoredLanguage, setStoredLanguage } from "../services/storage";

interface LanguageContextType {
  lang: Language;
  setLang: (newLang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("omega_launcher_lang") || getStoredLanguage();
      if (saved === "uk" || saved === "ru" || saved === "en") return saved;
      
      const settingsRaw = localStorage.getItem("omega_launcher_settings");
      if (settingsRaw) {
        const s = JSON.parse(settingsRaw);
        const l = s?.lang?.toLowerCase();
        if (l === "en") return "en";
        if (l === "ru") return "ru";
        if (l === "uk") return "uk";
      }
      return "uk";
    } catch {
      return "uk";
    }
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem("omega_launcher_lang", newLang);
      setStoredLanguage(newLang);
      const settingsRaw = localStorage.getItem("omega_launcher_settings");
      if (settingsRaw) {
        const s = JSON.parse(settingsRaw);
        s.lang = newLang.toUpperCase();
        localStorage.setItem("omega_launcher_settings", JSON.stringify(s));
      }
      window.dispatchEvent(new CustomEvent("omega:lang_change", { detail: { lang: newLang } }));
    } catch {}
  }, []);

  useEffect(() => {
    const handleCustomLang = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang: Language }>;
      if (customEvent.detail?.lang && customEvent.detail.lang !== lang) {
        setLangState(customEvent.detail.lang);
      }
    };
    window.addEventListener("omega:lang_change", handleCustomLang);
    return () => window.removeEventListener("omega:lang_change", handleCustomLang);
  }, [lang]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const currentDict = (translations as any)[lang] as Record<string, string> | undefined;
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      const ukDict = translations.uk as Record<string, string>;
      if (ukDict && ukDict[key]) {
        return ukDict[key];
      }
      const enDict = translations.en as Record<string, string>;
      if (enDict && enDict[key]) {
        return enDict[key];
      }
      const ruDict = translations.ru as Record<string, string>;
      if (ruDict && ruDict[key]) {
        return ruDict[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    const currentLang: Language = "uk";
    return {
      lang: currentLang,
      setLang: () => {},
      t: (key: string, fallback?: string) => {
        const dict = (translations as any)[currentLang] as Record<string, string>;
        return dict?.[key] || fallback || key;
      },
    };
  }
  return context;
}
