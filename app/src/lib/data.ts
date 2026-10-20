export type Why = { level: number; promo: number; holiday: number; other: number };
export type Forecast = { week: string; p10: number; p50: number; p90: number; baseline: number; promo: number; discount: number; holiday: string; safety: number; raw_order: number; order: number; why: Why; projected_on_hand?: number };
export type ExceptionCode = "stockout" | "low_dos" | "deviation" | "spoilage" | "promo" | "holiday" | "new";
export type Priority = "High" | "Medium" | "Low";
export type Item = {
  sku: string; history: (number | null)[]; price: number; cost: number; on_hand: number; on_order: number; days_of_supply: number; stockout_in_days: number | null;
  spoilage_units: number; exceptions: ExceptionCode[]; priority: Priority; score: number; review_days: number; cover_weeks: number; last_year_promo_lift: number | null;
  accuracy: { wape: number; bias: number } | null;
  fc: [Forecast, Forecast]; holdout: { actual: number[]; model: number[]; baseline: number[] } | null;
};
export type StoreData = { store: string; items: Item[] };
export type Product = {
  sku: string; upc: string; name: string; category: string; department: string; subcategory: string; supplier: string; lead_time_days: number;
  case_pack: number; fresh: boolean; daily_order: boolean; store_brand: boolean; shelf_life_days: number; new: boolean; launch_weeks_ago: number | null; reference_sku: string | null;
};
export type Kpis = { wape: number; bias: number; in_stock: number; spoilage: number };
export type StoreSummary = Kpis & { store: string; name: string; city: string; province: string; region: string; orders_next_week: number; skus: number; needs_review: number; inventory_value: number; open_to_buy: number; orders_cost: number };
export type CategoryResult = { category: string; units: number; wape_baseline: number; wape_selected: number; winner: string } & Record<string, number | string>;
export type Backtest = { model: string; label: string; wape_next_week: number; wape_week_after: number; bias_next_week: number; usd_total: number; usd_lost_margin: number; usd_waste: number; usd_carry: number; usd_saved_vs_baseline: number; pct_cost_cut: number };
export type Scenario = { sales: number; waste: number; stock: number; total: number; cash_release: number; npv_m: number; payback_years: number | null };
export type WeekEvidence = { week: string; wape: number; bias: number; stockout_rate: number };
export type AutonomyEvidence = { weeks: WeekEvidence[]; wape: number; bias: number; fresh: boolean; review_days: number };
export type Meta = {
  generated_note: string; rules: Record<ExceptionCode, string>; review_days: Record<string, number>; autonomy_evidence: Record<string, AutonomyEvidence>; history_weeks: string[]; forecast_weeks: [string, string]; forecast_week_numbers: [number, number]; holdout_weeks: string[];
  stores: StoreSummary[]; products: Product[]; categories: string[]; selected_model: string; selection_rule: string; z_planner: number; service_z_by_category?: Record<string, number>;
  backtest: Backtest[]; backtest_by_category: CategoryResult[]; chain_kpis: Kpis;
  chain_holdout: { weeks: string[]; actual: number[]; model: number[]; baseline: number[] };
  business_case: { assumptions: Record<string, number | number[]>; breakeven_m: number; investment_m: number; run_cost_m: number;
    costs_m: { blueprint: number; pilot: number; rollout: number; run_per_year: number }; cumulative_cash_m: Record<"low" | "base" | "high", number[]>;
    scenarios: Record<"low" | "base" | "high" | "mock_pilot", Scenario>; measured_levers: { sales_uplift: number; waste_cut: number; inv_cut: number } };
  seasonality: Record<string, number>;
};

// Exported JSON is served by /api/data (app/data/, written by pipeline/export.py).
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Data request failed (${response.status})`);
  return response.json() as Promise<T>;
}
let metaPromise: Promise<Meta> | null = null;
export function loadMeta(): Promise<Meta> {
  metaPromise ??= fetchJson<Meta>("/api/data/meta.json").catch((error) => {
    metaPromise = null; // A transient error must not poison every subsequent visit.
    throw error;
  });
  return metaPromise;
}
const storeCache = new Map<string, Promise<StoreData>>();
export function loadStore(id: string): Promise<StoreData> {
  if (!/^S\d{2}$/.test(id)) return Promise.reject(new Error("Invalid store"));
  if (!storeCache.has(id)) storeCache.set(id, fetchJson<StoreData>(`/api/data/store/${id}.json`).catch((error) => {
    storeCache.delete(id);
    throw error;
  }));
  return storeCache.get(id)!;
}

export const fmtWeek = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const money = (x: number) => (Math.abs(x) >= 1e6 ? `$${(x / 1e6).toFixed(2)}M` : Math.abs(x) >= 1e3 ? `$${(x / 1e3).toFixed(0)}K` : `$${x.toFixed(0)}`);
export const mm = (x: number) => `$${x.toFixed(2)}M`;

export const EXCEPTION_LABEL: Record<ExceptionCode, string> = {
  stockout: "Projected stockout", low_dos: "Low days of supply", deviation: "Forecast vs sales deviation", spoilage: "High spoilage risk",
  promo: "Promo week", holiday: "Holiday week", new: "New item",
};
export const addDays = (iso: string, d: number) => { const t = new Date(iso + "T00:00:00"); t.setDate(t.getDate() + Math.floor(d)); return t.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }); };
