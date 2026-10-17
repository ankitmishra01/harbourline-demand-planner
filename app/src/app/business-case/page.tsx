"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Journey from "@/components/Journey";
import { loadMeta, mm, pct, type Meta } from "@/lib/data";

const m2 = (x: number) => `$${x.toFixed(2)}M`;
// Round half up (0.245 shows as 0.25, not 0.24).
const r2 = (x: number) => (Math.round(Math.abs(x) * 100 + 1e-6) / 100).toFixed(2);
const paren = (x: number) => (x < 0 ? `(${r2(x)})` : r2(x));

const PUBLISHED: [string, string, string, { label: string; href: string }[]][] = [
  ["Sell more", "+0.75% of sales", "Shelf Engine: +1.9% sales in a controlled test (bagged salads). Afresh: about +3% sales.",
    [{ label: "Shelf Engine case study", href: "https://www.shelfengine.com/wp-content/uploads/2024/01/Bagged-Salads_-1-Page-Case-Study.pdf" }, { label: "Afresh store ordering", href: "https://afresh.com/solutions/store-ordering" }]],
  ["Throw out less", "−11.5% of waste and markdowns", "RELEX with Booths: about −10% waste. Vendor claims for fresh run from 25% to 50%.",
    [{ label: "RELEX inventory planning", href: "https://www.relexsolutions.com/resources/inventory-planning-software/" }]],
  ["Hold less stock", "−7.5% of average stock", "Morrisons with Blue Yonder: 2 to 3 fewer days of stock. ICA with RELEX: safety stock down 32%.",
    [{ label: "Morrisons case study", href: "https://edge.sitecorecloud.io/blueyonderie8e6-corporateefb0-prod6ccb-be06/media/project/blueyonder/corporate/files/customers/morrisons-01.pdf" }, { label: "ICA Sverige and RELEX", href: "https://www.relexsolutions.com/news/ica-sverige-enhances-inventory-efficiency-and-forecast-accuracy-with-relex/" }]],
];

