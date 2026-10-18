"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { EXCEPTION_LABEL, loadMeta, type ExceptionCode, type Meta } from "@/lib/data";

export default function About() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => { loadMeta().then(setMeta); }, []);
  return (
    <Shell>
      <h1>About this prototype</h1>
      <p className="takeaway">Built in the open: every rule, threshold and formula the planner sees is written down here, and every number comes from a pipeline you can re-run.</p>
      <p className="lede">What the end product could look like for planners at a mid-sized Canadian grocer: open the planner, see every product by name and code, and view the forecast for next week and the week after, so they know how much to order. It follows a discover, pilot, rollout framing: prove value on a 20 to 30 store pilot, then decide on a proof of concept and rollout against the go/no-go line.</p>
      <div className="grid2">
        <div className="card">
          <h2>The data</h2>
          <ul className="clean">
            <li>104 weeks of weekly sales for 20 pilot stores in 5 regions and 136 products in 8 categories, generated with a fixed random seed. Six products launched in the last ten weeks test the new item case.</li>
            <li>Monthly seasonality comes from real Statistics Canada supermarket sales (Table 20-10-0056-01) and price drift from the food purchased from stores CPI (Table 18-10-0004-01).</li>
            <li>Canadian statutory holidays move demand by category (Thanksgiving, Christmas, Easter, Victoria Day, Canada Day, Labour Day, New Year). Weather uses approximate regional temperature normals with random weekly anomalies.</li>
            <li>Flyer promotions run chain wide at 15% to 30% off with category specific lifts; perishables spoil when stock outlasts its shelf life, plus a small handling shrink.</li>
            <li>Everything about the stores, sales and stock is synthetic. No real retailer data is used.</li>
          </ul>
        </div>
        <div className="card">
          <h2>The models</h2>
          <ul className="clean">
            <li><strong>Reference:</strong> same as last week (shown for context, never selected).</li>
            <li><strong>Baseline:</strong> same week last year.</li>
            <li><strong>Classic time series:</strong> damped exponential smoothing on a deseasonalised series.</li>
            <li><strong>Machine learning:</strong> gradient-boosted trees with promotion, price, holiday, weather and lag features.</li>
            <li><strong>Hierarchical:</strong> the machine learning forecasts reconciled with a region level model.</li>
            <li>Tested on the last 12 weeks, one week and two weeks ahead, and judged on dollars: lost margin, waste and carrying cost.</li>
          </ul>
        </div>
      </div>
      <div className="grid2">
        <div className="card t-yellow">
          <h2>Review rules and thresholds</h2>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>An item needs review when at least one rule fires; everything else is auto-approved. The rules are tuned so a typical store reviews 15% to 20% of its items each week.</p>
          <ul className="clean" style={{ fontSize: 13 }}>
            {meta ? (Object.keys(EXCEPTION_LABEL) as ExceptionCode[]).map((k) => <li key={k}><strong>{EXCEPTION_LABEL[k]}:</strong> {meta.rules[k]}</li>) : <li className="muted">Loading…</li>}
          </ul>
          <p style={{ fontSize: 13 }}><strong>Autonomy thresholds</strong> (per category class, checked every week of the backtest): ambient WAPE ≤ 35%, bias ± 5%, overrides ≤ 5% of lines, stockouts ≤ 10% of lines; fresh WAPE ≤ 40%, bias ± 5%, overrides ≤ 5%, stockouts ≤ 30%. Eight passing weeks in a row earn L3. Once earned, one miss is a grace week; two consecutive failing weeks lose L3. Fresh stays at L2 in the pilot. Synthetic ambient demand uses lower negative-binomial noise than short-life fresh demand, based only on shelf-life class, to reflect the lower published error floor for ambient grocery. The pilot sets production thresholds at the week 5 checkpoint.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}><strong>Priority:</strong> High when the stockout or spoilage rule fires; Medium for any other exception; Low when none does. The order list sorts needs-review first, then priority, then the fewest days of supply.</p>
        </div>
        <div className="card t-blue">
          <h2>Formulas on the order screen</h2>
          <ul className="clean" style={{ fontSize: 13 }}>
            <li><strong>Suggested order</strong> = forecast (P50) + safety stock − on hand − on order, never below zero, rounded up to whole cases.</li>
            <li><strong>Safety stock</strong> = 1.28 × σ × √(review days ÷ 7), about a 90% service level over the category&apos;s review period. σ is the item&apos;s forecast error from the validation weeks.</li>
            <li><strong>Days of supply</strong> = stock ÷ (forecast ÷ 7). Stock on order counts only when it lands before the shelf runs empty.</li>
            <li><strong>Week after:</strong> on hand is projected from today&apos;s stock plus this week&apos;s order, less this week&apos;s forecast and spoilage, so nothing is counted twice.</li>
            <li><strong>Projected spoilage</strong> = fresh stock beyond what the remaining shelf life can sell at the forecast rate, plus handling shrink; a chain-wide 1.5% of sales at cost in the backtest.</li>
            <li><strong>Open-to-buy</strong> = cost of expected sales for the week × 1.10; the send sheet checks the orders against it.</li>
          </ul>
          <p style={{ fontSize: 13, marginBottom: 0 }}><strong>Review periods</strong> (days between orders): {meta ? Object.entries(meta.review_days).map(([c, d]) => `${c} ${d}`).join(" · ") : "…"}.</p>
        </div>
      </div>
      <div className="card">
        <h2>Design informed by industry practice</h2>
        <p style={{ marginTop: 0 }}>The order screen follows patterns that grocery planning tools document publicly, without copying any vendor&apos;s interface: review by exception, with items that pass every rule approved automatically (<a href="https://docs.oracle.com/en/industries/retail/demand-forecasting/22.1.202.0/rdfcu/forecast-review-task.htm" target="_blank" rel="noreferrer">Oracle forecast review</a>); shelf life and spoilage risk for fresh items (<a href="https://www.relexsolutions.com/solutions/fresh-inventory/" target="_blank" rel="noreferrer">RELEX fresh</a>); store ordering with planner overrides (<a href="https://afresh.com/solutions/store-ordering" target="_blank" rel="noreferrer">Afresh</a>); and sorting the order list by priority so the most valuable decisions come first (<a href="https://docs.lokad.com/library/economic-purchase-prioritization" target="_blank" rel="noreferrer">Lokad</a>).</p>
        <p className="muted" style={{ marginBottom: 0 }}>Left out on purpose, to keep it to what a pilot needs: truck fill, supplier portals, multi-step approvals, what-if tuning, a native mobile app, price optimisation and batch tracking. Markdowns and flyer candidates are suggested with a simple rule, not optimised.</p>
      </div>
      <div className="card">
        <h2>Limits</h2>
        <p style={{ margin: 0 }}>Synthetic data is cleaner than real data, so the measured improvements are illustrative. Discovery replaces every assumption with the grocer&apos;s own sales, waste, stock and promotion history, and the go/no-go decision uses those numbers. Orders here are a simple rule (forecast plus safety stock, less stock on hand and on order, rounded to case packs); production would add delivery schedules, minimum orders and shelf capacity. On hand, on order, case packs, lead times, suppliers and open-to-buy are synthetic. Sending orders is simulated in the browser: nothing connects to a retailer system.</p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Read next</h2>
        <p style={{ margin: 0 }}><a href="/discovery/">How we chose where to start</a> (the discovery work behind the use case) · <a href="/handoff/">What engineering receives</a> (the handoff pack) · <a href="/enablement/">How planners move up the ladder</a> (adoption) · <a href="/how-it-was-built/">How this was built</a> (what the AI did and what the author decided) · <a href="https://github.com/ankitmishra01/harbourline-demand-planner/blob/main/docs/case-study.pdf">One-page case study (PDF)</a>.</p>
      </div>
    </Shell>
  );
}
