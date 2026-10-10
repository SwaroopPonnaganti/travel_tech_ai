import type { CoachClass, Connection, DatasetInfo, TransportMode } from "./types";

/**
 * Fixed demonstration dataset of scheduled transport services.
 *
 * IMPORTANT: Every connection here is SIMULATED. Times, fares, seat counts and
 * availability are hand-authored sample data for demonstration only. This is
 * NOT live inventory and must never be presented as real-time transport data.
 */

export const DEMO_SERVICE_DATE = "2026-10-18";

export const DATASET_SOURCE = "Simulated TBS dataset";
export const DATASET_UPDATED_AT = "2026-10-09T07:00:00";

export const DATASET_INFO: DatasetInfo = {
  label: "Demonstration schedule",
  simulated: true,
  updatedAt: DATASET_UPDATED_AT,
  note: "Simulated schedules, fares and availability. Not connected to live transport systems.",
};

export interface ConnectionTemplate {
  id: string;
  mode: TransportMode;
  operator: string;
  code: string;
  from: string;
  to: string;
  fromStop: string;
  toStop: string;
  /** Minutes after midnight on the service day. */
  departMin: number;
  durationMin: number;
  fare: number;
  availability: Connection["availability"];
  seatsLeft: number | null;
  comfort: CoachClass | "standard";
  accessible: string[];
  luggageCabin: number;
  luggageChecked: number;
  amenities: string[];
  source: string;
  updatedAt: string;
}

const SLEEPER_ACCESS = ["wheelchair", "senior", "pregnant", "infant"];
const STANDARD_ACCESS = ["senior", "pregnant", "infant"];

function bus(
  id: string,
  operator: string,
  code: string,
  from: string,
  fromStop: string,
  to: string,
  toStop: string,
  departMin: number,
  durationMin: number,
  fare: number,
  comfort: CoachClass | "standard",
  extras: Partial<ConnectionTemplate> = {},
): ConnectionTemplate {
  return {
    id,
    mode: "bus",
    operator,
    code,
    from,
    fromStop,
    to,
    toStop,
    departMin,
    durationMin,
    fare,
    availability: "available",
    seatsLeft: null,
    comfort,
    accessible: comfort === "sleeper" ? [...SLEEPER_ACCESS] : [...STANDARD_ACCESS],
    luggageCabin: 1,
    luggageChecked: comfort === "sleeper" ? 2 : 1,
    amenities: comfort === "sleeper" ? ["Blanket", "Charging point", "Reading light"] : ["Charging point"],
    source: DATASET_SOURCE,
    updatedAt: DATASET_UPDATED_AT,
    ...extras,
  };
}

