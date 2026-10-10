import { useState } from "react";
import { Settings as SettingsIcon, Languages, Accessibility, RotateCcw, Volume2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Select } from "../components/ui/Field";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { useSettings } from "../state/SettingsContext";
import { LANGUAGES } from "../lib/i18n";
import type { AppSettings, LanguageCode } from "../lib/types";

const FONT_OPTIONS = [
  { value: "sm" as const, label: "S" },
  { value: "md" as const, label: "M" },
  { value: "lg" as const, label: "L" },
  { value: "xl" as const, label: "XL" },
];

export function SettingsPage() {
  const { settings, update, setLanguage, t, announce } = useSettings();
  const [saved, setSaved] = useState(false);

  function patch(next: Partial<AppSettings>) {
    update(next);
    setSaved(false);
  }

  function save() {
    setSaved(true);
    announce("Settings saved");
  }

  function reset() {
    update({
      language: "en",
      fontScale: "md",
      contrast: "normal",
      motion: "full",
      reduceTransparency: false,
      announceUpdates: true,
      timeFormat: "24h",
      currency: "INR",
    });
    setSaved(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SettingsIcon className="h-5 w-5" />}
        title={t("nav.settings")}
        description="Personalise RoamAgent for your language, reading comfort and assistive needs. Changes apply instantly and are saved on this device."
        action={
          <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
            Reset defaults
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("settings.language")} subtitle="Interface and announcements">
          <div className="flex items-center gap-2 text-teal-300">
            <Languages className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Language</span>
          </div>
          <div className="mt-3">
            <Field label="Preferred language">
              {(id) => (
                <Select id={id} value={settings.language} onChange={(e) => setLanguage(e.target.value as LanguageCode)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native} ({l.label})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-slate-300">
            <p className="text-xs text-slate-500">Preview</p>
            <p className="mt-1 font-medium text-slate-100">{t("nav.dashboard")}</p>
            <p className="text-slate-400">{t("nav.search")} · {t("nav.disruptions")} · {t("nav.trips")}</p>
          </div>
        </Card>

        <Card title="Regional formats" subtitle="Currency and time display">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              {(id) => (
                <Select id={id} value={settings.currency} onChange={(e) => patch({ currency: e.target.value as AppSettings["currency"] })}>
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                </Select>
              )}
            </Field>
            <Field label="Time format">
              {(id) => (
                <Select id={id} value={settings.timeFormat} onChange={(e) => patch({ timeFormat: e.target.value as AppSettings["timeFormat"] })}>
                  <option value="24h">24-hour (18:30)</option>
                  <option value="12h">12-hour (6:30 PM)</option>
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <Card
          title={t("settings.accessibility")}
          subtitle="Visual and motion preferences"
          action={
            <span className="flex items-center gap-2 text-teal-300">
              <Accessibility className="h-4 w-4" />
            </span>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="label">Text size</p>
              <SegmentedControl name="Text size" value={settings.fontScale} onChange={(v) => patch({ fontScale: v })} options={FONT_OPTIONS} />
            </div>

            <div>
              <p className="label">Contrast</p>
              <SegmentedControl
                name="Contrast"
                value={settings.contrast}
                onChange={(v) => patch({ contrast: v })}
                options={[
                  { value: "normal", label: "Standard" },
                  { value: "high", label: "High contrast" },
                ]}
              />
            </div>

            <div>
              <p className="label">Motion</p>
              <SegmentedControl
                name="Motion"
                value={settings.motion}
                onChange={(v) => patch({ motion: v })}
                options={[
                  { value: "full", label: "Full" },
                  { value: "reduced", label: "Reduced" },
                ]}
              />
            </div>

            <ToggleSwitch
              checked={settings.reduceTransparency}
              onChange={(v) => patch({ reduceTransparency: v })}
              label="Reduce transparency"
              description="Use solid panels instead of frosted glass for easier reading."
            />
            <ToggleSwitch
              checked={settings.announceUpdates}
              onChange={(v) => patch({ announceUpdates: v })}
              label="Screen reader announcements"
              description="Announce search results, bookings and disruptions to assistive tech."
            />
            <Button
              variant="secondary"
              icon={<Volume2 className="h-4 w-4" />}
              onClick={() => announce("This is a screen reader announcement sample from TBS RoamAgent.")}
            >
              Test announcement
            </Button>
          </div>
        </Card>

        <Card title="Account" subtitle="Profile and travel documents">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Name</dt>
              <dd className="text-slate-100">Swaroop P</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Email</dt>
              <dd className="text-slate-100">swaroop@example.com</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Frequent flyer</dt>
              <dd className="text-slate-100">TBS Gold · 42,180 pts</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Documents</dt>
              <dd className="text-teal-300">Passport valid till 2031</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} variant="primary">
          {t("common.save")}
        </Button>
        {saved && (
          <span role="status" className="text-sm font-medium text-teal-300">
            Settings applied and saved.
          </span>
        )}
      </div>
    </div>
  );
}
