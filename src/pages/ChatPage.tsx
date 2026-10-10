import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, Sparkles, Trash2, User, Search as SearchIcon, Route } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { useSettings } from "../state/SettingsContext";
import { CHAT_SUGGESTIONS, respondToMessage } from "../lib/chat";
import type { ChatMessage } from "../lib/types";
import type { ParsedTripRequest } from "../lib/intent";
import { cn } from "../lib/cn";

let counter = 0;
const nextId = () => `msg-${Date.now()}-${counter++}`;

function welcome(): ChatMessage {
  return {
    id: nextId(),
    role: "assistant",
    text: "Namaste! I am RoamAgent. I can plan trips, compare itineraries, watch for disruptions and review bookings. Tell me what you need — for example, \"cheapest route from Bengaluru to Chennai next weekend for 2 people under ₹6000\".",
    createdAt: new Date().toISOString(),
    chips: CHAT_SUGGESTIONS,
  };
}

export function ChatPage() {
  const { t, announce } = useSettings();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([welcome()]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<ParsedTripRequest | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function send(text: string) {
    const value = text.trim();
    if (!value) {
      setError("Please type a message before sending.");
      return;
    }
    setError(null);
    const userMsg: ChatMessage = { id: nextId(), role: "user", text: value, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setTyping(true);

    window.setTimeout(() => {
      try {
        const reply = respondToMessage(value);
        const assistantMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          text: reply.text,
          createdAt: new Date().toISOString(),
          chips: reply.chips,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        announce("RoamAgent replied");
        if (reply.request) setLastRequest(reply.request);
      } catch {
        setError("RoamAgent could not respond. Please try again.");
      } finally {
        setTyping(false);
      }
    }, 650);
  }

  function openInSearch(req: ParsedTripRequest) {
    navigate("/search", {
      state: {
        from: req.from,
        to: req.to,
        date: req.date,
        travellers: req.travellers,
        budget: req.budget,
        pref: req.pref,
      },
    });
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title={t("nav.chat")}
        description="Describe your trip in plain language. RoamAgent extracts intent, ranks options and can hand off to search or booking."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<Route className="h-4 w-4" />} onClick={() => navigate("/plan")}>
              {t("planner.title")}
            </Button>
            <Button variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={() => setMessages([welcome()])}>
              Clear chat
            </Button>
          </div>
        }
      />

      <div className="card flex h-[62vh] flex-col p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                  m.role === "assistant" ? "bg-teal-500/20 text-teal-200" : "bg-navy-600 text-white",
                )}
                aria-hidden="true"
              >
                {m.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </span>
              <div className={cn("max-w-[85%] space-y-2", m.role === "user" && "items-end text-right")}>
                <div
                  className={cn(
                    "whitespace-pre-line rounded-2xl px-4 py-3 text-sm",
                    m.role === "assistant"
                      ? "border border-white/10 bg-white/[0.04] text-slate-200"
                      : "bg-teal-500 text-navy-950",
                  )}
                >
                  {m.text}
                </div>
                {m.chips && m.role === "assistant" && (
                  <div className="flex flex-wrap gap-2">
                    {m.chips.map((chip) => (
                      <button key={chip} type="button" onClick={() => send(chip)} className="chip hover:border-teal-500/50">
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex items-center gap-3 text-slate-400">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-500/20 text-teal-200">
                <Bot className="h-5 w-5" />
              </span>
              <span className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-300" />
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3 sm:p-4">
          {error && (
            <p role="alert" className="mb-2 text-sm font-medium text-rose-300">
              {error}
            </p>
          )}
          {lastRequest && (lastRequest.from || lastRequest.to) && (
            <button
              type="button"
              onClick={() => openInSearch(lastRequest)}
              className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-teal-300 hover:text-teal-200"
            >
              <SearchIcon className="h-4 w-4" />
              Open “{lastRequest.from ?? "any"} → {lastRequest.to ?? "any"}” in Trip Search
            </button>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={2}
              aria-label="Message RoamAgent"
              placeholder="Ask about routes, budgets, safety, disruptions…"
              className="input min-h-[52px] flex-1 resize-none"
            />
            <Button type="submit" loading={typing} icon={<Send className="h-4 w-4" />} aria-label="Send message">
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
