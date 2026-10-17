/** Pure business logic for the planner, kept free of React so it can be unit-tested with Node.
 *  Everything here is simple and shown to the planner in the drawer. */

export type POLine = { sku: string; name: string; cases: number; case_pack: number; units: number; cost: number; changed: boolean };
export type PurchaseOrder = {
  po: string; supplier: string; lead_time_days: number; lines: POLine[]; units: number; cases: number; total_cost: number;
  sent_at: string; expected_delivery: string; status: "Sent" | "Acknowledged" | "Shipped" | "Received"; changed_lines: number; week: number;
};
export type PoInput = { sku: string; name: string; supplier: string; lead_time_days: number; case_pack: number; final_units: number; cost: number; changed: boolean };

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export function addDaysIso(iso: string, days: number) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return isoDate(d); }

/** One purchase order per supplier or DC, from the final (approved or overridden) order quantities. */
export function buildPurchaseOrders(items: PoInput[], storeId: string, sentAt: Date, seq = 1, week = 0): PurchaseOrder[] {
  const bySupplier = new Map<string, PoInput[]>();
  for (const it of items) if (it.final_units > 0) bySupplier.set(it.supplier, [...(bySupplier.get(it.supplier) ?? []), it]);
  const date = isoDate(sentAt);
  return [...bySupplier.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([supplier, list], i) => {
    const lines: POLine[] = list.map((it) => {
      const cases = Math.ceil(it.final_units / it.case_pack);
      return { sku: it.sku, name: it.name, cases, case_pack: it.case_pack, units: cases * it.case_pack, cost: round2(cases * it.case_pack * it.cost), changed: it.changed };
    });
    const lead = Math.max(...list.map((l) => l.lead_time_days));
    return {
      po: `PO-${date.replace(/-/g, "")}-${storeId}-${String(seq + i).padStart(3, "0")}`, supplier, lead_time_days: lead, lines,
      units: lines.reduce((s, l) => s + l.units, 0), cases: lines.reduce((s, l) => s + l.cases, 0), total_cost: round2(lines.reduce((s, l) => s + l.cost, 0)),
      sent_at: sentAt.toISOString(), expected_delivery: addDaysIso(date, lead), status: "Sent", changed_lines: lines.filter((l) => l.changed).length, week,
    };
  });
}

/** Open-to-buy check: the cost of what is being sent against the store's weekly cash limit. */
export function openToBuyCheck(ordersCost: number, openToBuy: number) {
  const over = Math.max(0, round2(ordersCost - openToBuy));
  return { ordersCost: round2(ordersCost), openToBuy, over, ok: ordersCost <= openToBuy, share: openToBuy > 0 ? ordersCost / openToBuy : 0 };
}

export const PO_STATUSES: PurchaseOrder["status"][] = ["Sent", "Acknowledged", "Shipped", "Received"];
/** Simulated supplier replies, in seconds after sending: acknowledged (EDI 855) after 20 s, shipped (EDI 856) after 60 s,
 *  received at the expected delivery date or after 120 s, whichever comes first. The stage derives from elapsed time,
 *  so a reload shows the same stage. */
export const STATUS_AFTER_SECONDS = { Acknowledged: 20, Shipped: 60, Received: 120 };
export function statusAt(po: Pick<PurchaseOrder, "sent_at" | "expected_delivery">, nowMs: number): PurchaseOrder["status"] {
  const s = (nowMs - Date.parse(po.sent_at)) / 1000;
  const delivered = nowMs >= Date.parse(po.expected_delivery + "T00:00:00");
  if (s >= STATUS_AFTER_SECONDS.Received || (delivered && s >= STATUS_AFTER_SECONDS.Shipped)) return "Received";
  return s >= STATUS_AFTER_SECONDS.Shipped ? "Shipped" : s >= STATUS_AFTER_SECONDS.Acknowledged ? "Acknowledged" : "Sent";
}

// ── Suggested offers ──────────────────────────────────────────────────────────────────────────────

export type MarkdownInput = { sku: string; name: string; fresh: boolean; shelf_life_days: number; on_hand: number; p50_next_week: number; price: number; cost: number };
export type MarkdownOffer = {
  kind: "markdown"; sku: string; name: string; units_at_risk: number; discount: number; days: string; expected_cleared: number;
  revenue_recovered: number; write_off_avoided: number; formula: string;
};