export const CONNECTION_TEMPLATES: ConnectionTemplate[] = [
  // ── Visakhapatnam → Hyderabad (direct) ─────────────────────────────────────
  bus("vz-hyd-1", "APSRTC Amaravati", "AP-2401", "Visakhapatnam", "RTC Complex", "Hyderabad", "MGBS",
    1230, 570, 1450, "sleeper", { seatsLeft: 12 }),
  bus("vz-hyd-2", "Orange Travels", "OT-118", "Visakhapatnam", "Gajuwaka", "Hyderabad", "LB Nagar",
    1080, 640, 1250, "sleeper", { availability: "limited", seatsLeft: 3 }),
  bus("vz-hyd-3", "TSRTC Garuda", "TS-8802", "Visakhapatnam", "RTC Complex", "Hyderabad", "MGBS",
    360, 630, 1150, "standard"),
  bus("vz-hyd-4", "VRL Travels", "VRL-77", "Visakhapatnam", "MVP Colony", "Hyderabad", "Kukatpally",
    1290, 600, 1780, "sleeper", { accessible: ["senior", "pregnant"] }),
  bus("vz-hyd-5", "APSRTC Super Luxury", "AP-2450", "Visakhapatnam", "RTC Complex", "Hyderabad", "MGBS",
    960, 615, 1050, "standard", { availability: "sold-out", seatsLeft: 0 }),

  // ── Visakhapatnam → Vijayawada ─────────────────────────────────────────────
  bus("vz-bza-1", "APSRTC", "AP-1102", "Visakhapatnam", "RTC Complex", "Vijayawada", "PNBS",
    390, 390, 720, "standard"),
  bus("vz-bza-2", "APSRTC", "AP-1130", "Visakhapatnam", "RTC Complex", "Vijayawada", "PNBS",
    540, 390, 760, "standard"),
  bus("vz-bza-3", "Orange Travels", "OT-55", "Visakhapatnam", "Gajuwaka", "Vijayawada", "PNBS",
    840, 420, 700, "standard"),
  bus("vz-bza-4", "APSRTC", "AP-1190", "Visakhapatnam", "RTC Complex", "Vijayawada", "PNBS",
    1320, 390, 850, "sleeper"),
  bus("vz-bza-5", "APSRTC", "AP-1150", "Visakhapatnam", "RTC Complex", "Vijayawada", "PNBS",
    750, 390, 690, "standard"),

  // ── Vijayawada → Hyderabad ─────────────────────────────────────────────────
  bus("bza-hyd-1", "TSRTC", "TS-5001", "Vijayawada", "PNBS", "Hyderabad", "MGBS",
    420, 300, 640, "standard"),
  bus("bza-hyd-2", "Orange Travels", "OT-220", "Vijayawada", "PNBS", "Hyderabad", "LB Nagar",
    720, 310, 600, "standard"),
  bus("bza-hyd-3", "TSRTC Garuda", "TS-5109", "Vijayawada", "PNBS", "Hyderabad", "MGBS",
    960, 300, 780, "sleeper"),
  bus("bza-hyd-4", "VRL Travels", "VRL-210", "Vijayawada", "PNBS", "Hyderabad", "Kukatpally",
    1380, 300, 880, "sleeper"),
  bus("bza-hyd-5", "APSRTC", "AP-3300", "Vijayawada", "PNBS", "Hyderabad", "MGBS",
    780, 300, 610, "standard", { availability: "limited", seatsLeft: 2 }),
  bus("bza-hyd-6", "Sprint Travels", "SP-9", "Vijayawada", "PNBS", "Hyderabad", "MGBS",
    945, 300, 590, "standard"),

  // ── Visakhapatnam → Rajahmundry → Vijayawada ───────────────────────────────
  bus("vz-rjy-1", "APSRTC", "AP-1001", "Visakhapatnam", "RTC Complex", "Rajahmundry", "Bus Stand",
    330, 150, 320, "standard"),
  bus("rjy-bza-1", "APSRTC", "AP-1010", "Rajahmundry", "Bus Stand", "Vijayawada", "PNBS",
    510, 240, 420, "standard"),

  // ── Vijayawada → Visakhapatnam (return) ────────────────────────────────────
  bus("bza-vz-1", "APSRTC", "AP-1205", "Vijayawada", "PNBS", "Visakhapatnam", "RTC Complex",
    360, 390, 720, "standard"),
  bus("bza-vz-2", "Orange Travels", "OT-60", "Vijayawada", "PNBS", "Visakhapatnam", "RTC Complex",
    1260, 390, 850, "sleeper"),

  // ── Hyderabad → Vijayawada → Visakhapatnam (return) ────────────────────────
  bus("hyd-bza-1", "TSRTC", "TS-5200", "Hyderabad", "MGBS", "Vijayawada", "PNBS",
    1320, 300, 660, "sleeper"),
  bus("hyd-bza-2", "APSRTC", "AP-3400", "Hyderabad", "LB Nagar", "Vijayawada", "PNBS",
    570, 300, 620, "standard"),
  bus("hyd-vz-1", "APSRTC Amaravati", "AP-2400", "Hyderabad", "MGBS", "Visakhapatnam", "RTC Complex",
    1170, 570, 1450, "sleeper"),
  bus("hyd-vz-2", "TSRTC", "TS-8890", "Hyderabad", "MGBS", "Visakhapatnam", "RTC Complex",
    390, 630, 1150, "standard"),

  // ── Hyderabad ↔ Bengaluru (via Kurnool) ────────────────────────────────────
  bus("hyd-blr-1", "KSRTC Airavat", "KA-2408", "Hyderabad", "MGBS", "Bengaluru", "Majestic",
    1260, 570, 1350, "sleeper"),
  bus("hyd-blr-2", "Orange Travels", "OT-330", "Hyderabad", "LB Nagar", "Bengaluru", "Madiwala",
    1200, 600, 1200, "sleeper"),
  bus("hyd-blr-3", "VRL Travels", "VRL-101", "Hyderabad", "MGBS", "Bengaluru", "Majestic",
    450, 600, 1150, "standard"),
  bus("hyd-kurnool-1", "APSRTC", "AP-7701", "Hyderabad", "MGBS", "Kurnool", "Bus Stand",
    360, 240, 480, "standard"),
  bus("kurnool-blr-1", "KSRTC", "KA-5510", "Kurnool", "Bus Stand", "Bengaluru", "Majestic",
    660, 300, 620, "standard"),
  bus("blr-hyd-1", "KSRTC", "KA-2409", "Bengaluru", "Majestic", "Hyderabad", "MGBS",
    1290, 570, 1350, "sleeper"),

  // ── Bengaluru ↔ Chennai ────────────────────────────────────────────────────
  bus("blr-che-1", "KSRTC", "KA-8001", "Bengaluru", "Majestic", "Chennai", "CMBT",
    420, 360, 820, "standard"),
  bus("blr-che-2", "SETC", "TN-1200", "Bengaluru", "Madiwala", "Chennai", "CMBT",
    1320, 390, 970, "sleeper"),
  bus("che-blr-1", "SETC", "TN-1301", "Chennai", "CMBT", "Bengaluru", "Madiwala",
    1290, 390, 970, "sleeper"),
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Build an ISO local datetime (no timezone) by adding minutes to a service date. */
export function isoFromServiceMinute(date: string, minutes: number): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  const d = new Date(base + minutes * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

/** Materialise the fixed dataset into dated connections for a given service date. */
export function connectionsForDate(date: string): Connection[] {
  return CONNECTION_TEMPLATES.map((t) => {
    const { departMin, ...rest } = t;
    return {
      ...rest,
      simulated: true,
      depart: isoFromServiceMinute(date, departMin),
      arrive: isoFromServiceMinute(date, departMin + t.durationMin),
    };
  });
}

/** Every city that appears as an endpoint in the simulated dataset. */
export function datasetCities(): string[] {
  const set = new Set<string>();
  for (const t of CONNECTION_TEMPLATES) {
    set.add(t.from);
    set.add(t.to);
  }
  return [...set].sort();
}
