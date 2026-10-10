import { CITIES, itineraries } from "./mock";
import { parseTripRequest, type ParsedTripRequest } from "./intent";
import { formatDuration, formatMoney } from "./format";
import { totalDuration } from "./compare";

export interface ChatReply {
  text: string;
  chips?: string[];
  request?: ParsedTripRequest;
}

const SUGGESTIONS = [
  "Plan a weekend trip from Bengaluru to Hyderabad",
  "Cheapest way to reach Chennai under ₹5000",
  "Safest overnight route to Kochi for 3 people",
  "Where can I go next weekend?",
];

function describeRequest(req: ParsedTripRequest): string {
  const bits: string[] = [];
  bits.push(req.from ? `from ${req.from}` : "from an origin you choose");
  bits.push(req.to ? `to ${req.to}` : "to a destination you choose");
  if (req.date) bits.push(`on ${req.date}`);
  if (req.travellers > 1) bits.push(`for ${req.travellers} travellers`);
  if (req.budget) bits.push(`within a budget of ${formatMoney(req.budget)}`);
  bits.push(`prioritising ${req.pref}`);
  return bits.join(", ");
}

function recommend(req: ParsedTripRequest): string {
  const pool = itineraries.filter(
    (i) =>
      (!req.from || i.from === req.from) &&
      (!req.to || i.to === req.to) &&
      (!req.budget || i.price <= req.budget),
  );
  const list = (pool.length ? pool : itineraries).slice(0, 3);
  const lines = list.map(
    (i, idx) =>
      `${idx + 1}. ${i.title} — ${formatMoney(i.price)}, ${formatDuration(totalDuration(i))}, safety ${i.safetyScore}/100 (${i.tags.join(", ")})`,
  );
  const miss =
    pool.length === 0
      ? "\n\nI could not find an exact match for that city pair, so I ranked our demo inventory instead. Connect the RoamAgent API for live inventory."
      : "";
  return `Here are my top picks prioritising ${req.pref}:\n${lines.join("\n")}${miss}`;
}

export function respondToMessage(input: string, now = new Date()): ChatReply {
  const text = input.trim();
  if (!text) {
    return { text: "Tell me where you want to go and I will plan the rest.", chips: SUGGESTIONS };
  }

  const t = text.toLowerCase();

  if (/^(hi|hello|hey|namaste|good (morning|evening))\b/.test(t)) {
    return {
      text: "Namaste! I am RoamAgent, your agentic travel concierge. I can search trips, compare itineraries, watch for disruptions and review bookings. What are we planning today?",
      chips: SUGGESTIONS,
    };
  }

  if (/(cancel|refund)/.test(t)) {
    return {
      text: "I can start a cancellation for any upcoming trip. Cancellations before 24h of departure are refunded at 90%; after that the fare is non-refundable. Open My Trips and pick the booking, or say the trip reference (e.g. TBS-4821).",
      chips: ["Show my trips", "What is my refund policy?"],
    };
  }

  if (/(delay|late|disrupt|cancel(?:led|ed)? flight|strike)/.test(t)) {
    return {
      text: "Disruption desk active. I am monitoring 2 live alerts: a 45-min delay on 6E-2145 (Hyderabad) and a red-rain advisory for Kochi. I can auto-rebook you on the next reliable option — want me to hold seats?",
      chips: ["Show disruption centre", "Rebook me on the next option"],
    };
  }

  if (/(compare|versus|vs\b|better|difference)/.test(t)) {
    return {
      text: "I can compare up to 3 itineraries across price, total travel time, stops, safety score, on-time record and carbon output. Open Itinerary Comparison and I will highlight the winner for your priority.",
      chips: ["Open comparison", "Compare cheapest vs fastest"],
    };
  }

  if (/(my trips|bookings|itinerary for me|show trips)/.test(t)) {
    return {
      text: "You have 2 upcoming trips (Bengaluru → Hyderabad on 18 Oct, Kochi family vacation on 5 Nov), 1 completed and 1 cancelled. My Trips has check-in, seats and documents for each.",
      chips: ["Open My Trips", "Check-in for TBS-4821"],
    };
  }

  const req = parseTripRequest(text, CITIES, now);
  const mentionsTravel = /(trip|travel|go|visit|fly|flight|train|bus|reach|route|journey|vacation|holiday|weekend)/.test(t);

  if (req.from || req.to || mentionsTravel) {
    return {
      text: `Understood — ${describeRequest(req)}.\n\n${recommend(req)}`,
      chips: ["Compare these itineraries", "Show disruption centre", "Refine the budget"],
      request: req,
    };
  }

  if (/(weather|rain|safe now|advisory)/.test(t)) {
    return {
      text: "Live advisories: red-rain alert for Kochi (05–06 Nov), BLR Terminal 1 security queues over 40 min in the morning, and normal operations everywhere else. Travel risk index today: 2.4 / 10 (low).",
      chips: ["Open disruption centre"],
    };
  }

  return {
    text: "I can help with trip search, itinerary comparison, disruption recovery and booking review. Try: \"Plan a weekend trip from Bengaluru to Hyderabad for 2 under ₹15000\".",
    chips: SUGGESTIONS,
  };
}

export const CHAT_SUGGESTIONS = SUGGESTIONS;
