import type { LucideIcon } from "lucide-react";
import { Plane, Train, Bus, Car } from "lucide-react";
import type { TransportMode } from "../lib/types";

export const MODE_ICON: Record<TransportMode, LucideIcon> = {
  flight: Plane,
  train: Train,
  bus: Bus,
  cab: Car,
};

export const MODE_LABEL: Record<TransportMode, string> = {
  flight: "Flight",
  train: "Train",
  bus: "Bus",
  cab: "Cab",
};

export function ModeIcon({ mode, className }: { mode: TransportMode; className?: string }) {
  const Icon = MODE_ICON[mode];
  return <Icon className={className} aria-hidden="true" />;
}
