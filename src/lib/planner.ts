import type {
  CoachClass,
  DepartureWindow,
  LanguageCode,
  LuggageRequirement,
  PlanFieldKey,
  PlanExtraction,
  PlanValidation,
  TripPlan,
} from "./types";
import { CITIES } from "./mock";
import { extractBudget, extractDate } from "./intent";

export const EXTRA_CITIES = [
  "Visakhapatnam",
  "Tirupati",
  "Mysuru",
  "Coimbatore",
  "Vijayawada",
  "Warangal",
];

export const PLAN_CITIES: string[] = [...CITIES, ...EXTRA_CITIES];

const COACH_CLASSES: CoachClass[] = ["seater", "sleeper"];

const DEPARTURE_WINDOWS: DepartureWindow[] = [
  "early-morning",
  "morning",
  "afternoon",
  "evening",
  "night",
];

export const ACCESSIBILITY_OPTIONS = [
  "wheelchair",
  "senior",
  "infant",
  "pregnant",
  "vision",
  "hearing",
  "service-animal",
] as const;

export type AccessibilityOption = (typeof ACCESSIBILITY_OPTIONS)[number];

export interface PlanFieldMeta {
  key: PlanFieldKey;
  labelKey: string;
  essential: boolean;
  group: "journey" | "timing" | "travellers" | "comfort" | "connections";
}

export const ESSENTIAL_FIELDS: PlanFieldKey[] = ["origin", "destination", "departureDate", "passengers"];

export const PLAN_FIELDS: PlanFieldMeta[] = [
  { key: "origin", labelKey: "planner.field.origin", essential: true, group: "journey" },
  { key: "destination", labelKey: "planner.field.destination", essential: true, group: "journey" },
  { key: "departureDate", labelKey: "planner.field.departureDate", essential: true, group: "timing" },
  { key: "departureWindow", labelKey: "planner.field.departureWindow", essential: false, group: "timing" },
  { key: "departureTime", labelKey: "planner.field.departureTime", essential: false, group: "timing" },
  { key: "arrivalDate", labelKey: "planner.field.arrivalDate", essential: false, group: "timing" },
  { key: "arrivalTime", labelKey: "planner.field.arrivalTime", essential: false, group: "timing" },
  { key: "passengers", labelKey: "planner.field.passengers", essential: true, group: "travellers" },
  { key: "maxBudget", labelKey: "planner.field.maxBudget", essential: false, group: "travellers" },
  { key: "coachClass", labelKey: "planner.field.coachClass", essential: false, group: "comfort" },
  { key: "accessibility", labelKey: "planner.field.accessibility", essential: false, group: "comfort" },
  { key: "luggage", labelKey: "planner.field.luggage", essential: false, group: "comfort" },
  { key: "firstMile", labelKey: "planner.field.firstMile", essential: false, group: "connections" },
  { key: "lastMile", labelKey: "planner.field.lastMile", essential: false, group: "connections" },
];

export function createEmptyTripPlan(): TripPlan {
  return {
    origin: null,
    destination: null,
    departureDate: null,
    departureWindow: null,
    departureTime: null,
    arrivalDate: null,
    arrivalTime: null,
    passengers: null,
    maxBudget: null,
    coachClass: null,
    accessibility: [],
    luggage: null,
    firstMile: null,
    lastMile: null,
  };
}

// ── Telugu normalisation ─────────────────────────────────────────────────────

