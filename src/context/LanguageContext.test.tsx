import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { translations } from "../i18n";

describe("LanguageContext & Ukrainian localization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Ukrainian language", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );
    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.lang).toBe("uk");
    expect(result.current.t("sidebarHome")).toBe("Головна");
    expect(result.current.t("playBtn")).toBe("ГРАТИ");
    expect(result.current.t("launcherStoreTitle")).toBe("Магазин Omega");
  });

  it("allows switching language dynamically", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );
    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => {
      result.current.setLang("en");
    });

    expect(result.current.lang).toBe("en");
    expect(result.current.t("sidebarHome")).toBe("Home");
    expect(result.current.t("playBtn")).toBe("PLAY");

    // Secret switch to Russian
    act(() => {
      result.current.setLang("ru");
    });

    expect(result.current.lang).toBe("ru");
    expect(result.current.t("sidebarHome")).toBe("Дом");
    expect(result.current.t("playBtn")).toBe("ИГРАТЬ");

    // Switch back to Ukrainian
    act(() => {
      result.current.setLang("uk");
    });

    expect(result.current.lang).toBe("uk");
    expect(result.current.t("sidebarHome")).toBe("Головна");
  });

  it("has full matching dictionaries for uk and ru", () => {
    const ruKeys = Object.keys(translations.ru);
    const ukKeys = Object.keys(translations.uk);

    // Every key in ru must exist in uk
    for (const key of ruKeys) {
      expect((translations.uk as any)[key]).toBeDefined();
    }
    expect(ukKeys.length).toBeGreaterThanOrEqual(ruKeys.length);
  });
});