/** Markdown on fresh items whose stock on hand outlasts the shelf life: the units at risk are what is on
 *  hand beyond what the remaining shelf life can sell at the forecast rate. A 30% markdown is assumed to
 *  clear about 80% of them (a planning rule, not a measured elasticity). The money view is revenue recovered
 *  against the cost that would otherwise be written off: at a 25% margin a 30% markdown sells just below cost,
 *  which is still far better than binning the stock. */
export function markdownOffer(it: MarkdownInput, minUnits = 3): MarkdownOffer | null {
  if (!it.fresh || it.on_hand <= 0) return null;
  const daily = it.p50_next_week / 7;
  const sellable = daily * Math.max(it.shelf_life_days - 1, 0);
  const atRisk = Math.floor(Math.max(0, it.on_hand - sellable));
  if (atRisk < minUnits) return null;
  const discount = 0.30;
  const cleared = Math.min(atRisk, Math.round(atRisk * 0.8));          // 2.0x lift on the half-week the markdown runs ≈ 80% of at-risk units
  const revenue = round2(cleared * it.price * (1 - discount));
  const writeOffAvoided = round2(cleared * it.cost);
  return { kind: "markdown", sku: it.sku, name: it.name, units_at_risk: atRisk, discount, days: "Thu–Sat", expected_cleared: cleared, revenue_recovered: revenue, write_off_avoided: writeOffAvoided,
    formula: `at risk = on hand ${it.on_hand} − sellable before expiry ${sellable.toFixed(0)} (${(daily).toFixed(1)}/day × ${Math.max(it.shelf_life_days - 1, 0)} days) = ${atRisk}; cleared ≈ 80% at 30% off; revenue recovered = cleared × price × 0.70; write-off avoided = cleared × cost` };
}

export type PromoInput = { sku: string; name: string; cover_weeks: number; p50_next_week: number; last_year_promo_lift: number | null; price: number; cost: number; promo_now: boolean };
export type PromoOffer = { kind: "promo"; sku: string; name: string; reason: "excess" | "seasonal"; cover_weeks: number; lift: number; extra_units: number; margin: number; formula: string };

/** Flyer candidates: items with more than 2.5 weeks of cover after this order (excess stock), or items that
 *  lifted 1.3x or more in a promotion at this point last year. Expected extra units = forecast × (lift − 1),
 *  with the lift capped at 2.5x so one noisy week last year cannot promise the moon. */
