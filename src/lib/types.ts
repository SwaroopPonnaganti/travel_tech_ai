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