const TELUGU_REPLACEMENTS: Array<[RegExp, string]> = [
  [/బెంగళూరు|బెంగుళూరు/g, "bengaluru"],
  [/హైదరాబాద్/g, "hyderabad"],
  [/చెన్నై/g, "chennai"],
  [/ముంబై|ముంబయి/g, "mumbai"],
  [/ఢిల్లీ|దిల్లీ/g, "delhi"],
  [/పుణె|పూనా/g, "pune"],
  [/కోల్‌కతా|కోల్‌కత్తా/g, "kolkata"],
  [/కొచ్చి|కొచ్చిన్/g, "kochi"],
  [/అహ్మదాబాద్/g, "ahmedabad"],
  [/జైపూర్/g, "jaipur"],
  [/విశాఖపట్నం|విజాగ్/g, "visakhapatnam"],
  [/తిరుపతి/g, "tirupati"],
  [/మైసూరు/g, "mysuru"],
  [/విజయవాడ/g, "vijayawada"],
  [/వరంగల్/g, "warangal"],
  [/రేపు/g, "tomorrow"],
  [/ఈరోజు|నేడు/g, "today"],
  [/ఈ వారాంతంలో|ఈ వారాంతం/g, " this weekend "],
  [/వచ్చే వారాంతంలో|వచ్చే వారాంతం/g, " next weekend "],
  [/వచ్చే వారం/g, "next week"],
  [/ఉదయం/g, " morning "],
  [/మధ్యాహ్నం/g, " afternoon "],
  [/సాయంత్రం/g, " evening "],
  [/రాత్రి|రాత్రికి/g, " night "],
  [/స్లీపర్|స్లీపరు/g, "sleeper"],
  [/సీటర్|సీటరు/g, "seater"],
  [/మంది|ప్రయాణీకులు|ప్రయాణికులు/g, " people "],
  [/బడ్జెట్|బడ్జట్/g, "budget"],
  [/లోపు|కంటే తక్కువ|లోపే/g, " under "],
  [/వీల[\u0c4d\u200c\u200d]*చైర్|చక్రాల కుర్చీ/g, "wheelchair"],
  [/వృద్ధ|పెద్దవారు|వయస్సు మీరిన/g, "senior citizen"],
  [/శిశువు|పాప|బిడ్డ|చిన్న పిల్ల/g, "infant"],
  [/గర్భిణి|గర్భవతి/g, "pregnant"],
  [/దృష్టి లోపం|అంధుడు/g, "visually impaired"],
  [/వినికిడి లోపం|చెవిటి/g, "hearing impaired"],
  [/సామాను|బ్యాగేజ్|లగేజ్|బ్యాగులు/g, "luggage"],
  [/అదనపు సామాను/g, "extra luggage"],
  [/మొదటి మైలు/g, "first mile"],
  [/చివరి మైలు/g, "last mile"],
  [/ఇంటి/g, " home "],
  [/ఆటోరిక్షా|ఆటో/g, "auto"],
  [/క్యాబ్|టాక్సీ/g, "cab"],
  [/రైలు/g, "train"],
  [/బస్సు/g, "bus"],
  [/విమానం|ఫ్లైట్/g, "flight"],
];

const TELUGU_NUMERALS: Array<[RegExp, string]> = [
  [/ఒకటి|ఒక్క/g, "1"],
  [/రెండు|ఇద్దరు/g, "2"],
  [/మూడు|ముగ్గురు/g, "3"],
  [/నాలుగు|నలుగురు/g, "4"],
  [/ఐదు|ఐదుగురు/g, "5"],
  [/ఆరు|ఆరుగురు/g, "6"],
  [/ఏడు|ఏడుగురు/g, "7"],
  [/ఎనిమిది|ఎనిమిదిమంది/g, "8"],
  [/తొమ్మిది|తొమ్మిదిమంది/g, "9"],
];

export function isTelugu(text: string): boolean {
  return /[\u0C00-\u0C7F]/.test(text);
}

