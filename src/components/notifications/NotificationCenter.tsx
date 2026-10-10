import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Mail,
  MessageSquare,
  Send,
  ShieldAlert,
  Smartphone,
  Sparkles,
  TrendingDown,
  X,
} from "lucide-react";
import type { AppNotification, NotificationChannel, NotificationKind } from "../../lib/types";
import { useNotifications } from "../../state/NotificationsContext";
import { useSettings } from "../../state/SettingsContext";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Button } from "../ui/Button";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";

const CHANNEL_ICON: Record<NotificationChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
};

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  "booking-confirmed": CheckCheck,
  "booking-cancelled": X,
  disruption: ShieldAlert,
  alternative: Sparkles,
  "price-drop": TrendingDown,
  "check-in": Bell,
};

const KIND_TONE: Record<NotificationKind, string> = {
  "booking-confirmed": "bg-teal-500/15 text-teal-200",
  "booking-cancelled": "bg-rose-500/15 text-rose-200",
  disruption: "bg-amber-500/15 text-amber-200",
  alternative: "bg-violet-500/15 text-violet-200",
  "price-drop": "bg-teal-500/15 text-teal-200",
  "check-in": "bg-navy-500/15 text-slate-200",
};

function NotificationItem({ notification }: { notification: AppNotification }) {
  const { markRead, previewDelivery, delivery, consent } = useNotifications();
  const { t } = useSettings();
  const KindIcon = KIND_ICON[notification.kind];
  const ChannelIcon = CHANNEL_ICON[notification.channel];
  const state = delivery[notification.id] ?? "idle";

  return (
    <li
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition",
        !notification.read && "border-teal-500/30 bg-teal-500/[0.04]",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", KIND_TONE[notification.kind])}>
          <KindIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="text-left text-sm font-medium text-slate-100 hover:text-white"
              onClick={() => markRead(notification.id)}
            >
              {notification.title}
            </button>
            {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-400" aria-label="Unread" />}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{notification.preview}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ChannelIcon className="h-3 w-3" /> {notification.channel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">to {notification.recipient}</span>
            <span aria-hidden="true">·</span>
            <span>{relativeTime(notification.createdAt)}</span>
          </p>
          <div className="mt-2">
            {state === "sent" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-300">
                <CheckCheck className="h-3.5 w-3.5" /> {t("notify.preview.sent")}
              </span>
            ) : (
              <button
                type="button"
                disabled={!consent || state === "sending"}
                onClick={() => void previewDelivery(notification.id)}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium",
                  consent ? "text-slate-300 hover:text-teal-200" : "cursor-not-allowed text-slate-600",
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {state === "sending" ? t("notify.preview.sending") : t("notify.preview.send")}
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markAllRead, consent, setConsent } = useNotifications();
  const { t } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("notify.title")}>
      <button type="button" aria-label="Close notifications" className="flex-1" onClick={onClose} />
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-navy-900 shadow-card">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <h2 className="font-display text-base font-semibold text-white">{t("notify.title")}</h2>
            <p className="text-xs text-slate-400">
              {unreadCount > 0 ? t("notify.unread").replace("{count}", String(unreadCount)) : t("notify.allRead")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" onClick={markAllRead} icon={<CheckCheck className="h-4 w-4" />}>
                {t("notify.markAll")}
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="border-b border-white/10 p-4">
          <ToggleSwitch
            label={t("notify.consent.label")}
            description={t("notify.consent.description")}
            checked={consent}
            onChange={setConsent}
          />
          <p role="note" className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            {t("notify.simulated.banner")}
          </p>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-4">
          {notifications.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
              {t("notify.empty")}
            </li>
          ) : (
            notifications.map((n) => <NotificationItem key={n.id} notification={n} />)
          )}
        </ul>
      </div>
    </div>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const { unreadCount } = useNotifications();
  const { t } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t("notify.title")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn("relative rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10", className)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-teal-500 text-[10px] font-bold text-navy-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && <Panel onClose={() => setOpen(false)} />}
    </>
  );
}
