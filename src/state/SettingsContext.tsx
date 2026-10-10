import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings, LanguageCode } from "../lib/types";
import { createTranslator } from "../lib/i18n";

const DEFAULTS: AppSettings = {
  language: "en",
  fontScale: "md",
  contrast: "normal",
  motion: "full",
  reduceTransparency: false,
  announceUpdates: true,
  timeFormat: "24h",
  currency: "INR",
};

const FONT_SCALES: Record<AppSettings["fontScale"], number> = {
  sm: 0.9,
  md: 1,
  lg: 1.15,
  xl: 1.3,
};

const STORAGE_KEY = "roamagent.settings";

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  announce: (message: string) => void;
  liveMessage: string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.language;
    root.dataset.contrast = settings.contrast;
    root.dataset.motion = settings.motion === "reduced" ? "reduced" : "full";
    root.dataset.transparency = settings.reduceTransparency ? "reduced" : "full";
    root.style.setProperty("--app-font-scale", String(FONT_SCALES[settings.fontScale]));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — settings stay in memory */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setLanguage = useCallback((language: LanguageCode) => update({ language }), [update]);

  const t = useMemo(() => createTranslator(settings.language), [settings.language]);

  const announce = useCallback(
    (message: string) => {
      if (!settings.announceUpdates) return;
      setLiveMessage("");
      window.setTimeout(() => setLiveMessage(message), 60);
    },
    [settings.announceUpdates],
  );

  const value = useMemo(
    () => ({ settings, update, setLanguage, t, announce, liveMessage }),
    [settings, update, setLanguage, t, announce, liveMessage],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