/** Rewrites Telugu keywords/cities as English tokens so one parser handles both. */
export function normalizeTelugu(text: string): string {
  let out = text;
  // Telugu postpositions follow their noun, so reorder to English preposition
  // order before translating: "హైదరాబాద్ నుండి" -> "FROM_హైదరాబాద్".
  out = out.replace(/(\S+?)\s*నుండి|(\S+?)\s*నుంచి/g, " FROM_$1$2");
  out = out.replace(/(\S+?)\s*వరకు/g, " TO_$1");
  out = out.replace(/(\S+?)(?:కు|కి)(?![\u0C00-\u0C7F])/g, " TO_$1");
  for (const [re, replacement] of TELUGU_NUMERALS) out = out.replace(re, replacement);
  for (const [re, replacement] of TELUGU_REPLACEMENTS) out = out.replace(re, replacement);
  return out
    .replace(/FROM_/g, "from ")
    .replace(/TO_/g, "to ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeInput(input: string): string {
  const withTelugu = isTelugu(input) ? normalizeTelugu(input) : input;
  return withTelugu.toLowerCase().replace(/\s+/g, " ").trim();
}

// ── Field extractors ─────────────────────────────────────────────────────────

function toHHMM(hour: number, minute: number, meridiem?: string): string | null {
  let h = hour;
  if (h > 23 || minute > 59) return null;
  if (meridiem === "pm" && h < 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function extractPassengers(text: string): number | null {
  const numeric = text.match(/(\d{1,2})\s*(?:pax|people|persons?|passengers?|travell?ers?|adults?|of us|seats?)/i);
  if (numeric) return Math.min(9, Math.max(1, Number(numeric[1])));
  const family = text.match(/family of\s+(\d{1,2})/i);
  if (family) return Math.min(9, Math.max(1, Number(family[1])));
  if (/\b(just me|only me|solo|alone|by myself|myself)\b/.test(text)) return 1;
  if (/\bcouple\b|\btwo of us\b|\bwe are two\b/.test(text)) return 2;
  const words: Record<number, RegExp> = {
    1: /\bone (?:person|passenger|traveller|traveler|adult)\b/,
    2: /\b(two|three|four|five|six)\b/,
    3: /\bthree\b/,
    4: /\bfour\b/,
    5: /\bfive\b/,
    6: /\bsix\b/,
  };
  for (const [n, re] of Object.entries(words)) {
    if (re.test(text)) return Number(n);
  }
  return null;
}

export function extractDepartureWindow(text: string): DepartureWindow | null {
  if (/early morning|before dawn|before sunrise|dawn/.test(text)) return "early-morning";
  if (/\bmorning\b|\bam\b/.test(text)) return "morning";
  if (/\bafternoon\b/.test(text)) return "afternoon";
  if (/\bevening\b|\btonight\b/.test(text)) return "evening";
  if (/\bnight\b|\bovernight\b/.test(text)) return "night";
  return null;
}

function windowFromTime(hhmm: string): DepartureWindow {
  const hour = Number(hhmm.slice(0, 2));
  if (hour < 6) return "night";
  if (hour < 11) return "morning";
  if (hour < 15) return "afternoon";
  if (hour < 19) return "evening";
  return "night";
}

interface TimeHit {
  index: number;
  value: string;
}

export function extractTimes(text: string): { departureTime: string | null; arrivalTime: string | null } {
  const hits: TimeHit[] = [];

  const add = (index: number, value: string | null) => {
    if (value && !hits.some((h) => h.index === index)) hits.push({ index, value });
  };

  for (const m of text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi)) {
    const hour = Number(m[1]);
    const minute = m[2] ? Number(m[2]) : 0;
    add(m.index ?? 0, toHHMM(hour, minute, m[3]!.toLowerCase()));
  }
  for (const m of text.matchAll(/\b(\d{1,2}):(\d{2})\b/g)) {
    add(m.index ?? 0, toHHMM(Number(m[1]), Number(m[2])));
  }
  for (const m of text.matchAll(/\b(\d{1,2})\s*o'?\s?clock\b/gi)) {
    add(m.index ?? 0, toHHMM(Number(m[1]), 0));
  }
  for (const m of text.matchAll(/\b(\d{1,2})\s+in the (morning|afternoon|evening|night)\b/gi)) {
    const part = m[2]!.toLowerCase();
    const meridiem = part === "morning" ? "am" : "pm";
    let hour = Number(m[1]);
    if (part === "night" && hour === 12) hour = 0;
    add(m.index ?? 0, toHHMM(hour, 0, meridiem));
  }
  for (const m of text.matchAll(/\b(?:at|around|by|before|after|from|till|until)\s+(\d{1,2})\b/gi)) {
    add((m.index ?? 0) + m[0].length - m[1]!.length, toHHMM(Number(m[1]), 0));
  }

  hits.sort((a, b) => a.index - b.index);

  const ARRIVAL_CUE = /(arrive|arrival|reach|by|before|latest|no later|must be|get there|get in)\b[^.]{0,24}$/;
  const DEPARTURE_CUE = /(depart|departure|leave|start|at|around|after|from|till|until)\b[^.]{0,24}$/;

  let departureTime: string | null = null;
  let arrivalTime: string | null = null;

  for (const hit of hits) {
    const before = text.slice(Math.max(0, hit.index - 26), hit.index);
    const isArrival = ARRIVAL_CUE.test(before);
    const isDeparture = DEPARTURE_CUE.test(before);
    if (isArrival && !arrivalTime) arrivalTime = hit.value;
    else if (isDeparture && !departureTime) departureTime = hit.value;
    else if (!departureTime) departureTime = hit.value;
    else if (!arrivalTime) arrivalTime = hit.value;
  }

  return { departureTime, arrivalTime };
}

export function extractDateExtended(text: string, today = new Date()): string | null {
  const base = extractDate(text, today);
  if (base) return base;

  const inDays = text.match(/\bin\s+(\d{1,2})\s+days?\b/);
  if (inDays) {
    const d = new Date(today);
    d.setDate(d.getDate() + Number(inDays[1]));
    return toISO(d);
  }
  if (/\bnext week\b/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return toISO(d);
  }
  if (/\bweekend\b/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    return toISO(d);
  }
  const weekday = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (weekday) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const target = days.indexOf(weekday[1]!);
    let delta = (target - today.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    const d = new Date(today);
    d.setDate(d.getDate() + delta);
    return toISO(d);
  }
  return null;
}

function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function extractCoachClass(text: string): CoachClass | null {
  if (/\bsleeper\b|\bberth\b|\bsleeping\b|\b2tier\b|\b3tier\b|\b2-tier\b|\b3-tier\b/.test(text)) return "sleeper";
  if (/\bseater\b|\bchair car\b|\bchaircar\b|\brecliner\b|\bsitting\b/.test(text)) return "seater";
  return null;
}

const ACCESSIBILITY_RULES: Array<[AccessibilityOption, RegExp]> = [
  ["wheelchair", /wheelchair|wheel chair/],
  ["senior", /senior citizen|senior|elderly|old age/],
  ["infant", /\binfant\b|\bbaby\b|\btoddler\b/],
  ["pregnant", /pregnan/],
  ["vision", /visually impaired|blind|low vision/],
  ["hearing", /hearing impaired|\bdeaf\b/],
  ["service-animal", /service animal|guide dog/],
];

export function extractAccessibility(text: string): AccessibilityOption[] {
  const found: AccessibilityOption[] = [];
  for (const [token, re] of ACCESSIBILITY_RULES) {
    if (re.test(text) && !found.includes(token)) found.push(token);
  }
  return found;
}

export function extractLuggage(text: string): LuggageRequirement | null {
  if (!/luggage|baggage|\bbags?\b|\bkg\b|suitcase|backpack/.test(text)) return null;
  const checked = text.match(/(\d{1,2})\s*(?:checked|check-in|checkin|hold)\s*(?:bags?|luggage|baggage)?/i);
  const cabin = text.match(/(\d{1,2})\s*(?:cabin|hand|carry[- ]?on)\s*(?:bags?|luggage|baggage)?/i);
  const kg = text.match(/(\d{1,3})\s*kg/i);
  const specialMatch = text.match(/(extra luggage|heavy luggage|oversized|no luggage|light luggage|excess baggage)/i);
  const special = specialMatch ? specialMatch[1]!.toLowerCase() : kg ? `${kg[1]} kg` : null;
  return {
    cabin: cabin ? Math.min(9, Number(cabin[1])) : 0,
    checked: checked ? Math.min(9, Number(checked[1])) : 0,
    special,
  };
}

function extractConnection(text: string, kind: "first" | "last"): string | null {
  const cue =
    kind === "first"
      ? /(first mile|from home|home pickup|pickup|pick me|to the station|to the airport|to the bus stand)/
      : /(last mile|drop|to the hotel|to the office|from the station|from the airport|from the bus stand|reach home)/;
  const match = text.match(cue);
  if (!match) {
    if (kind === "first" && /door to door|door-to-door/.test(text)) return "door-to-door";
    if (kind === "last" && /door to door|door-to-door/.test(text)) return "door-to-door";
    return null;
  }
  const around = text.slice(Math.max(0, (match.index ?? 0) - 20), (match.index ?? 0) + match[0].length + 30);
  const mode = around.match(/\b(cab|taxi|auto|cab|metro|bus|walk|walking|train|flight|bike)\b/);
  if (mode) return mode[1]!.toLowerCase();
  return match[1]!.trim().toLowerCase();
}

export function extractFirstMile(text: string): string | null {
  return extractConnection(text, "first");
}

export function extractLastMile(text: string): string | null {
  return extractConnection(text, "last");
}

function extractRoute(
  normalized: string,
  vocabulary: readonly string[],
): { origin: string | null; destination: string | null } {
  const canonical = new Map(vocabulary.map((c) => [c.toLowerCase(), c]));
  const segFrom = normalized.match(/\bfrom\s+([a-z ]{3,25}?)(?=\s+(?:to|on|at|for|by|next|this|tomorrow|today|in|under|within|with|budget|by)\b|$)/);
  const segTo = normalized.match(/\b(?:to|into|towards)\s+([a-z ]{3,25}?)(?=\s+(?:on|at|for|by|next|this|tomorrow|today|in|under|within|with|budget|and)\b|$)/);

  const matchCity = (value: string | undefined, exclude: string[]): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const known = canonical.get(trimmed);
    if (known) return known;
    for (const [lower, name] of canonical) {
      if (exclude.includes(name)) continue;
      if (trimmed.includes(lower)) return name;
    }
    return titleCase(trimmed);
  };

  let origin = matchCity(segFrom?.[1], []);
  let destination = matchCity(segTo?.[1], origin ? [origin] : []);

  if (!origin) {
    for (const [lower, name] of canonical) {
      if (destination && name === destination) continue;
      if (new RegExp(`\\b${lower}\\b`).test(normalized)) {
        const before = normalized.slice(Math.max(0, normalized.indexOf(lower) - 6), normalized.indexOf(lower));
        if (/\b(from|via)\b/.test(before)) continue;
        origin = name;
        break;
      }
    }
  }
  if (!destination) {
    for (const [lower, name] of canonical) {
      if (origin && name === origin) continue;
      if (new RegExp(`\\b${lower}\\b`).test(normalized)) {
        destination = name;
        break;
      }
    }
  }

  if (origin && destination && origin === destination) destination = null;
  return { origin, destination };
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractArrival(text: string, today: Date): { arrivalDate: string | null; arrivalTime: string | null } {
  const times = extractTimes(text);
  const arrivalMatch = text.match(/(?:reach|arrive|be there|get there|must reach|reach by|arrive by)[^.]{0,50}/);
  let arrivalDate: string | null = null;
  if (arrivalMatch) arrivalDate = extractDateExtended(arrivalMatch[0], today);
  return { arrivalDate, arrivalTime: times.arrivalTime };
}

// ── Main extraction ──────────────────────────────────────────────────────────

export interface ExtractOptions {
  today?: Date;
  vocabulary?: readonly string[];
  language?: LanguageCode;
}

export function extractTripPlan(input: string, options: ExtractOptions = {}): PlanExtraction {
  const today = options.today ?? new Date();
  const vocabulary = options.vocabulary ?? PLAN_CITIES;
  const normalized = normalizeInput(input);
  const plan = createEmptyTripPlan();

  if (normalized) {
    const route = extractRoute(normalized, vocabulary);
    plan.origin = route.origin;
    plan.destination = route.destination;

    plan.departureDate = extractDateExtended(normalized, today);
    const times = extractTimes(normalized);
    plan.departureTime = times.departureTime;
    plan.arrivalTime = times.arrivalTime;

    const arrival = extractArrival(normalized, today);
    if (arrival.arrivalDate && arrival.arrivalDate !== plan.departureDate) plan.arrivalDate = arrival.arrivalDate;

    plan.departureWindow = extractDepartureWindow(normalized);
    if (!plan.departureWindow && plan.departureTime) plan.departureWindow = windowFromTime(plan.departureTime);

    plan.passengers = extractPassengers(normalized);
    plan.maxBudget = extractBudget(normalized);
    plan.coachClass = extractCoachClass(normalized);
    plan.accessibility = extractAccessibility(normalized);
    plan.luggage = extractLuggage(normalized);
    plan.firstMile = extractFirstMile(normalized);
    plan.lastMile = extractLastMile(normalized);
  }

  const captured = capturedFields(plan);
  const missing = missingFields(plan).essential;
  const confidence = confidenceFor(captured, missing);

  return { plan, captured, missing, confidence, source: "rule" };
}

export function capturedFields(plan: TripPlan): PlanFieldKey[] {
  const keys: PlanFieldKey[] = [];
  for (const field of PLAN_FIELDS) {
    if (isFieldFilled(plan, field.key)) keys.push(field.key);
  }
  return keys;
}

export function isFieldFilled(plan: TripPlan, key: PlanFieldKey): boolean {
  const value = plan[key];
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return true;
  return value !== null && value !== undefined && value !== "";
}

export function missingFields(plan: TripPlan): { essential: PlanFieldKey[]; recommended: PlanFieldKey[] } {
  const essential: PlanFieldKey[] = [];
  const recommended: PlanFieldKey[] = [];
  for (const field of PLAN_FIELDS) {
    if (isFieldFilled(plan, field.key)) continue;
    if (field.essential) essential.push(field.key);
    else recommended.push(field.key);
  }
  return { essential, recommended };
}

function confidenceFor(captured: PlanFieldKey[], missing: PlanFieldKey[]): number {
  const essentialTotal = ESSENTIAL_FIELDS.length;
  const essentialCaptured = essentialTotal - missing.length;
  const bonus = Math.min(0.2, captured.length * 0.015);
  return Math.round(Math.min(1, (essentialCaptured / essentialTotal) * 0.8 + bonus) * 100) / 100;
}

// ── Merge, sanitize & validate ───────────────────────────────────────────────

const EMPTY_STRINGS = new Set(["", "any", "anywhere", "not sure", "unknown"]);

/** Fills only the empty slots of `base` from `patch` — never overwrites user values. */
export function mergeTripPlan(base: TripPlan, patch: Partial<TripPlan>): TripPlan {
  const merged: TripPlan = { ...base, accessibility: [...base.accessibility] };
  (Object.keys(patch) as PlanFieldKey[]).forEach((key) => {
    const incoming = patch[key];
    if (incoming === undefined || incoming === null) return;
    if (Array.isArray(incoming)) {
      if (incoming.length && merged.accessibility.length === 0 && key === "accessibility") {
        merged.accessibility = [...(incoming as string[])];
      }
      return;
    }
    if (typeof incoming === "string" && EMPTY_STRINGS.has(incoming.trim().toLowerCase())) return;
    const current = merged[key];
    const isEmpty = current === null || current === undefined || current === "";
    if (isEmpty) {
      (merged as unknown as Record<string, unknown>)[key] = incoming;
    }
  });
  return merged;
}

export function sanitizeTripPlan(raw: unknown): TripPlan {
  const plan = createEmptyTripPlan();
  if (!raw || typeof raw !== "object") return plan;
  const data = raw as Record<string, unknown>;

  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    if (!trimmed || EMPTY_STRINGS.has(trimmed.toLowerCase())) return null;
    return trimmed;
  };

  plan.origin = str(data.origin);
  plan.destination = str(data.destination);

  const isoDate = (v: unknown): string | null => {
    const s = str(v);
    if (!s) return null;
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : s;
  };
  plan.departureDate = isoDate(data.departureDate);
  plan.arrivalDate = isoDate(data.arrivalDate);

  const clock = (v: unknown): string | null => {
    const s = str(v);
    if (!s) return null;
    const withColon = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (withColon) return toHHMM(Number(withColon[1]), Number(withColon[2]), withColon[3]?.toLowerCase());
    const bare = s.match(/^(\d{1,2})\s*(am|pm)$/i);
    if (bare) return toHHMM(Number(bare[1]), 0, bare[2]!.toLowerCase());
    return null;
  };
  plan.departureTime = clock(data.departureTime);
  plan.arrivalTime = clock(data.arrivalTime);

  const num = (v: unknown, min: number, max: number): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, Math.round(n)));
  };
  plan.passengers = num(data.passengers, 1, 9);
  plan.maxBudget = data.maxBudget == null ? null : num(data.maxBudget, 0, 10_000_000);

  if (typeof data.coachClass === "string" && COACH_CLASSES.includes(data.coachClass as CoachClass)) {
    plan.coachClass = data.coachClass as CoachClass;
  }
  if (typeof data.departureWindow === "string" && DEPARTURE_WINDOWS.includes(data.departureWindow as DepartureWindow)) {
    plan.departureWindow = data.departureWindow as DepartureWindow;
  }
  if (Array.isArray(data.accessibility)) {
    plan.accessibility = data.accessibility
      .map((v) => (typeof v === "string" ? v.toLowerCase().trim() : ""))
      .filter((v): v is AccessibilityOption => (ACCESSIBILITY_OPTIONS as readonly string[]).includes(v));
  }
  if (data.luggage && typeof data.luggage === "object") {
    const luggage = data.luggage as Record<string, unknown>;
    plan.luggage = {
      cabin: num(luggage.cabin, 0, 9) ?? 0,
      checked: num(luggage.checked, 0, 9) ?? 0,
      special: str(luggage.special),
    };
  }
  plan.firstMile = str(data.firstMile);
  plan.lastMile = str(data.lastMile);

  return plan;
}

