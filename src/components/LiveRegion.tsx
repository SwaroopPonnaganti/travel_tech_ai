import { useSettings } from "../state/SettingsContext";

export function LiveRegion() {
  const { liveMessage, settings } = useSettings();
  return (
    <div
      role="status"
      aria-live={settings.announceUpdates ? "polite" : "off"}
      aria-atomic="true"
      className="sr-only"
    >
      {liveMessage}
    </div>
  );
}