export const MAX_PROMO_LIFT = 2.5;
export function promoOffer(it: PromoInput, excessWeeks = 2.5, minLift = 1.3): PromoOffer | null {
  if (it.promo_now) return null;
  const lyLift = it.last_year_promo_lift ?? 0;
  const excess = it.cover_weeks >= excessWeeks;
  const seasonal = lyLift >= minLift;
  if (!excess && !seasonal) return null;
  const lift = seasonal ? Math.min(lyLift, MAX_PROMO_LIFT) : 1.3;
  const extra = Math.round(it.p50_next_week * (lift - 1));
  if (extra < 3) return null;
  const discount = 0.20;
  const margin = round2(extra * (it.price * (1 - discount) - it.cost));
  return { kind: "promo", sku: it.sku, name: it.name, reason: excess ? "excess" : "seasonal", cover_weeks: it.cover_weeks, lift, extra_units: extra, margin,
    formula: `${excess ? `cover ${it.cover_weeks.toFixed(1)} weeks ≥ ${excessWeeks}` : `last year's promo lift ${lyLift.toFixed(2)}x ≥ ${minLift}${lyLift > MAX_PROMO_LIFT ? `, capped at ${MAX_PROMO_LIFT}x` : ""}`}; extra units = forecast ${it.p50_next_week.toFixed(0)} × (${lift.toFixed(2)} − 1) = ${extra}; margin = extra × (price × 0.80 − cost)` };
}

// ── Autonomy ladder ───────────────────────────────────────────────────────────────────────────────

export type WeekEvidence = { week: string; wape: number; bias: number; stockout_rate: number; override_rate?: number };
export type AutonomyLevel = 1 | 2 | 3;
export type Thresholds = { wape: number; bias: number; override: number; stockout: number };
/** Promotion thresholds, calibrated per category class rather than one number for everything. Ambient items
 *  (weekly or two-day ordering) forecast better and stock out less than fresh, so their bars are tighter.
 *  Item-store weekly error below 35% is a realistic ambient target on real grocery data; synthetic demand here has
 *  a noise floor near 30%, so a 25% target is not reachable on this data and the pilot sets the production
 *  value at the week 5 checkpoint. Fresh is capped at L2 in the pilot regardless. */
export const AUTONOMY_RULES = {
  ambient: { wape: 0.35, bias: 0.05, override: 0.05, stockout: 0.10 } as Thresholds,
  fresh: { wape: 0.40, bias: 0.05, override: 0.05, stockout: 0.30 } as Thresholds,
  weeks: 8, demote_weeks: 2,
};
export const LEVEL_LABEL: Record<AutonomyLevel, string> = { 1: "L1 · Planner approves every line", 2: "L2 · Exceptions only", 3: "L3 · Autonomous with veto" };

export function weekFailures(w: WeekEvidence, th: Thresholds): string[] {
  const f: string[] = [];
  if (w.wape > th.wape) f.push(`WAPE ${(w.wape * 100).toFixed(1)}% > ${th.wape * 100}%`);
  if (Math.abs(w.bias) > th.bias) f.push(`bias ${w.bias > 0 ? "+" : ""}${(w.bias * 100).toFixed(1)}% beyond ±${th.bias * 100}%`);
  if ((w.override_rate ?? 0) > th.override) f.push(`overrides ${((w.override_rate ?? 0) * 100).toFixed(0)}% > ${th.override * 100}%`);
  if (w.stockout_rate > th.stockout) f.push(`stockouts ${(w.stockout_rate * 100).toFixed(1)}% > ${th.stockout * 100}%`);
  return f;
}
export const weekPasses = (w: WeekEvidence, th: Thresholds) => weekFailures(w, th).length === 0;

/** Walk the weeks in order. A category starts at L2 (the prototype's exceptions-only mode), earns L3 after
 *  `weeks` consecutive passing weeks, and drops back to L2 after `demote_weeks` consecutive failing weeks.
 *  Fresh categories are capped at L2 in the prototype: daily ordering keeps a person in the loop. */
export function evaluateAutonomy(weeks: WeekEvidence[], fresh: boolean) {
  const th = fresh ? AUTONOMY_RULES.fresh : AUTONOMY_RULES.ambient;
  let level: AutonomyLevel = 2; let passStreak = 0; let failStreak = 0; const history: AutonomyLevel[] = []; let lostAt: string | null = null;
  for (const w of weeks) {
    if (weekPasses(w, th)) { passStreak++; failStreak = 0; } else { failStreak++; passStreak = 0; }
    if (level < 3 && !fresh && passStreak >= AUTONOMY_RULES.weeks) level = 3;
    if (level === 3 && failStreak >= AUTONOMY_RULES.demote_weeks) { level = 2; passStreak = 0; lostAt = w.week; }
    history.push(level);
  }
  const last = weeks.at(-1);
  const failing = last ? weekFailures(last, th) : [];
  const remaining = AUTONOMY_RULES.weeks - passStreak;
  const needs = fresh ? `Fresh categories stay at L2 in the pilot: daily ordering keeps a person in the loop${failing.length ? ` (latest week: ${failing.join(", ")})` : ""}.`
    : level === 3 ? "Holding L3: any threshold broken two weeks running drops it back to L2."
    : remaining === 1 ? `Eligible next week: ${passStreak} passing weeks in a row, one more needed.`
    : `${remaining} more passing weeks in a row (${passStreak} so far)${failing.length ? `; latest week failed on ${failing.join(", ")}` : ""}.`;
  return { level, passStreak, failStreak, history, needs, eligible: !fresh && passStreak >= AUTONOMY_RULES.weeks, lostAt, thresholds: th };
}

export function round2(x: number) { return Math.round(x * 100) / 100; }
