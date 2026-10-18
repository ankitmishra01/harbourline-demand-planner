import type { Item, Meta, StoreSummary } from "@/lib/data";

/** Facts for a store brief, computed deterministically from the exported data. The model may rephrase them; it may not add to them. */
export type BriefFacts = {
  store: string; name: string; city: string; province: string; week: number; week_date: string;
  skus: number; needs_review: number; high: number; medium: number;
  stockouts: { name: string; days: number }[]; spoilage: { name: string; units: number }[];
  promo: number; holiday: number; new_items: number;
  wape: number; in_stock: number; spoilage_pct: number; inventory_value: number; orders_cost: number; open_to_buy: number;
  l3: string[]; l2: string[];
};

const money = (x: number) => (Math.abs(x) >= 1000 ? `$${Math.round(x / 1000)}K` : `$${Math.round(x)}`);
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

export function buildBriefFacts(meta: Meta, st: StoreSummary, items: Item[], week: 0 | 1, levels: Record<string, 1 | 2 | 3>): BriefFacts {
  const name = new Map(meta.products.map((p) => [p.sku, p.name]));
  const high = items.filter((i) => i.priority === "High");
  const medium = items.filter((i) => i.priority === "Medium");
  const stockouts = items.filter((i) => i.exceptions.includes("stockout")).sort((a, b) => (a.stockout_in_days ?? 99) - (b.stockout_in_days ?? 99)).slice(0, 3)
    .map((i) => ({ name: name.get(i.sku) ?? i.sku, days: Math.round((i.stockout_in_days ?? 0) * 10) / 10 }));
  const spoilage = items.filter((i) => i.exceptions.includes("spoilage")).sort((a, b) => b.spoilage_units - a.spoilage_units).slice(0, 3)
    .map((i) => ({ name: name.get(i.sku) ?? i.sku, units: i.spoilage_units }));
  const cats = Object.entries(levels);
  return {
    store: st.store, name: st.name, city: st.city, province: st.province, week: meta.forecast_week_numbers[week], week_date: meta.forecast_weeks[week],
    skus: items.length, needs_review: items.filter((i) => i.exceptions.length > 0).length, high: high.length, medium: medium.length,
    stockouts, spoilage,
    promo: items.filter((i) => i.exceptions.includes("promo")).length, holiday: items.filter((i) => i.exceptions.includes("holiday")).length, new_items: items.filter((i) => i.exceptions.includes("new")).length,
    wape: st.wape, in_stock: st.in_stock, spoilage_pct: st.spoilage, inventory_value: st.inventory_value, orders_cost: st.orders_cost, open_to_buy: st.open_to_buy,
    l3: cats.filter(([, l]) => l === 3).map(([c]) => c).sort(), l2: cats.filter(([, l]) => l === 2).map(([c]) => c).sort(),
  };
}

/** The brief without a model: the same facts in plain sentences. Used when no model is configured or the call fails. */
export function deterministicBrief(f: BriefFacts): string {
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const s: string[] = [];
  s.push(`${f.name} (${f.store}, ${f.city}) has ${f.needs_review} of ${f.skus} items waiting for a decision for week ${f.week}: ${f.high} high priority and ${f.medium} medium.`);
  if (f.stockouts.length) s.push(`Stock runs out first on ${list(f.stockouts.map((x) => `${x.name} (${x.days} ${x.days === 1 ? "day" : "days"})`))}.`);
  if (f.spoilage.length) s.push(`Spoilage risk sits with ${list(f.spoilage.map((x) => `${x.name} (${x.units} units)`))}.`);
  const flags: string[] = [];
  if (f.promo) flags.push(`${f.promo} on promotion`); if (f.holiday) flags.push(`${f.holiday} in a holiday week`); if (f.new_items) flags.push(`${f.new_items} new`);
  if (flags.length) s.push(`Also flagged: ${list(flags)}.`);
  s.push(`Forecast error over the last 12 weeks is ${pct(f.wape)} with ${pct(f.in_stock)} in stock and spoilage at ${pct(f.spoilage_pct)} of sales; ${money(f.inventory_value)} of stock is on hand and this week's orders cost ${money(f.orders_cost)} against ${money(f.open_to_buy)} open to buy.`);
  s.push(f.l3.length ? `${list(f.l3)} ${f.l3.length === 1 ? "orders" : "order"} autonomously with a veto; ${list(f.l2)} stay at exceptions only.` : `Every category is at exceptions only this week.`);
  return s.join(" ");
}

/** Labelled, pre-formatted fact lines for the model, so percentages and category levels cannot be misread. */
export function factLines(f: BriefFacts): string[] {
  const list = (xs: string[]) => (xs.length ? xs.join("; ") : "none");
  return [
    `Store: ${f.name} (${f.store}), ${f.city}, ${f.province}`,
    `Order week: week ${f.week}, starting ${f.week_date}`,
    `Items needing a planner's decision: ${f.needs_review} of ${f.skus} (${f.high} high priority, ${f.medium} medium priority)`,
    `Stock runs out first (item, days of supply): ${list(f.stockouts.map((x) => `${x.name}, ${x.days} days`))}`,
    `Spoilage risk (item, units at risk): ${list(f.spoilage.map((x) => `${x.name}, ${x.units} units`))}`,
    `Items on promotion this week: ${f.promo}; items in a holiday week: ${f.holiday}; new items: ${f.new_items}`,
    `Forecast error over the last 12 weeks (WAPE): ${pct(f.wape)}`,
    `In stock: ${pct(f.in_stock)}; spoilage at cost: ${pct(f.spoilage_pct)} of sales`,
    `Stock on hand at cost: ${money(f.inventory_value)}; this week's orders cost ${money(f.orders_cost)} against ${money(f.open_to_buy)} open to buy`,
    `Categories ordering autonomously with a planner veto (level L3): ${list(f.l3)}`,
    `Categories at exceptions-only review (level L2, the planner decides the flagged lines): ${list(f.l2)}`,
  ];
}

export const BRIEF_SYSTEM = "You write a morning brief for a grocery store planner. You receive labelled facts about one store for one order week, and a draft that is already correct. Rewrite the draft so a planner reads it quickly: 110 to 150 words, plain English, second person, at most four short paragraphs. Keep every number, percentage, product name and category exactly as written in the facts; percentages are already formatted, so copy them as they appear. Do not add numbers, causes, recommendations or categories that are not in the facts. Keep the distinction between categories that order autonomously (L3) and categories at exceptions-only review (L2). Order: what needs a decision first (stockouts, then spoilage), then the flags, then one sentence on the forecast, then one sentence on category autonomy. No headings, no bullet points, no dashes, no exclamation marks.";