export function validateTripPlan(plan: TripPlan, now = new Date()): PlanValidation {
  const errors: Partial<Record<PlanFieldKey, string>> = {};
  const todayISO = toISO(now);

  if (!plan.origin) errors.origin = "planner.error.originRequired";
  if (!plan.destination) errors.destination = "planner.error.destinationRequired";
  if (plan.origin && plan.destination && plan.origin.toLowerCase() === plan.destination.toLowerCase()) {
    errors.destination = "planner.error.sameCity";
  }
  if (!plan.departureDate) errors.departureDate = "planner.error.dateRequired";
  else if (plan.departureDate < todayISO) errors.departureDate = "planner.error.datePast";
  if (plan.passengers === null) errors.passengers = "planner.error.passengersRequired";
  else if (plan.passengers < 1 || plan.passengers > 9) errors.passengers = "planner.error.passengersRange";

  if (plan.departureTime && !/^\d{2}:\d{2}$/.test(plan.departureTime)) errors.departureTime = "planner.error.timeFormat";
  if (plan.arrivalTime && !/^\d{2}:\d{2}$/.test(plan.arrivalTime)) errors.arrivalTime = "planner.error.timeFormat";

  if (plan.arrivalDate) {
    if (plan.departureDate && plan.arrivalDate < plan.departureDate) {
      errors.arrivalDate = "planner.error.arrivalBeforeDeparture";
    } else if (plan.departureDate && plan.arrivalDate === plan.departureDate && plan.arrivalTime && plan.departureTime) {
      if (plan.arrivalTime <= plan.departureTime) errors.arrivalTime = "planner.error.arrivalTimeBeforeDeparture";
    }
  }

  return { errors, ok: Object.keys(errors).length === 0 };
}

