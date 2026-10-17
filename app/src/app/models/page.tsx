"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import LineChart from "@/components/LineChart";
import Journey from "@/components/Journey";
import { fmtWeek, loadMeta, money, pct, type Meta } from "@/lib/data";

const SHORT: Record<string, string> = { naive: "Last week", baseline: "Same week last year", classic: "Classic", ml: "Machine learning", hierarchical: "Hierarchical" };
const FAMILY: Record<string, string> = {
  naive: "Reference only: next week will look like last week. Shown so the baseline itself is put in context.",
  baseline: "What the store would order today: the same week last year. Every model has to beat it.",
  classic: "Simple, explainable and strong on seasons and holidays. Smooths each product's recent level and trend, then applies the category's seasonal pattern.",
  ml: "Learns from promotions, prices, holidays, weather and recent sales across all stores and products at once. Histogram gradient boosting, the same algorithm family as LightGBM.",
  hierarchical: "Takes the machine learning forecasts and reconciles them with a region level model, so store, region and national numbers add up.",
};

export default function Models() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => { loadMeta().then(setMeta); }, []);
  if (!meta) return <Shell><p className="muted">Loading…</p></Shell>;
  const base = meta.backtest.find((b) => b.model === "baseline")!;
  const sel = meta.backtest.find((b) => b.model === meta.selected_model)!;
  const ch = meta.chain_holdout;
  return (
    <Shell>
      <Journey here="discovery" />
      <h1>How we choose the model: start simple, test honestly</h1>
      <p className="takeaway">The machine learning model cuts the cost of lost sales, waste and extra stock by about a quarter against ordering the same as last year; the simplest model that does so is the one we keep.</p>
      <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {[["1", "Set a simple baseline", "Same week last year. Anything we build must beat it.", "t-yellow"], ["2", "Try smarter methods", "Classic statistics and machine learning, side by side.", "t-teal"],
          ["3", "Test on the past", "Hide recent data, predict it, and count the dollars saved.", "t-blue"], ["4", "Pick the simplest winner", "Fancier is not better unless it pays for itself.", "t-orange"]].map(([n, t, d, c]) => (
          <div key={n} className={`card ${c}`}><span className="dot" style={{ background: "#141B23" }}>{n}</span><strong>{t}</strong><p className="muted" style={{ margin: "6px 0 0" }}>{d}</p></div>))}
      </div>
      <p className="lede">This page is what the week 5 checkpoint (&quot;does a model beat the baseline?&quot;) could look like. Three model families tested against the &quot;same week last year&quot; baseline on the last 12 weeks of the pilot ({fmtWeek(meta.holdout_weeks[0])} to {fmtWeek(meta.holdout_weeks.at(-1)!)}), 20 stores and {meta.products.length} products. Each week is forecast using only data available before it. Models are judged on dollars, not just accuracy.</p>
      <div className="kpis">
        <div className="kpi"><div className="v">{pct(sel.wape_next_week)}</div><div className="l">forecast error (WAPE), selected model</div></div>
        <div className="kpi"><div className="v">{pct(base.wape_next_week)}</div><div className="l">forecast error, same week last year</div></div>
        <div className="kpi"><div className="v good">{money(sel.usd_saved_vs_baseline)}</div><div className="l">saved over 12 weeks, 20 stores</div></div>
        <div className="kpi"><div className="v">{pct(sel.pct_cost_cut)}</div><div className="l">lower cost of lost sales, waste and stock</div></div>
      </div>
      <div className="card">
        <h2>Results</h2>
        <div className="table-wrap" style={{ maxHeight: "none" }}>
          <table>
            <thead><tr><th>Model</th><th className="num">Error, next week</th><th className="num">Error, week after</th><th className="num hide-sm">Bias</th><th className="num hide-sm">Lost margin</th><th className="num hide-sm">Waste</th><th className="num hide-sm">Carrying</th><th className="num">Total cost</th><th className="num">Saved vs baseline</th></tr></thead>
            <tbody>
              {meta.backtest.map((b) => (
                <tr key={b.model} style={b.model === meta.selected_model ? { background: "#eef5fd" } : undefined}>
                  <td><strong>{b.label}</strong>{b.model === meta.selected_model ? <span className="tag new" style={{ marginLeft: 6 }}>Selected</span> : null}<div className="muted" style={{ fontSize: 12 }}>{FAMILY[b.model]}</div></td>
                  <td className="num">{pct(b.wape_next_week)}</td><td className="num">{pct(b.wape_week_after)}</td>
                  <td className="num hide-sm">{pct(b.bias_next_week)}</td><td className="num hide-sm">{money(b.usd_lost_margin)}</td>
                  <td className="num hide-sm">{money(b.usd_waste)}</td><td className="num hide-sm">{money(b.usd_carry)}</td>
                  <td className="num">{money(b.usd_total)}</td>
                  <td className={`num ${b.usd_saved_vs_baseline > 0 ? "good" : ""}`}>{b.model === "baseline" || b.model === "naive" ? (b.model === "naive" ? `costs ${money(-b.usd_saved_vs_baseline)} more` : "—") : `${money(b.usd_saved_vs_baseline)} (${pct(b.pct_cost_cut)})`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="callout"><strong>Selection rule.</strong> {meta.selection_rule} Error is WAPE: total absolute error divided by total units sold. Dollars come from simulating each week&apos;s order (forecast plus safety stock) and pricing lost margin on empty shelves, spoiled perishables, and the cost of carrying extra stock. The same 12 weeks, by category, are the evidence for the autonomy ladder on the planner page: a category earns autonomous ordering only after eight consecutive weeks inside the accuracy, bias, override and stockout limits.</p>
      </div>
      <div className="grid2">
        <div className="card">
          <h2>Chain total, weekly units</h2>
          <LineChart ariaLabel="Weekly units across all pilot stores: actual, model and baseline" labels={ch.weeks.map(fmtWeek)}
            series={[{ name: "Actual", values: ch.actual, color: "#141B23" }, { name: "Selected model", values: ch.model, color: "#2B7BB9" }, { name: "Same week last year", values: ch.baseline, color: "#FF713A", dashed: true }]} />
          <p className="muted" style={{ fontSize: 12 }}>At chain level the baseline looks close, because over and under forecasts cancel out across products. Orders are placed per store and product, where its error is {pct(base.wape_next_week)} against {pct(sel.wape_next_week)} for the selected model.</p>
          <p className="chart-note">Units sold per week across 20 stores, 12 holdout weeks (Jul 27 to Oct 12, 2026). Source: backtest on synthetic data, forecasts one week ahead.</p>
        </div>
        <div className="card dark">
          <div className="eyebrow" style={{ marginTop: 0 }}>The biggest watch-out</div>
          <h2 className="y" style={{ fontSize: 22 }}>Sales are not demand</h2>
          <p>An empty shelf shows zero sales. We test this in <span className="y">week 2</span>.</p>
          <div className="grid2" style={{ gap: 12 }}>
            <div><strong>Pros of time-series forecasting</strong><ul className="clean muted"><li>Spots seasons, holidays and trends</li><li>One approach for every store and product</li><li>Gives a best-to-worst range to set safety stock</li></ul></div>
            <div><strong>Cons and watch-outs</strong><ul className="clean muted"><li>New products have no history to learn from</li><li>Promotions and surprises break patterns</li></ul></div>
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>In this prototype the synthetic data records demand directly, so the week 2 test is not needed here; with real store data, stock records would be used to estimate lost sales first.</p>
        </div>
      </div>
      <div className="card">
        <h2>Winner by category</h2>
        <p className="muted" style={{ marginTop: 0 }}>Each model&apos;s error and total dollar cost (lost margin, waste and carrying) by category on the same 12 weeks; the winner is the cheapest. One chain-wide model is selected above, but discovery could keep a different winner per category if the dollars justify it.</p>
        <div className="table-wrap" style={{ maxHeight: "none" }}>
          <table>
            <thead><tr><th>Category</th>{["naive", "baseline", "classic", "ml", "hierarchical"].map((k) => <th key={k} className="num">{SHORT[k]}</th>)}<th>Winner</th></tr></thead>
            <tbody>{meta.backtest_by_category.map((c) => (
              <tr key={c.category}><td>{c.category}</td>
                {["naive", "baseline", "classic", "ml", "hierarchical"].map((k) => <td key={k} className="num" style={c.winner === k ? { background: "#FFF4D2", fontWeight: 700 } : undefined}>{pct(c[`wape_${k}`] as number)}<div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>{money(c[`usd_${k}`] as number)}</div></td>)}
                <td><strong>{SHORT[c.winner]}</strong></td></tr>))}</tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>New products</h2>
        <p>Items with little or no history borrow patterns from similar products: the model sees each product&apos;s category, its category&apos;s recent sales in that store, price and shelf life, so a new item starts from its category&apos;s pattern and adjusts as its own sales arrive.</p>
      </div>
    </Shell>
  );
}