export default function BusinessCase() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => { loadMeta().then(setMeta); }, []);
  if (!meta) return <Shell><p className="muted">Loading…</p></Shell>;
  const bc = meta.business_case;
  const a = bc.assumptions as Record<string, number & number[]>;
  const sc = bc.scenarios;
  const m = bc.measured_levers;
  const cum = bc.cumulative_cash_m.base;
  const cmax = Math.max(...cum.map(Math.abs));
  const c = bc.costs_m;
  return (
    <Shell>
      <Journey here="discovery" />
      <h1>Three ways a better forecast adds up to about {m2(sc.base.total)} a year</h1>
      <p className="takeaway">Sell more, throw out less, hold less stock: {m2(sc.base.total)} a year in the base case against a {m2(bc.breakeven_m)} go/no-go line, paid back in {sc.base.payback_years} years.</p>
      <p className="lede">A worked business case from a small set of planning assumptions. Only revenue (${a.revenue_m}M) and store count ({a.stores}) are given; every other rate is an assumption until Harbourline shares its data in week 1 of discovery.</p>

      <div className="grid3">
        <div className="card t-blue"><div className="eyebrow" style={{ marginTop: 0 }}>1 · Sell more</div><div style={{ fontSize: 34, fontWeight: 700 }}>{m2(sc.base.sales)}</div><div className="muted">a year</div>
          <p style={{ marginBottom: 0 }}>Fewer empty shelves. We assume {pct(a.sales_uplift[1], 2)} more sales at a {pct(a.margin, 0)} margin.</p></div>
        <div className="card t-orange"><div className="eyebrow" style={{ marginTop: 0 }}>2 · Throw out less</div><div style={{ fontSize: 34, fontWeight: 700 }}>{m2(sc.base.waste)}</div><div className="muted">a year</div>
          <p style={{ marginBottom: 0 }}>Waste and markdowns are {pct(a.waste_pct, 0)} of revenue today. We assume we cut {pct(a.waste_cut[1], 1)} of that.</p></div>
        <div className="card t-teal"><div className="eyebrow" style={{ marginTop: 0 }}>3 · Hold less stock</div><div style={{ fontSize: 34, fontWeight: 700 }}>{m2(sc.base.stock)}</div><div className="muted">a year</div>
          <p style={{ marginBottom: 0 }}>Average stock is ${a.inventory_m}M. We assume {pct(a.inv_cut[1], 1)} less, and holding stock costs {pct(a.carry, 0)} a year.</p></div>
      </div>
      <div className="card dark" style={{ textAlign: "center" }}>
        <strong>Total: {m2(sc.base.total)} a year (low {m2(sc.low.total)}, high {m2(sc.high.total)})</strong>
        <div className="muted" style={{ fontSize: 12 }}>Figures may not sum due to rounding. Plus a one-time cash release of {mm(sc.low.cash_release).replace(".00", ".0")} to {mm(sc.high.cash_release).replace(".00", ".0")} from lower stock (not counted as profit).</div>
      </div>

      <h2 style={{ marginTop: 26, fontSize: 20 }}>Base case pays back in {sc.base.payback_years?.toFixed(1)} years; below {m2(bc.breakeven_m)} a year, 5-year value turns negative</h2>
      <div className="grid2">
        <div className="card">
          <h3>Cumulative cash, base case ($M)</h3>
          <svg viewBox="0 0 420 220" role="img" aria-label="Cumulative cash by year, base case" style={{ width: "100%", height: "auto" }}>
            <line x1="20" x2="410" y1="110" y2="110" stroke="var(--ink)" />
            {cum.map((v, i) => { const h = (Math.abs(v) / cmax) * 85; const x = 30 + i * 64; return (
              <g key={i}>
                <rect x={x} width="40" y={v >= 0 ? 110 - h : 110} height={h} fill={v >= 0 ? "var(--teal)" : "var(--orange)"} />
                <text x={x + 20} y={v >= 0 ? 104 - h : 124 + h} textAnchor="middle" fontSize="12" fontWeight="700">{paren(v)}</text>
                <text x={x + 20} y="216" textAnchor="middle" fontSize="11" fill="var(--muted)">Y{i}</text>
              </g>); })}
          </svg>
          <p className="chart-note">Cumulative cash in $M by year from the start of discovery (Y0), base case, before discounting. Formulas: pipeline/business_case.py.</p>
        </div>
        <div className="card">
          <h3>Where the ${(c.blueprint + c.pilot + c.rollout).toFixed(2)}M goes</h3>
          <div className="calc">
            <span>Discovery (7 weeks)</span><span className="num">${c.blueprint.toFixed(3)}M</span>
            <span>Pilot (proof of concept)</span><span className="num">${c.pilot.toFixed(2)}M</span>
            <span>Rollout to all stores</span><span className="num">${c.rollout.toFixed(2)}M</span>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>Then ${c.run_per_year.toFixed(2)}M a year to run it.</p>
          <table className="compare">
            <thead><tr><th></th><th className="num">Low</th><th className="num" style={{ background: "var(--yellow)", color: "var(--ink)" }}>Base</th><th className="num">High</th></tr></thead>
            <tbody>
              <tr><td>Profit a year</td><td className="num">{m2(sc.low.total)}</td><td className="num"><strong>{m2(sc.base.total)}</strong></td><td className="num">{m2(sc.high.total)}</td></tr>
              <tr><td>Pays back (years)</td><td className="num">{sc.low.payback_years?.toFixed(1)}</td><td className="num"><strong>{sc.base.payback_years?.toFixed(1)}</strong></td><td className="num">{sc.high.payback_years?.toFixed(1)}</td></tr>
              <tr><td>5-year value (NPV)</td><td className="num">{m2(sc.low.npv_m)}</td><td className="num"><strong>{m2(sc.base.npv_m)}</strong></td><td className="num">{m2(sc.high.npv_m)}</td></tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>NPV = what the cash is worth in today&apos;s money ({pct(a.discount_rate, 0)} discount rate, 5 years).</p>
        </div>
      </div>
      <div className="card dark"><div className="eyebrow" style={{ marginTop: 0 }}>Break-even</div><strong>{m2(bc.breakeven_m)} a year.</strong> Below this the 5-year value turns negative: our go/no-go line.</div>

      <h2 style={{ marginTop: 26, fontSize: 20 }}>How our levers compare with published results</h2>
      <div className="card t-yellow">
        <div className="table-wrap" style={{ maxHeight: "none", border: 0 }}>
          <table>
            <thead><tr><th>Lever</th><th>Our base case</th><th>Published results (vendor-reported)</th><th>Sources</th></tr></thead>
            <tbody>{PUBLISHED.map(([lever, ours, pub, src]) => (
              <tr key={lever}><td><strong>{lever}</strong></td><td>{ours}</td><td>{pub}</td><td>{src.map((s) => <div key={s.href}><a href={s.href} target="_blank" rel="noreferrer">{s.label}</a></div>)}</td></tr>))}</tbody>
          </table>
        </div>
        <p className="callout" style={{ marginBottom: 0 }}><strong>Our levers sit at or below the low end of published results, so the case is conservative.</strong> These figures are reported by vendors about their own customers, in different markets and categories, so they are a sense check rather than a forecast for Harbourline.</p>
      </div>

      <h2 style={{ marginTop: 26, fontSize: 20 }}>What the synthetic pilot shows (illustrative)</h2>
      <div className="grid2">
        <div className="card">
          <table>
            <thead><tr><th>Improvement</th><th className="num">Plan (low / base / high)</th><th className="num">Synthetic backtest</th></tr></thead>
            <tbody>
              <tr><td>Sales uplift</td><td className="num">{a.sales_uplift.map((x: number) => pct(x, 2)).join(" / ")}</td><td className="num">{pct(m.sales_uplift, 2)}</td></tr>
              <tr><td>Waste cut</td><td className="num">{a.waste_cut.map((x: number) => pct(x, 1)).join(" / ")}</td><td className="num">{pct(m.waste_cut, 1)}</td></tr>
              <tr><td>Stock cut</td><td className="num">{a.inv_cut.map((x: number) => pct(x, 1)).join(" / ")}</td><td className="num">{pct(m.inv_cut, 1)}</td></tr>
              <tr><td><strong>Profit a year at 300 stores</strong></td><td className="num">{m2(sc.low.total)} / {m2(sc.base.total)} / {m2(sc.high.total)}</td><td className="num"><strong>{m2(sc.mock_pilot.total)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <div className="card peach">
          <p style={{ marginTop: 0 }}>The prototype&apos;s backtest on synthetic data is illustrative. It shows the mechanics: forecast, order, and the dollars that follow. Its waste cut is higher than the plan because generated data has clean promotion and holiday signals.</p>
          <p><strong>Discovery replaces every assumption with Harbourline&apos;s own data</strong>, and the go/no-go decision at week 7 uses those numbers, not these.</p>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Planner time is not in the $1.06M. At the exceptions-only level a planner reviews about 16% of lines (24 of 136 at a typical store) instead of every line, and categories that earn autonomous ordering need only a veto; the hours saved are a note here, not a lever.</p>
        </div>
      </div>
    </Shell>
  );
}
