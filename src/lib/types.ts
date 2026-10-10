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

// ── Route-planning engine (simulated transport graph) ────────────────────────

export type AvailabilityStatus = "available" | "limited" | "sold-out";

export type TransferRisk = "none" | "low" | "medium" | "high";

/**
 * One scheduled transport service — an edge in the route graph.
 * Every row in the fixed demonstration dataset is simulated.
 */
export interface Connection {
  id: string;
  mode: TransportMode;
  operator: string;
  code: string;
  from: string;
  to: string;
  fromStop: string;
  toStop: string;
  /** ISO local datetime without timezone suffix, e.g. 2026-10-18T20:30:00. */
  depart: string;
  arrive: string;
  durationMin: number;
  /** Fare per passenger in INR. */
  fare: number;
  availability: AvailabilityStatus;
  seatsLeft: number | null;
  comfort: CoachClass | "standard";
  accessible: string[];
  luggageCabin: number;
  luggageChecked: number;
  amenities: string[];
  /** True for every row in the fixed demonstration dataset. */
  simulated: true;
  source: string;
  updatedAt: string;
}

/** The waiting period between two connections of one itinerary. */
export interface Transfer {
  location: string;
  waitMin: number;
  risk: TransferRisk;
  stationChange: boolean;
  fromMode: TransportMode;
  toMode: TransportMode;
}

/** A feasible (or near-feasible) end-to-end journey assembled from connections. */
export interface PlannedItinerary {
  id: string;
  from: string;
  to: string;
  date: string;
  connections: Connection[];
  transfers: Transfer[];
  depart: string;
  arrive: string;
  /** Sum of in-vehicle travel time. */
  travelDurationMin: number;
  /** Door-to-door time including transfer waits. */
  totalDurationMin: number;
  /** Fare per passenger. */
  fare: number;
  /** Fare for every passenger, scaled by the requested party size. */
  totalFare: number;
  passengers: number;
  legs: number;
  modes: TransportMode[];
  comfort: string;
  transferRisk: TransferRisk;
  meetsArrivalDeadline: boolean;
  /** Minutes early (positive) or late (negative) against the arrival deadline. */
  arrivalSlackMin: number | null;
  /** Relative ranking score, higher is better. */
  score: number;
  simulated: true;
  source: string;
  updatedAt: string;
  tags: string[];
  /** Preference relaxations — non-empty means this is a labelled alternative. */
  relaxations: string[];
}

export interface PlanRejection {
  connectionIds: string[];
  reason: string;
}

export interface DatasetInfo {
  label: string;
  simulated: true;
  updatedAt: string;
  note: string;
}

export interface PlanResult {
  feasible: PlannedItinerary[];
  alternatives: PlannedItinerary[];
  rejections: PlanRejection[];
  /** Human-readable explanation, always present. */
  explanation: string;
  simulated: true;
  generatedAt: string;
  dataset: DatasetInfo;
}

export type ItinerarySort = "recommended" | "price" | "duration" | "arrival" | "departure" | "transfers";

export interface ItineraryFilters {
  maxPrice: number | null;
  maxDurationMin: number | null;
  modes: TransportMode[];
  coachClass: CoachClass | null;
  deadlineOnly: boolean;
  directOnly: boolean;
  availabilityOnly: boolean;
}

export const DEFAULT_ITINERARY_FILTERS: ItineraryFilters = {
  maxPrice: null,
  maxDurationMin: null,
  modes: [],
  coachClass: null,
  deadlineOnly: false,
  directOnly: false,
  availabilityOnly: false,
};

// ── Simulated booking & trip management ──────────────────────────────────────

export type BookingStatus = "confirmed" | "cancelled" | "completed";

/** Itemised fare for one simulated booking. All amounts in INR. */
export interface FareBreakdown {
  /** Per-person fare × travellers. */
  baseFare: number;
  taxes: number;
  addOns: number;
  discount: number;
  total: number;
  perPerson: number;
}

/** A frozen, bookable snapshot of a selected itinerary. Always simulated. */
export interface BookingItinerary {
  id: string;
  title: string;
  from: string;
  to: string;
  date: string;
  legs: Leg[];
  /** Per-person fare in INR. */
  price: number;
  refundable: boolean;
  simulated: true;
}

/**
 * A saved simulated booking. No real reservation or payment is created;
 * the reference is a demo identifier only.
 */
export interface Booking {
  id: string;
  ref: string;
  status: BookingStatus;
  itinerary: BookingItinerary;
  passengers: TravellerDetails[];
  travellers: number;
  contactEmail: string;
  seatPreference: string;
  seat: string;
  addOns: string[];
  fare: FareBreakdown;
  assumptions: string[];
  consentNotifications: boolean;
  simulated: true;
  createdAt: string;
  cancelledAt: string | null;
}

export interface CreateBookingInput {
  itinerary: BookingItinerary;
  passengers: TravellerDetails[];
  contactEmail: string;
  seatPreference: string;
  addOns: string[];
  consentNotifications: boolean;
  /** Must be true — booking is consequential and requires explicit confirmation. */
  confirmed: boolean;
}

// ── In-app notification centre (simulated previews) ──────────────────────────

export type NotificationChannel = "email" | "sms" | "push";

export type NotificationKind =
  | "booking-confirmed"
  | "booking-cancelled"
  | "disruption"
  | "alternative"
  | "price-drop"
  | "check-in";

/** A simulated notification preview. Nothing is sent to any real channel. */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  channel: NotificationChannel;
  title: string;
  recipient: string;
  preview: string;
  createdAt: string;
  read: boolean;
  simulated: true;
}

// ── Disruption simulator (simulated what-if scenarios) ───────────────────────

export type DisruptionKind =
  | "bus-delay"
  | "bus-cancellation"
  | "missed-connection"
  | "last-mile-unavailable";

/** One injected disruption. Always simulated. */
export interface DisruptionEvent {
  id: string;
  kind: DisruptionKind;
  label: string;
  severity: DisruptionSeverity;
  /** Zero-based index of the affected connection in the original itinerary. */
  legIndex: number;
  detail: string;
  /** Delay in minutes for delay and missed-connection events, else null. */
  delayMin: number | null;
  createdAt: string;
  simulated: true;
}

/** A recalculated journey offered as a recovery option after a disruption. */
export interface RevisedItinerary {
  itinerary: PlannedItinerary;
  /** Short description of how this option recovers the journey. */
  strategy: string;
  /** Extra total fare versus the original itinerary (negative = cheaper). */
  additionalCost: number;
  /** Arrival change versus the original itinerary (positive = later). */
  addedDelayMin: number;
  meetsArrivalDeadline: boolean;
  arrivalSlackMin: number | null;
  /** Null when the plan had no budget limit. */
  withinBudget: boolean | null;
  /** How many original legs this option preserves. */
  preservedLegs: number;
  tradeoffs: string[];
  feasible: boolean;
}

/** Full result of simulating one disruption against one itinerary. */
export interface DisruptionSimulation {
  event: DisruptionEvent;
  original: PlannedItinerary;
  affected: { index: number; connection: Connection };
  /** Human-readable description of the remaining-journey recalculation. */
  recalculation: string;
  revised: RevisedItinerary[];
  feasible: RevisedItinerary[];
  alternatives: RevisedItinerary[];
  noAlternative: boolean;
  explanation: string;
  simulated: true;
  generatedAt: string;
}
