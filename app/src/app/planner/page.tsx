"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import Journey from "@/components/Journey";
import LineChart from "@/components/LineChart";
import SendOrders from "@/components/SendOrders";
import SentOrders from "@/components/SentOrders";
import Offers, { describe, OfferActions, OfferStats, type Offer, type OfferDecision } from "@/components/Offers";
import { AutonomyChip, AutonomyPanel, type Levels } from "@/components/Autonomy";
import { addDays, EXCEPTION_LABEL, fmtWeek, loadMeta, loadStore, money, pct, type ExceptionCode, type Item, type Meta, type Product, type StoreData } from "@/lib/data";
import { buildPurchaseOrders, evaluateAutonomy, LEVEL_LABEL, markdownOffer, openToBuyCheck, promoOffer, type PurchaseOrder } from "@/lib/logic";

const REASONS = ["Promo", "Local event", "Weather", "Display", "Count wrong", "Other"];
type Decision = { final: number; status: "Approved" | "Overridden"; reason?: string; comment?: string };
type LogEntry = { ts: string; store: string; sku: string; week: number; text: string };
type Status = "Needs review" | "Auto-approved" | "Approved" | "Overridden";

const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable: keep in memory only */ } },
};
const key = (st: string, sku: string, w: number) => `${st}|${sku}|${w}`;
const RANK = { High: 0, Medium: 1, Low: 2 };
const r0 = (x: number) => Math.round(x).toLocaleString();