// ── Follow-up questions ──────────────────────────────────────────────────────

const QUESTIONS: Record<"en" | "te", Partial<Record<PlanFieldKey, (plan: TripPlan) => string>>> = {
  en: {
    origin: () => "Which city are you starting from?",
    destination: (plan) =>
      plan.origin ? `Great — travelling from ${plan.origin}. Where would you like to go?` : "Where would you like to go?",
    departureDate: (plan) => `When would you like to leave${plan.destination ? ` for ${plan.destination}` : ""}?`,
    passengers: () => "How many passengers are travelling?",
  },
  te: {
    origin: () => "మీరు ఏ నగరం నుండి ప్రయాణం ప్రారంభిస్తున్నారు?",
    destination: (plan) =>
      plan.origin ? `సరే — ${plan.origin} నుండి. మీరు ఎక్కడికి వెళ్లాలనుకుంటున్నారు?` : "మీరు ఎక్కడికి వెళ్లాలనుకుంటున్నారు?",
    departureDate: (plan) => `మీరు ఎప్పుడు బయలుదేరాలనుకుంటున్నారు${plan.destination ? ` — ${plan.destination}కు` : ""}?`,
    passengers: () => "ఎంతమంది ప్రయాణిస్తున్నారు?",
  },
};

export function plannerQuestion(field: PlanFieldKey, plan: TripPlan, lang: LanguageCode = "en"): string {
  const table = lang === "te" ? QUESTIONS.te : QUESTIONS.en;
  const builder = table[field] ?? QUESTIONS.en[field];
  return builder ? builder(plan) : "Could you share a few more details?";
}

export function summarizePlan(plan: TripPlan): string {
  const parts: string[] = [];
  if (plan.origin && plan.destination) parts.push(`${plan.origin} → ${plan.destination}`);
  if (plan.departureDate) parts.push(`departing ${plan.departureDate}${plan.departureTime ? ` at ${plan.departureTime}` : ""}`);
  if (plan.arrivalDate) parts.push(`arrive by ${plan.arrivalDate}${plan.arrivalTime ? ` ${plan.arrivalTime}` : ""}`);
  if (plan.passengers) parts.push(`${plan.passengers} passenger${plan.passengers > 1 ? "s" : ""}`);
  if (plan.maxBudget) parts.push(`budget ₹${plan.maxBudget}`);
  if (plan.coachClass) parts.push(`${plan.coachClass} coach`);
  return parts.join(", ");
}
