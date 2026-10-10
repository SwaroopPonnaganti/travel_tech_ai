import type { Itinerary, TravelPref } from "./types";

export interface ComparisonRow {
  itinerary: Itinerary;
  score: number;
  winner: boolean;
  reasons: string[];
  metrics: {
    price: number;
    durationMin: number;
    stops: number;
    safetyScore: number;
    reliabilityPct: number;
    co2Kg: number;
  };
}

const NORMALISE = {
  price: (v: number, min: number, max: number) => (max === min ? 1 : (max - v) / (max - min)),
  duration: (v: number, min: number, max: number) => (max === min ? 1 : (max - v) / (max - min)),
  higher: (v: number, min: number, max: number) => (max === min ? 1 : (v - min) / (max - min)),
};

const WEIGHTS: Record<TravelPref, { price: number; speed: number; safety: number; comfort: number; eco: number }> = {
  balanced: { price: 0.25, speed: 0.25, safety: 0.25, comfort: 0.15, eco: 0.1 },
  cheapest: { price: 0.55, speed: 0.1, safety: 0.15, comfort: 0.1, eco: 0.1 },
  fastest: { price: 0.15, speed: 0.5, safety: 0.15, comfort: 0.1, eco: 0.1 },
  safest: { price: 0.15, speed: 0.15, safety: 0.5, comfort: 0.1, eco: 0.1 },
};

export function totalDuration(it: Itinerary): number {
  return it.legs.reduce((sum, leg) => sum + leg.durationMin, 0);
}

export function scoreItineraries(items: Itinerary[], pref: TravelPref): ComparisonRow[] {
  if (items.length === 0) return [];
  const prices = items.map((i) => i.price);
  const durs = items.map(totalDuration);
  const safeties = items.map((i) => i.safetyScore);
  const rels = items.map((i) => i.reliabilityPct);
  const co2s = items.map((i) => i.co2Kg);

  const range = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });
  const p = range(prices);
  const d = range(durs);
  const s = range(safeties);
  const r = range(rels);
  const c = range(co2s);
  const w = WEIGHTS[pref];

  const rows: ComparisonRow[] = items.map((it) => {
    const dur = totalDuration(it);
    const comfort = NORMALISE.higher((it.rating / 5) * 100, 0, 100);
    const reliability = NORMALISE.higher(it.reliabilityPct, r.min, r.max);
    const score =
      100 *
      (w.price * NORMALISE.price(it.price, p.min, p.max) +
        w.speed * NORMALISE.duration(dur, d.min, d.max) +
        w.safety * NORMALISE.higher(it.safetyScore, s.min, s.max) +
        w.comfort * (0.6 * comfort + 0.4 * reliability) +
        w.eco * NORMALISE.higher(100 - it.co2Kg, 100 - c.max, 100 - c.min));

    const reasons: string[] = [];
    if (it.price === p.min) reasons.push("Lowest fare in this set");
    if (dur === d.min) reasons.push("Shortest total travel time");
    if (it.safetyScore === s.max) reasons.push("Highest safety score");
    if (it.reliabilityPct === r.max) reasons.push("Best on-time record");
    if (it.co2Kg === c.min) reasons.push("Lowest carbon footprint");
    if (it.stops === 0) reasons.push("Non-stop");
    if (it.refundable) reasons.push("Free cancellation");

    return {
      itinerary: it,
      score: Math.round(score * 10) / 10,
      winner: false,
      reasons,
      metrics: { price: it.price, durationMin: dur, stops: it.stops, safetyScore: it.safetyScore, reliabilityPct: it.reliabilityPct, co2Kg: it.co2Kg },
    };
  });

  rows.sort((a, b) => b.score - a.score);
  if (rows[0]) rows[0].winner = true;
  return rows;
}

export function preferenceLabel(pref: TravelPref): string {
  return { balanced: "Balanced", cheapest: "Cheapest", fastest: "Fastest", safest: "Safest" }[pref];
}