export default function Planner() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [storeId, setStoreId] = useState("S09");
  const [data, setData] = useState<StoreData | null>(null);
  const [week, setWeek] = useState(0);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState(""); const [cat, setCat] = useState(""); const [sub, setSub] = useState("");
  const [statusF, setStatusF] = useState(""); const [exF, setExF] = useState(""); const [supplier, setSupplier] = useState("");
  const [freshOnly, setFreshOnly] = useState(false); const [promoOnly, setPromoOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [user, setUser] = useState("planner");
  const [sent, setSent] = useState<PurchaseOrder[]>([]);
  const [offerDecisions, setOfferDecisions] = useState<Record<string, OfferDecision>>({});
  const [sheet, setSheet] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    loadMeta().then(setMeta);
    setDecisions(store.get("decisions", {})); setLog(store.get("changelog", [])); setSent(store.get("sentorders", [])); setOfferDecisions(store.get("offers", {}));
    try { const u = localStorage.getItem("planner"); if (u) setUser(u.split("@")[0]); } catch { /* ignore */ }
  }, []);
  useEffect(() => { setData(null); loadStore(storeId).then(setData); }, [storeId]);
  // Simulated supplier replies move sent orders along; tick while any order is still in flight.
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const prod = useMemo(() => new Map((meta?.products ?? []).map((p) => [p.sku, p])), [meta]);
  const addLog = useCallback((sku: string, w: number, text: string) => {
    setLog((l) => { const n = [{ ts: new Date().toISOString(), store: storeId, sku, week: w, text }, ...l].slice(0, 300); store.set("changelog", n); return n; });
  }, [storeId]);
  const decide = useCallback((sku: string, w: number, d: Decision | null) => {
    setDecisions((all) => { const n = { ...all }; if (d) n[key(storeId, sku, w)] = d; else delete n[key(storeId, sku, w)]; store.set("decisions", n); return n; });
  }, [storeId]);

  const statusOf = useCallback((it: Item, w: number): Status => {
    const d = decisions[key(storeId, it.sku, w)];
    return d ? d.status : it.exceptions.length ? "Needs review" : "Auto-approved";
  }, [decisions, storeId]);
  const finalOf = useCallback((it: Item, w: number) => { const k = key(storeId, it.sku, w); return drafts[k] ?? decisions[k]?.final ?? it.fc[w].order; }, [drafts, decisions, storeId]);

  // Default order: what needs a decision first, then priority, then the shortest days of supply.
  const rows = useMemo(() => {
    if (!data || !meta) return [];
    const needle = q.trim().toLowerCase();
    return data.items.map((it) => ({ it, p: prod.get(it.sku)! })).filter(({ it, p }) =>
      (!needle || p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle) || p.upc.includes(needle)) &&
      (!dept || p.department === dept) && (!cat || p.category === cat) && (!sub || p.subcategory === sub) &&
      (!supplier || p.supplier === supplier) && (!freshOnly || p.fresh) && (!promoOnly || it.fc.some((f) => f.promo)) &&
      (!exF || it.exceptions.includes(exF as ExceptionCode)) && (!statusF || statusOf(it, week) === statusF),
    ).sort((a, b) => Number(statusOf(b.it, week) === "Needs review") - Number(statusOf(a.it, week) === "Needs review") ||
      RANK[a.it.priority] - RANK[b.it.priority] || a.it.days_of_supply - b.it.days_of_supply);
  }, [data, meta, prod, q, dept, cat, sub, supplier, freshOnly, promoOnly, exF, statusF, statusOf, week]);

  // Autonomy level per category from the backtest evidence, with this browser's override rate for the latest week.
  const levels = useMemo<Levels>(() => {
    if (!meta) return {};
    const out: Levels = {};
    for (const [c, e] of Object.entries(meta.autonomy_evidence)) {
      const items = (data?.items ?? []).filter((it) => prod.get(it.sku)?.category === c);
      const overrides = items.filter((it) => decisions[key(storeId, it.sku, 0)]?.status === "Overridden").length;
      const weeks = e.weeks.map((w, i) => i === e.weeks.length - 1 && items.length ? { ...w, override_rate: overrides / items.length } : w);
      out[c] = evaluateAutonomy(weeks, e.fresh);
    }
    return out;
  }, [meta, data, prod, decisions, storeId]);

  // Suggested offers: markdowns on fresh stock that will outlast its shelf life, and flyer candidates.
  const offers = useMemo<Offer[]>(() => {
    if (!data || !meta) return [];
    const out: Offer[] = [];
    for (const it of data.items) {
      const p = prod.get(it.sku)!; const f = it.fc[0]; const level = levels[p.category]?.level ?? 2;
      const md = markdownOffer({ sku: it.sku, name: p.name, fresh: p.fresh, shelf_life_days: p.shelf_life_days, on_hand: it.on_hand, p50_next_week: f.p50, price: it.price, cost: it.cost });
      const pr = promoOffer({ sku: it.sku, name: p.name, cover_weeks: it.cover_weeks, p50_next_week: f.p50, last_year_promo_lift: it.last_year_promo_lift, price: it.price, cost: it.cost, promo_now: !!f.promo });
      if (md) out.push({ ...md, level }); if (pr) out.push({ ...pr, level });
    }
    return out.sort((a, b) => (b.kind === "markdown" ? b.write_off_avoided : b.margin) - (a.kind === "markdown" ? a.write_off_avoided : a.margin));
  }, [data, meta, prod, levels]);
  const offerKey = useCallback((o: Offer) => `${storeId}|${o.sku}|${o.kind}|${meta?.forecast_weeks[0] ?? ""}`, [storeId, meta]);
  const decideOffer = (o: Offer, status: OfferDecision["status"], reason?: string) => {
    const d = { status, reason, ts: new Date().toISOString() };
    setOfferDecisions((all) => { const n = { ...all, [offerKey(o)]: d }; store.set("offers", n); return n; });
    addLog(o.sku, 0, `${o.kind === "markdown" ? "Markdown" : "Flyer candidate"} ${status.toLowerCase()} by ${user}${reason ? `, reason ${reason}` : ""}: ${describe(o)}`);
  };

  if (!meta) return <Shell><p className="muted">Loading…</p></Shell>;
  const st = meta.stores.find((s) => s.store === storeId)!;
  const wn = meta.forecast_week_numbers;
  const products = meta.products;
  const depts = [...new Set(products.map((p) => p.department))].sort();
  const cats = [...new Set(products.filter((p) => !dept || p.department === dept).map((p) => p.category))].sort();
  const subs = [...new Set(products.filter((p) => (!dept || p.department === dept) && (!cat || p.category === cat)).map((p) => p.subcategory))].sort();
  const suppliers = [...new Set(products.map((p) => p.supplier))].sort();
  const needsReview = data ? data.items.filter((it) => statusOf(it, week) === "Needs review").length : 0;
  const openItem = data?.items.find((i) => i.sku === open) ?? null;
  const sentHere = sent.filter((po) => po.po.includes(`-${storeId}-`));

  // Purchase orders from the final quantities, and the cash check against the store's open-to-buy.
  const pos = data ? buildPurchaseOrders(data.items.map((it) => { const p = prod.get(it.sku)!; const fin = finalOf(it, week); return {
    sku: it.sku, name: p.name, supplier: p.supplier, lead_time_days: p.lead_time_days, case_pack: p.case_pack, final_units: fin, cost: it.cost, changed: fin !== it.fc[week].order }; }),
    storeId, new Date(now), sentHere.length + 1, week) : [];
  const otb = openToBuyCheck(pos.reduce((s, p) => s + p.total_cost, 0), st.open_to_buy);
  const alreadySent = sentHere.some((po) => po.week === week);
  const sendOrders = () => {
    const n = [...pos, ...sent]; setSent(n); store.set("sentorders", n); setSheet(false);
    for (const po of pos) addLog(po.po, week, `Sent by ${user} to ${po.supplier}: ${po.lines.length} lines, ${po.cases} cases, ${money(po.total_cost)}, expected ${po.expected_delivery}${po.changed_lines ? `, ${po.changed_lines} lines changed` : ""}`);
  };

  const setFinal = (it: Item, p: Product, value: number) => {
    const sug = it.fc[week].order;
    const k = key(storeId, it.sku, week);
    if (value === sug) { setDrafts((d) => { const n = { ...d }; delete n[k]; return n; }); return; }
    setDrafts((d) => ({ ...d, [k]: value }));
    const prev = decisions[k];
    if (prev?.status === "Overridden" && prev.reason) { decide(it.sku, week, { ...prev, final: value }); addLog(it.sku, week, `Overridden by ${user}: final ${value} (was suggested ${sug}), reason ${prev.reason}`); }
    void p;
  };
  const setReason = (it: Item, reason: string, comment?: string) => {
    const k = key(storeId, it.sku, week);
    const final = drafts[k] ?? decisions[k]?.final ?? it.fc[week].order;
    if (!reason) return;
    decide(it.sku, week, { final, status: "Overridden", reason, comment });
    addLog(it.sku, week, `Overridden by ${user}: final ${final} (suggested ${it.fc[week].order}), reason ${reason}${comment ? `, "${comment}"` : ""}`);
  };
  const accept = (it: Item) => {
    const k = key(storeId, it.sku, week);
    setDrafts((d) => { const n = { ...d }; delete n[k]; return n; });
    decide(it.sku, week, { final: it.fc[week].order, status: "Approved" });
    addLog(it.sku, week, `Approved by ${user}: suggested order ${it.fc[week].order}`);
  };
  const undo = (it: Item) => {
    const k = key(storeId, it.sku, week);
    setDrafts((d) => { const n = { ...d }; delete n[k]; return n; });
    decide(it.sku, week, null); addLog(it.sku, week, `Decision cleared by ${user}`);
  };
  const acceptRemaining = () => {
    if (!data) return;
    const items = data.items.filter((it) => statusOf(it, week) === "Needs review");
    const n = { ...decisions };
    for (const it of items) n[key(storeId, it.sku, week)] = { final: it.fc[week].order, status: "Approved" };
    setDecisions(n); store.set("decisions", n);
    addLog("ALL", week, `Accepted ${items.length} remaining suggestions by ${user} (bulk accept before sending)`);
  };
  const clearSent = () => { const n = sent.filter((po) => !po.po.includes(`-${storeId}-`)); setSent(n); store.set("sentorders", n); };
  const clearAll = () => {
    setLog([]); setDecisions({}); setDrafts({}); setSent([]); setOfferDecisions({});
    store.set("changelog", []); store.set("decisions", {}); store.set("sentorders", []); store.set("offers", {});
  };

  return (
    <Shell>
      <Journey here="pilot" />
      <h1>Store order review</h1>
      <p className="takeaway">Show only what needs a decision, with the reason why: {needsReview} of {st.skus} items at this store need a planner this week; the rest are ordered automatically.</p>
      <p className="lede">Every product in the store by name and code, with the forecast for Wk {wn[0]} ({fmtWeek(meta.forecast_weeks[0])}) and Wk {wn[1]} ({fmtWeek(meta.forecast_weeks[1])}) and how much to order. Items that pass every rule are auto-approved; the planner reviews the rest. Once the review is done, the orders go out as one purchase order per supplier.</p>

      <div className="toolbar">
        <select value={storeId} onChange={(e) => { setStoreId(e.target.value); setOpen(null); }} aria-label="Store">
          {meta.stores.map((s) => <option key={s.store} value={s.store}>Store {s.store} – {s.name}, {s.province}</option>)}
        </select>
        <div className="seg" role="group" aria-label="Order week">
          {[0, 1].map((w) => <button key={w} className={week === w ? "on" : ""} onClick={() => setWeek(w)}>Order for Wk {wn[w]}</button>)}
        </div>
        <input type="search" placeholder="Search item or SKU / UPC" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search item or SKU / UPC" />
        <AutonomyChip levels={levels} open={autoOpen} onToggle={() => setAutoOpen((o) => !o)} />
      </div>

      {autoOpen && <AutonomyPanel levels={levels} evidence={meta.autonomy_evidence} weeks={meta.holdout_weeks} />}

      <div className="kpis">
        <div className="kpi" title="WAPE: total forecast error divided by total units sold"><div className="v">{pct(st.wape)}</div><div className="l">forecast error (WAPE), last 12 weeks</div></div>
        <div className="kpi"><div className="v">{st.bias > 0 ? "+" : ""}{pct(st.bias)}</div><div className="l">bias (+ means over-forecast)</div></div>
        <div className="kpi"><div className="v">{pct(st.in_stock)}</div><div className="l">in-stock (service level), backtest</div></div>
        <div className="kpi"><div className="v">{pct(st.spoilage, 2)}</div><div className="l">spoilage at cost, % of sales (simulated)</div></div>
        <div className="kpi"><div className="v">{money(st.inventory_value)}</div><div className="l">inventory value on hand, at cost</div></div>
        <div className="kpi y"><div className="v">{needsReview}</div><div className="l">of {st.skus} items need review for Wk {wn[week]}</div></div>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: "-8px 0 12px" }}>In plain terms: <strong>WAPE</strong> is total forecast error divided by total units sold (lower is better); <strong>bias</strong> is whether the forecast runs high (+) or low (−) overall; <strong>P10–P90</strong> is the range actual sales should land in eight weeks out of ten; <strong>days of supply</strong> is how long today&apos;s stock lasts at the forecast rate; <strong>open-to-buy</strong> is the cash allowed for this week&apos;s orders.</p>

      <div className="filters">
        <select value={dept} onChange={(e) => { setDept(e.target.value); setCat(""); setSub(""); }} aria-label="Department"><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setSub(""); }} aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Subcategory"><option value="">All subcategories</option>{subs.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label="Status"><option value="">Any status</option>{["Needs review", "Auto-approved", "Approved", "Overridden"].map((s) => <option key={s}>{s}</option>)}</select>
        <select value={exF} onChange={(e) => setExF(e.target.value)} aria-label="Exception type"><option value="">Any exception</option>{Object.entries(EXCEPTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Supplier or DC"><option value="">Any supplier / DC</option>{suppliers.map((s) => <option key={s}>{s}</option>)}</select>
        <label><input type="checkbox" checked={freshOnly} onChange={(e) => setFreshOnly(e.target.checked)} /> Fresh only</label>
        <label><input type="checkbox" checked={promoOnly} onChange={(e) => setPromoOnly(e.target.checked)} /> Promo</label>
        <span className="muted">{rows.length} items</span>
      </div>

      <div className="table-wrap" style={{ maxHeight: 620 }}>
        {!data ? <p className="muted" style={{ padding: 12 }}>Loading store…</p> : (
          <table className="orders">
            <thead><tr>
              <th>Priority</th><th>SKU</th><th>Item description</th><th className="num hide-md">Case pack</th><th className="num">On hand</th><th className="num hide-md">On order</th>
              <th className="num">Forecast Wk {wn[0]}</th><th className="num">Forecast Wk {wn[1]}</th><th className="num hide-md">Range P10–P90</th><th className="num hide-md">Safety stock</th>
              <th className="num">Days of supply</th><th className="num">Suggested order</th><th className="num">Final order</th><th>Override reason</th><th>Exceptions</th><th>Status</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={16} className="muted" style={{ padding: 16 }}>No items match these filters. {statusF === "Needs review" ? "Every exception for this week has been decided." : "Clear a filter to see more."}</td></tr>}
              {rows.map(({ it, p }) => {
                const f = it.fc[week];
                const k = key(storeId, it.sku, week);
                const d = decisions[k];
                const final = drafts[k] ?? d?.final ?? f.order;
                const changed = final !== f.order;
                const status = statusOf(it, week);
                return (
                  <tr key={it.sku} className={`row ${open === it.sku ? "sel" : ""}`} onClick={() => setOpen(it.sku)}>
                    <td><span className={`pri ${it.priority}`}>{it.priority}</span></td>
                    <td className="sku">{p.sku}</td>
                    <td className="desc">{p.name}{p.store_brand && <span className="tag sb" style={{ marginLeft: 6 }}>Store brand</span>}<div className="muted" style={{ fontSize: 11 }}>{p.category} › {p.subcategory}</div></td>
                    <td className="num hide-md">{p.case_pack}</td><td className="num">{it.on_hand}</td><td className="num hide-md">{it.on_order}</td>
                    <td className="num">{r0(it.fc[0].p50)}</td><td className="num">{r0(it.fc[1].p50)}</td>
                    <td className="num range hide-md">{r0(f.p10)}–{r0(f.p90)}</td><td className="num hide-md">{r0(f.safety)}</td>
                    <td className="num">{it.days_of_supply.toFixed(1)}</td>
                    <td className="num"><span className="order">{f.order / p.case_pack} cs</span> <span className="muted">{f.order} units</span></td>
                    <td className="num" onClick={(e) => e.stopPropagation()}>
                      <input className={`final ${changed ? "changed" : ""}`} type="number" min={0} step={p.case_pack} value={final} aria-label={`Final order for ${p.name}`}
                        onChange={(e) => setFinal(it, p, Math.max(0, Number(e.target.value) || 0))} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {changed ? (
                        <select value={d?.status === "Overridden" ? d.reason : ""} onChange={(e) => setReason(it, e.target.value, d?.comment)} aria-label="Override reason">
                          <option value="">Reason needed…</option>{REASONS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>{it.exceptions.length ? it.exceptions.map((e) => <span key={e} className={`tag ex ${e}`}>{EXCEPTION_LABEL[e]}</span>) : <span className="muted">None</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {status === "Needs review" ? <><span className="status review">Needs review</span> <button className="sm" onClick={() => accept(it)}>Accept</button></>
                        : status === "Auto-approved" ? <span className="status auto">Auto-approved (System)</span>
                        : status === "Approved" ? <span className="status ok">Approved</span> : <span className="status over">Overridden</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Suggested order = forecast + safety stock − on hand − on order, rounded up to whole cases. Safety stock covers forecast uncertainty at about a {meta.z_planner === 1.28 ? "90%" : ""} service level over the category&apos;s review period. Priority: High when stock runs out before the next delivery or fresh stock will spoil; Medium for any other exception; Low otherwise. Changing a final order asks for a reason; decisions, sent orders and the change log are kept in this browser only. In the pilot, shadow mode records these decisions next to today&apos;s orders without changing them.</p>

      <div className="card t-blue">
        <h2>Send orders · Wk {wn[week]}</h2>
        <div className="kpi-mini" style={{ margin: "0 0 10px", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
          <span><span className="k">Purchase orders</span><span className="v">{pos.length}</span></span>
          <span><span className="k">Lines</span><span className="v">{pos.reduce((s, p) => s + p.lines.length, 0)}</span></span>
          <span><span className="k">Cases</span><span className="v">{pos.reduce((s, p) => s + p.cases, 0).toLocaleString()} cs</span></span>
          <span><span className="k">Value at cost</span><span className="v">{money(otb.ordersCost)}</span></span>
          <span><span className="k">Open-to-buy used</span><span className={`v ${otb.ok ? "" : "bad"}`}>{pct(otb.share, 0)} of {money(otb.openToBuy)}</span></span>
          <span><span className="k">Still need review</span><span className={`v ${needsReview ? "bad" : "good"}`}>{needsReview}</span></span>
        </div>
        <div className="sendbar">
          <button disabled={!data} onClick={() => setSheet(true)}>Review and send</button>
          {needsReview > 0 && <button className="ghost" onClick={acceptRemaining}>Accept the {needsReview} remaining at the suggested quantity</button>}
          {alreadySent && <span className="muted" style={{ fontSize: 12 }}>Already sent once for this week; sending again creates new purchase orders.</span>}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Change log</h2>
          {log.filter((l) => l.store === storeId).length === 0 ? <p className="note" style={{ margin: 0 }}>No planner changes yet for this store. Items without exceptions are approved by the System automatically.</p> : (
            <ul className="log clean">{log.filter((l) => l.store === storeId).slice(0, 25).map((l, i) => (
              <li key={i}><span className="muted">{new Date(l.ts).toLocaleString("en-CA", { dateStyle: "short", timeStyle: "short" })} · Wk {wn[l.week]} · <span className="sku">{l.sku}</span></span> {prod.get(l.sku)?.name ?? ""}{prod.has(l.sku) ? ": " : " "}{l.text}</li>))}</ul>
          )}
          {(log.length > 0 || sent.length > 0) && <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button className="ghost sm" onClick={clearAll}>Clear demo changes</button>
            {sentHere.length > 0 && <button className="ghost sm" onClick={clearSent}>Clear sent orders</button>}
          </div>}
        </div>
        <SentOrders pos={sentHere} now={now} weekNumbers={wn} />
      </div>

      <Offers offers={offers} decisions={offerDecisions} keyOf={offerKey} onDecide={decideOffer} />

      {sheet && data && <SendOrders pos={pos} otb={otb} storeId={st.store} weekNumber={wn[week]} unreviewed={needsReview} onClose={() => setSheet(false)} onSend={sendOrders} />}

      {openItem && <Drawer it={openItem} p={prod.get(openItem.sku)!} meta={meta} week={week} status={statusOf(openItem, week)} level={levels[prod.get(openItem.sku)!.category]?.level ?? 2}
        offers={offers.filter((o) => o.sku === openItem.sku)} offerDecisions={offerDecisions} offerKey={offerKey} onOffer={decideOffer}
        decision={decisions[key(storeId, openItem.sku, week)]} refName={openItem && prod.get(prod.get(openItem.sku)!.reference_sku ?? "")?.name}
        log={log.filter((l) => l.store === storeId && l.sku === openItem.sku)} onClose={() => setOpen(null)}
        onAccept={() => accept(openItem)} onUndo={() => undo(openItem)}
        onOverride={(final, reason, comment) => { setDrafts((d) => ({ ...d, [key(storeId, openItem.sku, week)]: final })); decide(openItem.sku, week, { final, status: "Overridden", reason, comment }); addLog(openItem.sku, week, `Overridden by ${user}: final ${final} (suggested ${openItem.fc[week].order}), reason ${reason}${comment ? `, "${comment}"` : ""}`); }} />}
    </Shell>
  );
}

function Drawer({ it, p, meta, week, status, level, offers, offerDecisions, offerKey, onOffer, decision, refName, log, onClose, onAccept, onUndo, onOverride }: {
  it: Item; p: Product; meta: Meta; week: number; status: Status; level: 1 | 2 | 3; offers: Offer[]; offerDecisions: Record<string, OfferDecision>; offerKey: (o: Offer) => string;
  onOffer: (o: Offer, status: OfferDecision["status"], reason?: string) => void; decision?: Decision; refName?: string; log: LogEntry[];
  onClose: () => void; onAccept: () => void; onUndo: () => void; onOverride: (final: number, reason: string, comment: string) => void;
}) {
  const wn = meta.forecast_week_numbers;
  const f = it.fc[week];
  const [final, setFinal] = useState(decision?.final ?? f.order);
  const [reason, setReason] = useState(decision?.reason ?? "");
  const [comment, setComment] = useState(decision?.comment ?? "");
  useEffect(() => { setFinal(decision?.final ?? f.order); setReason(decision?.reason ?? ""); setComment(decision?.comment ?? ""); }, [it.sku, week, decision, f.order]);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);

  // Chart: last 13 weeks of sales, then the two forecast weeks with the P10–P90 band and last year's line.
  const H = meta.history_weeks.length, N = 13;
  const labels = [...meta.history_weeks.slice(-N), ...meta.forecast_weeks].map(fmtWeek);
  const actual = [...it.history.slice(-N), null, null];
  const lastYear = Array.from({ length: N + 2 }, (_, i) => it.history[H - N + i - 52] ?? null);
  const fcLine = [...Array(N - 1).fill(null), it.history[H - 1], it.fc[0].p50, it.fc[1].p50];
  const lo = [...Array(N).fill(null), it.fc[0].p10, it.fc[1].p10], hi = [...Array(N).fill(null), it.fc[0].p90, it.fc[1].p90];
  lo[N - 1] = hi[N - 1] = it.history[H - 1];

  const w = f.why;
  const parts: [string, number, string][] = [["Baseline level", w.level, "#57ABD9"], ["Promo lift", w.promo, "#FF713A"], ["Holiday", w.holiday, "#6E6ED0"], ["Season, weather and trend", w.other, "#7ACCBA"]];
  const span = Math.max(f.p50, w.level, ...parts.reduce<number[]>((acc, [, v]) => [...acc, (acc.at(-1) ?? 0) + v], [])) * 1.05 || 1;
  let run = 0;
  const daily = it.fc[0].p50 / 7;

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`${p.name} details`}>
        <button className="close sm" onClick={onClose} aria-label="Close">Close ✕</button>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>{p.name}</h2>
        <div className="sku">{p.sku} · UPC {p.upc}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{p.department} › {p.category} › {p.subcategory} · {p.supplier} · case of {p.case_pack} · ${it.price?.toFixed(2)} (cost ${it.cost?.toFixed(2)})</div>
        <div style={{ marginTop: 8 }}>
          <span className={`pri ${it.priority}`}>{it.priority}</span>{" "}
          {it.exceptions.map((e) => <span key={e} className={`tag ex ${e}`}>{EXCEPTION_LABEL[e]}</span>)}
          {p.store_brand && <span className="tag sb">Store brand</span>}
          {p.new && <span className="tag new">Forecast from reference item: {refName ?? "category history"}</span>}
          <span className={`lvl L${level}`} title={LEVEL_LABEL[level]}>{p.category}: {LEVEL_LABEL[level]}</span>
        </div>
        {p.new && <p className="callout" style={{ fontSize: 12 }}>Launched {p.launch_weeks_ago} weeks ago, so there is little history. The forecast borrows the pattern of similar products in {p.category} (closest reference item: {refName}) and adjusts as this item&apos;s own sales arrive.</p>}

        <section>
          <h3>Forecast vs actual</h3>
          <LineChart ariaLabel={`Weekly units for ${p.name}: last 13 weeks and the next two weeks`} labels={labels} height={200} marker={N - 1}
            series={[{ name: "Units sold", values: actual, color: "#141B23" }, { name: "Forecast (P50)", values: fcLine, color: "#2B7BB9", width: 2.5 }, { name: "Same week last year", values: lastYear, color: "#FF713A", dashed: true, width: 1.5 }]}
            band={{ lo, hi, color: "#57ABD9" }} />
          <p className="chart-note">Units per week. Shaded band: P10–P90 range for the two forecast weeks. Source: synthetic sales history to {fmtWeek(meta.history_weeks[meta.history_weeks.length - 1])}, 2026.</p>
        </section>

        <section>
          <h3>Why this forecast · Wk {wn[week]}</h3>
          <div className="wf">
            {parts.map(([name, v, color]) => {
              const start = v >= 0 ? run : run + v; run += v;
              return (<div key={name} style={{ display: "contents" }}>
                <span>{name}</span>
                <div className="track"><div className="seg-bar" style={{ left: `${(Math.max(0, start) / span) * 100}%`, width: `${(Math.abs(v) / span) * 100}%`, background: color }} /></div>
                <span className="num" style={{ textAlign: "right" }}>{v >= 0 && name !== "Baseline level" ? "+" : ""}{r0(v)}</span>
              </div>);
            })}
            <strong>Forecast (P50)</strong>
            <div className="track"><div className="seg-bar" style={{ left: 0, width: `${(f.p50 / span) * 100}%`, background: "#141B23" }} /></div>
            <strong style={{ textAlign: "right" }}>{r0(f.p50)}</strong>
          </div>
          <div className="chips">
            {f.promo ? <span>Flyer promotion, {Math.round(f.discount * 100)}% off</span> : <span>No promotion</span>}
            <span>{f.holiday ? `${f.holiday} week` : "No statutory holiday"}</span>
            <span>Range {r0(f.p10)} to {r0(f.p90)}</span>
          </div>
          <p className="muted" style={{ fontSize: 11, margin: 0 }}>An approximate breakdown, measured from this item&apos;s history: the baseline level is its average in the last 13 weeks without a promotion or holiday; promo and holiday lifts are category averages. The model itself is not additive, so the remainder carries season, weather and trend. The four parts add up to the forecast.</p>
        </section>

        <section>
          <h3>Order calculation</h3>
          {[0, 1].map((wi) => { const fx = it.fc[wi]; const oh = wi === 0 ? it.on_hand : fx.projected_on_hand ?? 0; const oo = wi === 0 ? it.on_order : 0; return (
            <div key={wi} className="calc" style={{ marginBottom: 10, opacity: wi === week ? 1 : 0.65 }}>
              <strong style={{ gridColumn: "1 / -1" }}>Wk {wn[wi]} · {fmtWeek(fx.week)}</strong>
              <span>Forecast (P50)</span><span className="num">{r0(fx.p50)}</span>
              <span>+ Safety stock (1.28 × σ × √({it.review_days}/7))</span><span className="num">{r0(fx.safety)}</span>
              <span>− On hand{wi === 1 ? " (projected)" : ""}</span><span className="num">{r0(oh)}</span>
              <span>− On order</span><span className="num">{r0(oo)}</span>
              <span>= Units needed</span><span className="num">{fx.raw_order}</span>
              <span className="tot">Rounded up to case pack of {p.case_pack}</span><span className="num tot"><span className="order">{fx.order / p.case_pack} cs · {fx.order}</span></span>
            </div>); })}
          <p className="muted" style={{ fontSize: 11, margin: 0 }}>For Wk {wn[1]}, on hand is projected: today&apos;s stock and orders, plus the Wk {wn[0]} order, less the Wk {wn[0]} forecast and any spoilage. The review period is {it.review_days} day{it.review_days > 1 ? "s" : ""} for {p.category}, so safety stock covers only that exposure.</p>
        </section>

        <section>
          <h3>Inventory position</h3>
          <div className="calc">
            <span>On hand · on order</span><span className="num">{it.on_hand} · {it.on_order}</span>
            <span>Days of supply = stock ÷ (forecast ÷ 7)</span><span className="num">{it.days_of_supply.toFixed(1)} days ({daily.toFixed(1)}/day)</span>
            <span>Lead time from {p.supplier}</span><span className="num">{p.lead_time_days} day{p.lead_time_days > 1 ? "s" : ""}</span>
            <span>Projected stockout without new stock</span><span className="num">{it.stockout_in_days != null ? addDays(meta.forecast_weeks[0], it.stockout_in_days) : "Not within a week"}</span>
            <span>Cover after this order</span><span className="num">{it.cover_weeks.toFixed(1)} weeks</span>
          </div>
          <p className="muted" style={{ fontSize: 11, margin: "6px 0 0" }}>Stock on order counts toward days of supply only when it lands before the shelf runs empty.</p>
        </section>

        {p.fresh && <section>
          <h3>Fresh</h3>
          <div className="calc">
            <span>Shelf life</span><span className="num">{p.shelf_life_days} days</span>
            <span>Projected spoilage if the suggestion is ordered</span><span className="num">{it.spoilage_units} units</span>
          </div>
          {p.daily_order && <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>{p.category} is ordered daily in store; the weekly quantity is split across deliveries.</p>}
        </section>}

        {offers.length > 0 && <section>
          <h3>Suggested offer{offers.length > 1 ? "s" : ""}</h3>
          {offers.map((o) => (
            <div key={o.kind} className="po" style={{ marginBottom: 8 }}>
              <div className="po-head"><strong>{o.kind === "markdown" ? "Markdown to avoid waste" : "Flyer candidate"}</strong>{o.level === 3 && <span className="lvl L3">Proposed by the agent · veto window</span>}</div>
              <OfferStats o={o} />
              <p className="note" style={{ margin: "6px 0 8px" }}>{o.formula}.</p>
              <OfferActions o={o} decision={offerDecisions[offerKey(o)]} onDecide={onOffer} />
            </div>))}
        </section>}

        <section>
          <h3>Item accuracy, last 8 weeks</h3>
          {it.accuracy ? <p style={{ margin: "0 0 6px" }}>Error (WAPE) <strong>{pct(it.accuracy.wape)}</strong> · bias <strong>{it.accuracy.bias > 0 ? "+" : ""}{pct(it.accuracy.bias)}</strong></p> : <p className="muted">Not enough history yet.</p>}
          {it.holdout && <LineChart ariaLabel="Backtest: actual against model and baseline" labels={meta.holdout_weeks.map(fmtWeek)} height={150}
            series={[{ name: "Actual", values: it.holdout.actual, color: "#141B23" }, { name: "Model", values: it.holdout.model, color: "#2B7BB9" }, { name: "Same week last year", values: it.holdout.baseline, color: "#FF713A", dashed: true, width: 1.5 }]} />}
          <p className="chart-note">Units per week over the 12 holdout weeks, forecast one week ahead. Source: backtest on synthetic data.</p>
        </section>

        <section>
          <h3>Decision · Wk {wn[week]}</h3>
          <p style={{ margin: "0 0 8px" }}>Suggested <span className="order">{f.order / p.case_pack} cs · {f.order}</span> · Status: <strong>{status === "Auto-approved" ? "Auto-approved (System)" : status}</strong></p>
          <div className="toolbar" style={{ alignItems: "end" }}>
            <label style={{ fontSize: 12 }}>Final order<br /><input className="final" type="number" min={0} step={p.case_pack} value={final} onChange={(e) => setFinal(Math.max(0, Number(e.target.value) || 0))} style={{ width: 90, padding: 6 }} /></label>
            <label style={{ fontSize: 12 }}>Reason<br /><select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Choose…</option>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label style={{ fontSize: 12, flex: 1 }}>Comment<br /><input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" style={{ width: "100%" }} /></label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={onAccept}>Accept suggestion</button>
            <button className="ghost" disabled={!reason || final === f.order} onClick={() => onOverride(final, reason, comment)} title={!reason ? "Choose a reason first" : undefined}>Override with reason</button>
            {decision && <button className="ghost" onClick={onUndo}>Clear decision</button>}
          </div>
        </section>

        <section>
          <h3>Notes and history</h3>
          <ul className="log clean">
            {log.map((l, i) => <li key={i}><span className="muted">{new Date(l.ts).toLocaleString("en-CA", { dateStyle: "short", timeStyle: "short" })} · Wk {wn[l.week]}</span> {l.text}</li>)}
            {!it.exceptions.length && <li><span className="muted">System</span> Approved by System: no exceptions for this item.</li>}
            {it.exceptions.length > 0 && <li><span className="muted">System</span> Sent for review: {it.exceptions.map((e) => EXCEPTION_LABEL[e]).join(", ")}.</li>}
          </ul>
        </section>
      </aside>
    </>
  );
}
