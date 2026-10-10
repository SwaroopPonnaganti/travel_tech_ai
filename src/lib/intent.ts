import type { TravelPref } from "./types";

export interface ParsedTripRequest {
  from: string | null;
  to: string | null;
  date: string | null;
  travellers: number;
  budget: number | null;
  pref: TravelPref;
  keywords: string[];
  confidence: number;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const PREPOSITIONS = ["from", "to", "between", "->", "→"];

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function findCity(text: string, vocabulary: readonly string[], exclude: string[] = []): string | null {
  for (const city of vocabulary) {
    if (exclude.includes(city)) continue;
    const idx = text.indexOf(city.toLowerCase());
    if (idx === -1) continue;
    const before = text.slice(Math.max(0, idx - 6), idx);
    if (PREPOSITIONS.some((p) => before.includes(p))) continue;
    return city;
  }
  return null;
}

export function extractBudget(text: string): number | null {
  const regex =
    /(₹|rs\.?|inr|under|below|within|budget(?: of)?|less than|upto|up to)?\s*([\d][\d,]*)\s*(k|thousand|lakh|l)?/gi;
  let best: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const [, cue, digits, suffix] = match;
    if (!digits) continue;
    const raw = Number(digits.replace(/,/g, ""));
    if (!Number.isFinite(raw)) continue;
    const s = (suffix ?? "").toLowerCase();
    let value = raw;
    if (s === "k" || s === "thousand") value = raw * 1000;
    else if (s === "lakh" || s === "l") value = raw * 100000;

    if (cue || s) return value;
    if (raw >= 1000) best = Math.max(best ?? 0, raw);
  }
  return best;
}

export function extractTravellers(text: string): number {
  const perPerson = text.match(/(\d{1,2})\s*(?:pax|people|persons|passengers|travellers|travelers|adults|of us)/i);
  if (perPerson) return Math.min(9, Math.max(1, Number(perPerson[1])));
  const word: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, one: 1 };
  for (const [w, n] of Object.entries(word)) {
    if (new RegExp(`\\b${w}\\s*(?:people|of us|travellers|travelers|pax)?\\b`).test(text) && new RegExp(`\\b${w}\\b`).test(text))
      return n;
  }
  return 1;
}

export function extractDate(text: string, today = new Date()): string | null {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (/next weekend|upcoming weekend/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return iso(d);
  }
  if (/this weekend/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    return iso(d);
  }
  if (/tomorrow/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return iso(d);
  }
  if (/\btoday\b/.test(text)) return iso(today);
  const named = text.match(new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2})\\b`));
  if (named) {
    const month = MONTHS.indexOf(named[1]!);
    const d = new Date(today.getFullYear(), month, Number(named[2]));
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return iso(d);
  }
  const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return explicit[1]!;
  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const year = slash[3] ? Number(slash[3]) + (slash[3]!.length === 2 ? 2000 : 0) : today.getFullYear();
    const d = new Date(year, Number(slash[2]) - 1, Number(slash[1]));
    return iso(d);
  }
  return null;
}

export function extractPreference(text: string): { pref: TravelPref; keywords: string[] } {
  const keywords: string[] = [];
  let pref: TravelPref = "balanced";
  const rules: Array<[RegExp, TravelPref, string]> = [
    [/\b(cheapest|cheap|budget|low cost|affordable|save money)\b/, "cheapest", "budget"],
    [/\b(fastest|quick|shortest|in a hurry|nonstop|non-stop)\b/, "fastest", "speed"],
    [/\b(safe|safety|secure|women.friendly|family)\b/, "safest", "safety"],
    [/\b(luxury|premium|comfort|business)\b/, "balanced", "comfort"],
  ];
  for (const [re, p, kw] of rules) {
    if (re.test(text)) {
      pref = p;
      keywords.push(kw);
    }
  }
  if (/\bnight\b|\bovernight\b/.test(text)) keywords.push("overnight");
  if (/\bweekend\b/.test(text)) keywords.push("weekend");
  return { pref, keywords };
}

export function parseTripRequest(
  text: string,
  vocabulary: readonly string[] = [],
  today = new Date(),
): ParsedTripRequest {
  const t = normalise(text);
  const { pref, keywords } = extractPreference(t);

  const segFrom = t.match(/\bfrom\s+([a-z ]{3,25}?)(?=\s+(?:to|on|for|by|next|this|tomorrow|in|under|within|with|budget)\b|$)/);
  const segTo = t.match(/\b(?:to|into)\s+([a-z ]{3,25}?)(?=\s+(?:on|for|by|next|this|tomorrow|in|under|within|with|budget|and)\b|$)/);

  let from = segFrom ? segFrom[1]!.trim() : null;
  let to = segTo ? segTo[1]!.trim() : null;

  if (vocabulary.length) {
    const canonical = new Map(vocabulary.map((c) => [c.toLowerCase(), c]));
    if (from) from = canonical.get(from) ?? findCity(from, vocabulary) ?? from;
    if (to) to = canonical.get(to) ?? findCity(to, vocabulary, from ? [from] : []) ?? to;
    if (!from) from = findCity(t, vocabulary, to ? [to] : []);
    if (!to) to = findCity(t, vocabulary, from ? [from] : []);
  }

  const travellers = extractTravellers(t);
  const budget = extractBudget(t);
  const date = extractDate(t, today);

  const signals = [from, to, date, budget, pref !== "balanced" ? pref : null].filter(Boolean).length;
  const confidence = Math.min(1, 0.2 + signals * 0.2 + (keywords.length ? 0.1 : 0));

  return { from, to, date, travellers, budget, pref, keywords, confidence };
}
