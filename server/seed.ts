import type { Disruption, Itinerary, Trip } from "../src/lib/types";

export interface SeedLeg {
  mode: Itinerary["legs"][number]["mode"];
  operator: string;
  code: string;
  depart: string;
  arrive: string;
  durationMin: number;
  from: string;
  to: string;
}

export const seedItineraries: Itinerary[] = [
  {
    id: "it-101",
    title: "Morning non-stop",
    from: "Bengaluru",
    to: "Hyderabad",
    date: "2026-10-18",
    legs: [
      { mode: "flight", operator: "IndiGo", code: "6E-2145", depart: "2026-10-18T07:15:00", arrive: "2026-10-18T08:30:00", durationMin: 75, from: "BLR T1", to: "HYD T1" },
    ],
    price: 6480,
    stops: 0,
    safetyScore: 92,
    reliabilityPct: 94,
    rating: 4.6,
    co2Kg: 118,
    refundable: true,
    tags: ["Non-stop", "Morning", "Refundable"],
  },
  {
    id: "it-102",
    title: "Sleeper train overnight",
    from: "Bengaluru",
    to: "Hyderabad",
    date: "2026-10-18",
    legs: [
      { mode: "train", operator: "Indian Railways", code: "12658", depart: "2026-10-18T22:00:00", arrive: "2026-10-19T07:40:00", durationMin: 580, from: "SBC", to: "SC" },
    ],
    price: 2140,
    stops: 0,
    safetyScore: 84,
    reliabilityPct: 81,
    rating: 4.1,
    co2Kg: 42,
    refundable: false,
    tags: ["Overnight", "Budget", "Sleeper"],
  },
  {
    id: "it-103",
    title: "Value flight with layover",
    from: "Bengaluru",
    to: "Hyderabad",
    date: "2026-10-18",
    legs: [
      { mode: "flight", operator: "Air India", code: "AI-504", depart: "2026-10-18T13:40:00", arrive: "2026-10-18T15:05:00", durationMin: 85, from: "BLR T2", to: "HYD T1" },
    ],
    price: 5120,
    stops: 0,
    safetyScore: 88,
    reliabilityPct: 89,
    rating: 4.3,
    co2Kg: 124,
    refundable: false,
    tags: ["Afternoon", "Cheapest flight"],
  },
  {
    id: "it-104",
    title: "Executive bus + metro",
    from: "Bengaluru",
    to: "Hyderabad",
    date: "2026-10-18",
    legs: [
      { mode: "bus", operator: "Orange Line", code: "OR-442", depart: "2026-10-18T21:30:00", arrive: "2026-10-19T06:10:00", durationMin: 520, from: "Majestic", to: "LB Nagar" },
    ],
    price: 1490,
    stops: 1,
    safetyScore: 76,
    reliabilityPct: 72,
    rating: 3.8,
    co2Kg: 58,
    refundable: true,
    tags: ["Overnight", "Cheapest"],
  },
  {
    id: "it-105",
    title: "Fastest cab corridor",
    from: "Bengaluru",
    to: "Hyderabad",
    date: "2026-10-18",
    legs: [
      { mode: "cab", operator: "Roam Fleet", code: "RF-9021", depart: "2026-10-18T06:00:00", arrive: "2026-10-18T13:20:00", durationMin: 440, from: "Whitefield", to: "Gachibowli" },
    ],
    price: 9800,
    stops: 0,
    safetyScore: 90,
    reliabilityPct: 86,
    rating: 4.5,
    co2Kg: 210,
    refundable: true,
    tags: ["Doorstep", "Private"],
  },
];

export const seedTrips: Trip[] = [
  {
    id: "trip-1",
    ref: "TBS-4821",
    title: "Bengaluru → Hyderabad sprint",
    from: "Bengaluru",
    to: "Hyderabad",
    startDate: "2026-10-18",
    endDate: "2026-10-20",
    status: "upcoming",
    travellers: 2,
    price: 12960,
    itineraryId: "it-101",
    seat: "14A, 14B",
    checkInOpen: true,
  },
  {
    id: "trip-2",
    ref: "TBS-4790",
    title: "Chennai client workshop",
    from: "Bengaluru",
    to: "Chennai",
    startDate: "2026-09-24",
    endDate: "2026-09-26",
    status: "completed",
    travellers: 1,
    price: 7350,
    itineraryId: "it-103",
    seat: "22C",
    checkInOpen: false,
  },
];

export const seedDisruptions: Disruption[] = [
  {
    id: "dis-1",
    tripId: "trip-1",
    title: "6E-2145 running 45 min late",
    detail: "Air traffic control restriction at HYD. Estimated new arrival 09:15. Your connecting cab is being held.",
    severity: "warning",
    kind: "delay",
    createdAt: "2026-10-17T18:20:00",
    resolved: false,
  },
  {
    id: "dis-2",
    tripId: null,
    title: "Airport security queue > 40 min at BLR",
    detail: "Terminal 1 morning rush. Recommended arrival: 2 hours before departure.",
    severity: "info",
    kind: "strike",
    createdAt: "2026-10-17T06:45:00",
    resolved: false,
  },
];
