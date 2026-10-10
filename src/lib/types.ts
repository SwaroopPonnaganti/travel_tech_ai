export type TripStatus = "upcoming" | "in-progress" | "completed" | "cancelled";

export type TravelPref = "balanced" | "fastest" | "cheapest" | "safest";

export type TransportMode = "flight" | "train" | "bus" | "cab";

export interface Leg {
  mode: TransportMode;
  operator: string;
  code: string;
  depart: string;
  arrive: string;
  durationMin: number;
  from: string;
  to: string;
}

export interface Itinerary {
  id: string;
  title: string;
  from: string;
  to: string;
  date: string;
  legs: Leg[];
  price: number;
  stops: number;
  safetyScore: number;
  reliabilityPct: number;
  rating: number;
  co2Kg: number;
  refundable: boolean;
  tags: string[];
}

export interface Trip {
  id: string;
  ref: string;
  title: string;
  from: string;
  to: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  travellers: number;
  price: number;
  itineraryId: string;
  seat: string;
  checkInOpen: boolean;
}

export type DisruptionSeverity = "info" | "warning" | "critical";

export interface Disruption {
  id: string;
  tripId: string | null;
  title: string;
  detail: string;
  severity: DisruptionSeverity;
  kind: "delay" | "cancellation" | "weather" | "strike" | "health";
  createdAt: string;
  resolved: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  chips?: string[];
}

export interface BookingDraft {
  itineraryId: string;
  travellers: TravellerDetails[];
  contactEmail: string;
  seatPreference: string;
  addOns: string[];
  acceptTerms: boolean;
}

export interface TravellerDetails {
  firstName: string;
  lastName: string;
  idNumber: string;
}

export interface AppSettings {
  language: LanguageCode;
  fontScale: "sm" | "md" | "lg" | "xl";
  contrast: "normal" | "high";
  motion: "full" | "reduced";
  reduceTransparency: boolean;
  announceUpdates: boolean;
  timeFormat: "12h" | "24h";
  currency: "INR" | "USD" | "EUR";
}

export type LanguageCode = "en" | "hi" | "te" | "ta" | "es";

// ── Conversational trip planner ──────────────────────────────────────────────

export type CoachClass = "seater" | "sleeper";

export type DepartureWindow = "early-morning" | "morning" | "afternoon" | "evening" | "night";

export interface LuggageRequirement {
  cabin: number;
  checked: number;
  special: string | null;
}

/** Structured trip requirement produced by the conversational planner. */
export interface TripPlan {
  origin: string | null;
  destination: string | null;
  /** Preferred departure date (ISO yyyy-mm-dd). */
  departureDate: string | null;
  /** Coarse preferred departure window when no clock time is given. */
  departureWindow: DepartureWindow | null;
  /** Explicit preferred departure time (HH:mm, 24h). */
  departureTime: string | null;
  /** Required arrival date (ISO yyyy-mm-dd), when the traveller must arrive by then. */
  arrivalDate: string | null;
  /** Required arrival time (HH:mm, 24h). */
  arrivalTime: string | null;
  passengers: number | null;
  maxBudget: number | null;
  coachClass: CoachClass | null;
  accessibility: string[];
  luggage: LuggageRequirement | null;
  firstMile: string | null;
  lastMile: string | null;
}

export type PlanFieldKey = keyof TripPlan;

export type PlanSource = "llm" | "rule";

export interface PlanExtraction {
  plan: TripPlan;
  captured: PlanFieldKey[];
  missing: PlanFieldKey[];
  confidence: number;
  source: PlanSource;
}

export interface PlanValidation {
  errors: Partial<Record<PlanFieldKey, string>>;
  ok: boolean;
}

export interface AgentStatus {
  llmConfigured: boolean;
  model: string | null;
  provider: string | null;
}
