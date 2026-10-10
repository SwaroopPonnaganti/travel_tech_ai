import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppNotification } from "../lib/types";
import { seedNotifications } from "../lib/notifications";

const CONSENT_KEY = "roamagent.notify.consent";
const DELIVERY_MS = 700;

type DeliveryState = "idle" | "sending" | "sent";

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  consent: boolean;
  setConsent: (next: boolean) => void;
  addNotification: (notification: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  previewDelivery: (id: string) => Promise<boolean>;
  delivery: Record<string, DeliveryState>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function loadConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => seedNotifications());
  const [consent, setConsentState] = useState<boolean>(() => loadConsent());
  const [delivery, setDelivery] = useState<Record<string, DeliveryState>>({});

  const setConsent = useCallback((next: boolean) => {
    setConsentState(next);
    try {
      window.localStorage.setItem(CONSENT_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const addNotification = useCallback((notification: AppNotification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const previewDelivery = useCallback(
    async (id: string) => {
      if (!consent) return false;
      setDelivery((prev) => ({ ...prev, [id]: "sending" }));
      await new Promise((resolve) => window.setTimeout(resolve, DELIVERY_MS));
      setDelivery((prev) => ({ ...prev, [id]: "sent" }));
      markRead(id);
      return true;
    },
    [consent, markRead],
  );

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      consent,
      setConsent,
      addNotification,
      markRead,
      markAllRead,
      previewDelivery,
      delivery,
    }),
    [notifications, unreadCount, consent, setConsent, addNotification, markRead, markAllRead, previewDelivery, delivery],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}
