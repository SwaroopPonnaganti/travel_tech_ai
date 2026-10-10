import { CheckCircle2, Route, Users, Clock, Accessibility, Link2 } from "lucide-react";
import { Field, Input, Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import {
  ACCESSIBILITY_OPTIONS,
  PLAN_CITIES,
  PLAN_FIELDS,
  type AccessibilityOption,
  type PlanFieldMeta,
} from "../../lib/planner";
import type { CoachClass, DepartureWindow, PlanFieldKey, TripPlan } from "../../lib/types";

interface TripPlanFormProps {
  plan: TripPlan;
  errors: Partial<Record<PlanFieldKey, string>>;
  captured: PlanFieldKey[];
  onChange: (plan: TripPlan) => void;
  onReset?: () => void;
  t: (key: string) => string;
}

const GROUP_ICONS: Record<PlanFieldMeta["group"], typeof Route> = {
  journey: Route,
  timing: Clock,
  travellers: Users,
  comfort: Accessibility,
  connections: Link2,
};

const GROUP_ORDER: PlanFieldMeta["group"][] = ["journey", "timing", "travellers", "comfort", "connections"];

const WINDOWS: DepartureWindow[] = ["early-morning", "morning", "afternoon", "evening", "night"];
const COACHES: CoachClass[] = ["seater", "sleeper"];

export function TripPlanForm({ plan, errors, captured, onChange, onReset, t }: TripPlanFormProps) {
  const set = <K extends PlanFieldKey>(key: K, value: TripPlan[K]) => onChange({ ...plan, [key]: value });
  const isCaptured = (key: PlanFieldKey) => captured.includes(key);
  const label = (key: PlanFieldKey) => t(`planner.field.${key}`);

  const toggleAccessibility = (option: AccessibilityOption) => {
    const next = plan.accessibility.includes(option)
      ? plan.accessibility.filter((v) => v !== option)
      : [...plan.accessibility, option];
    set("accessibility", next);
  };

  const setLuggage = (patch: Partial<NonNullable<TripPlan["luggage"]>>) => {
    const base = plan.luggage ?? { cabin: 0, checked: 0, special: null };
    set("luggage", { ...base, ...patch });
  };

  const fieldBadge = (key: PlanFieldKey) =>
    isCaptured(key) ? (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        {t("planner.capturedBadge")}
      </span>
    ) : null;

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map((group) => {
        const fields = PLAN_FIELDS.filter((f) => f.group === group);
        if (fields.length === 0) return null;
        const Icon = GROUP_ICONS[group];
        return (
          <fieldset key={group} className="space-y-4">
            <legend className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Icon className="h-4 w-4 text-teal-300" aria-hidden="true" />
              {t(`planner.group.${group}`)}
            </legend>

            {group === "journey" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={label("origin")} error={errors.origin ? t(errors.origin) : undefined}>
                  {(id) => (
                    <div className="relative">
                      <Input
                        id={id}
                        list="planner-cities"
                        value={plan.origin ?? ""}
                        invalid={!!errors.origin}
                        placeholder="Hyderabad"
                        onChange={(e) => set("origin", e.target.value || null)}
                      />
                      <span className="pointer-events-none absolute right-3 top-3">{fieldBadge("origin")}</span>
                    </div>
                  )}
                </Field>
                <Field label={label("destination")} error={errors.destination ? t(errors.destination) : undefined}>
                  {(id) => (
                    <div className="relative">
                      <Input
                        id={id}
                        list="planner-cities"
                        value={plan.destination ?? ""}
                        invalid={!!errors.destination}
                        placeholder="Bengaluru"
                        onChange={(e) => set("destination", e.target.value || null)}
                      />
                      <span className="pointer-events-none absolute right-3 top-3">{fieldBadge("destination")}</span>
                    </div>
                  )}
                </Field>
              </div>
            )}

            {group === "timing" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={label("departureDate")} error={errors.departureDate ? t(errors.departureDate) : undefined}>
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      value={plan.departureDate ?? ""}
                      invalid={!!errors.departureDate}
                      onChange={(e) => set("departureDate", e.target.value || null)}
                    />
                  )}
                </Field>
                <Field label={label("departureWindow")}>
                  {(id) => (
                    <Select
                      id={id}
                      value={plan.departureWindow ?? ""}
                      onChange={(e) => set("departureWindow", (e.target.value || null) as DepartureWindow | null)}
                    >
                      <option value="">{t("planner.window.any")}</option>
                      {WINDOWS.map((w) => (
                        <option key={w} value={w}>
                          {t(`planner.window.${w}`)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label={label("departureTime")}>
                  {(id) => (
                    <Input
                      id={id}
                      type="time"
                      value={plan.departureTime ?? ""}
                      onChange={(e) => set("departureTime", e.target.value || null)}
                    />
                  )}
                </Field>
                <Field label={label("arrivalDate")} error={errors.arrivalDate ? t(errors.arrivalDate) : undefined}>
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      value={plan.arrivalDate ?? ""}
                      invalid={!!errors.arrivalDate}
                      onChange={(e) => set("arrivalDate", e.target.value || null)}
                    />
                  )}
                </Field>
                <Field label={label("arrivalTime")} error={errors.arrivalTime ? t(errors.arrivalTime) : undefined}>
                  {(id) => (
                    <Input
                      id={id}
                      type="time"
                      value={plan.arrivalTime ?? ""}
                      invalid={!!errors.arrivalTime}
                      onChange={(e) => set("arrivalTime", e.target.value || null)}
                    />
                  )}
                </Field>
              </div>
            )}

            {group === "travellers" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={label("passengers")}
                  error={errors.passengers ? t(errors.passengers) : undefined}
                  hint="1–9 passengers"
                >
                  {(id) => (
                    <div className="relative">
                      <Input
                        id={id}
                        type="number"
                        min={1}
                        max={9}
                        value={plan.passengers ?? ""}
                        invalid={!!errors.passengers}
                        onChange={(e) => set("passengers", e.target.value === "" ? null : Number(e.target.value))}
                      />
                      <span className="pointer-events-none absolute right-3 top-3">{fieldBadge("passengers")}</span>
                    </div>
                  )}
                </Field>
                <Field label={label("maxBudget")} hint={t("planner.field.maxBudget.hint")}>
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      value={plan.maxBudget ?? ""}
                      placeholder="e.g. 8000"
                      onChange={(e) => set("maxBudget", e.target.value === "" ? null : Number(e.target.value))}
                    />
                  )}
                </Field>
              </div>
            )}

            {group === "comfort" && (
              <div className="space-y-4">
                <Field label={label("coachClass")}>
                  {(id) => (
                    <Select
                      id={id}
                      value={plan.coachClass ?? ""}
                      onChange={(e) => set("coachClass", (e.target.value || null) as CoachClass | null)}
                    >
                      <option value="">{t("planner.coach.any")}</option>
                      {COACHES.map((c) => (
                        <option key={c} value={c}>
                          {t(`planner.coach.${c}`)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <div>
                  <p className="label">{label("accessibility")}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ACCESSIBILITY_OPTIONS.map((option) => {
                      const active = plan.accessibility.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleAccessibility(option)}
                          className={cn("chip", active && "border-teal-400/60 bg-teal-500/15 text-teal-200")}
                        >
                          {t(`planner.access.${option}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t("planner.luggage.cabin")}>
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        min={0}
                        max={9}
                        value={plan.luggage?.cabin ?? 0}
                        onChange={(e) => setLuggage({ cabin: Number(e.target.value) || 0 })}
                      />
                    )}
                  </Field>
                  <Field label={t("planner.luggage.checked")}>
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        min={0}
                        max={9}
                        value={plan.luggage?.checked ?? 0}
                        onChange={(e) => setLuggage({ checked: Number(e.target.value) || 0 })}
                      />
                    )}
                  </Field>
                  <Field label={t("planner.luggage.special")}>
                    {(id) => (
                      <Input
                        id={id}
                        value={plan.luggage?.special ?? ""}
                        placeholder="e.g. extra luggage"
                        onChange={(e) => setLuggage({ special: e.target.value || null })}
                      />
                    )}
                  </Field>
                </div>
              </div>
            )}

            {group === "connections" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={label("firstMile")}>
                  {(id) => (
                    <Input
                      id={id}
                      value={plan.firstMile ?? ""}
                      placeholder={t("planner.firstMile.placeholder")}
                      onChange={(e) => set("firstMile", e.target.value || null)}
                    />
                  )}
                </Field>
                <Field label={label("lastMile")}>
                  {(id) => (
                    <Input
                      id={id}
                      value={plan.lastMile ?? ""}
                      placeholder={t("planner.lastMile.placeholder")}
                      onChange={(e) => set("lastMile", e.target.value || null)}
                    />
                  )}
                </Field>
              </div>
            )}
          </fieldset>
        );
      })}

      <datalist id="planner-cities">
        {PLAN_CITIES.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>

      {onReset && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onReset}>
            {t("planner.reset")}
          </Button>
        </div>
      )}
    </div>
  );
}
