import Link from "next/link";
import Shell from "@/components/Shell";
import { GITHUB_URL } from "@/lib/brand";
import { readMeta } from "@/lib/server-data";
import { fmtWeek, pct } from "@/lib/data";

const SEQUENCE: [string, string][] = [["Look back", "104 weeks of sales, promotions and holidays for 20 stores"], ["Predict", "Four models, backtested over 12 weeks and judged in dollars"], ["Order", "A suggested order per item, reviewed by exception"]];
const m2 = (x: number) => `$${x.toFixed(2)}M`;
const k = (x: number) => `$${Math.round(x / 1000)}K`;

export default async function Landing() {
  const meta = await readMeta();
  const stores = [...meta.stores].sort((a, b) => a.store.localeCompare(b.store));
  const needs = stores.reduce((s, x) => s + x.needs_review, 0);
  const [wk1] = meta.forecast_weeks;
  const [wn1] = meta.forecast_week_numbers;
  const baseline = meta.backtest.find((b) => b.model === "baseline")!;
  const ranked = [...meta.backtest].filter((b) => b.model !== "naive").sort((a, b) => a.usd_total - b.usd_total);
  const bc = meta.business_case; const sc = bc.scenarios;

  return (
    <Shell notice={false}>
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow hero-eyebrow">Demand forecasting / grocery pilot</p>
          <h1 id="hero-title">A better forecast tells each store how much to order.</h1>
          <p className="hero-lede">Harbourline Foods is a fictional Canadian grocer with 300 stores. This prototype runs a 20-store forecasting pilot from data to models to the screen a planner opens every morning.</p>
          <div className="hero-actions">
            <Link className="btn hero-cta" href="/planner/">Open the planner</Link>
            <Link className="btn ghost hero-cta" href="/business-case/">Read the business case</Link>
          </div>
        </div>
        <ol className="sequence" aria-label="How the pilot works">
          {SEQUENCE.map(([t, d], i) => <li key={t}><span>0{i + 1}</span><strong>{t}</strong>{d}</li>)}
        </ol>
      </section>

      <section className="live-strip" aria-label="Pilot status this week">
        <div><span className="k">Order week</span><strong>Wk {wn1} · {fmtWeek(wk1)}</strong></div>
        <div><span className="k">Pilot stores</span><strong>{stores.length}</strong></div>
        <div><span className="k">Items needing a planner</span><strong>{needs} <span className="muted">of {stores.length * stores[0].skus}</span></strong></div>
        <div><span className="k">Forecast error (WAPE)</span><strong>{pct(meta.chain_kpis.wape)}</strong></div>
        <div><span className="k">In stock</span><strong>{pct(meta.chain_kpis.in_stock)}</strong></div>
        <div><span className="k">Model in use</span><strong>{ranked[0]?.label.split(" (")[0]}</strong></div>
      </section>

      <section className="workspace landing-workspace" aria-label="What is inside">
        <article className="panel panel-wide">
          <div className="panel-head"><p className="panel-index">01 · Planner</p><Link href="/planner/" className="panel-link">Open</Link></div>
          <h2>Twenty stores, one order screen each</h2>
          <p>Pick a store to see every item with the forecast for Wk {wn1} and Wk {wn1 + 1}, stock on hand and a case-pack order. The exceptions wait for a planner; the rest is approved automatically.</p>
          <div className="store-grid">
            {stores.map((s) => (
              <Link key={s.store} href={`/planner/?store=${s.store}`} className="store-tile">
                <span className="code">{s.store}</span>
                <strong>{s.name}</strong>
                <span className="muted">{s.city}, {s.province}</span>
                <span className="meta"><em>{s.needs_review}</em> to review · {pct(s.in_stock, 0)} in stock</span>
              </Link>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head"><p className="panel-index">02 · Model comparison</p><Link href="/models/" className="panel-link">Backtest</Link></div>
          <h2>Start simple, test honestly</h2>
          <p>Twelve holdout weeks across the pilot stores, judged on lost margin, waste and carrying cost rather than error alone.</p>
          <table className="mini">
            <thead><tr><th>Model</th><th className="num">WAPE</th><th className="num">Saved vs baseline</th></tr></thead>
            <tbody>
              {ranked.map((b) => (
                <tr key={b.model} className={b.model === meta.selected_model ? "sel" : ""}>
                  <td>{b.label.split(" (")[0]}{b.model === meta.selected_model && <span className="lvl L2" style={{ marginLeft: 6 }}>in use</span>}</td>
                  <td className="num">{pct(b.wape_next_week)}</td>
                  <td className="num">{b.model === "baseline" ? "—" : k(b.usd_saved_vs_baseline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Baseline WAPE {pct(baseline.wape_next_week)}. Dollars over the 12-week holdout, 20 stores.</p>
        </article>
        <article className="panel">
          <div className="panel-head"><p className="panel-index">03 · Business case</p><Link href="/business-case/" className="panel-link">Full case</Link></div>
          <h2>Three levers, one go/no-go line</h2>
          <p>A worked case from stated assumptions for all 300 stores, with a seven-week discovery plan and the checkpoints where the work stops if the numbers do not clear.</p>
          <dl className="levers">
            <div><dt>Sell more</dt><dd>{m2(sc.base.sales)}</dd></div>
            <div><dt>Throw out less</dt><dd>{m2(sc.base.waste)}</dd></div>
            <div><dt>Hold less stock</dt><dd>{m2(sc.base.stock)}</dd></div>
            <div className="tot"><dt>Base case, a year</dt><dd>{m2(sc.base.total)}</dd></div>
            <div><dt>Go/no-go line</dt><dd>{m2(bc.breakeven_m)}</dd></div>
            <div><dt>Payback</dt><dd>{sc.base.payback_years} years</dd></div>
          </dl>
        </article>
      </section>

      <section className="colophon" aria-label="About this prototype">
        <p><strong>Built by Ankit Mishra</strong> as an open work sample. Harbourline Foods is a fictional retailer and every number is synthetic; not affiliated with any company. Nothing to sign in to, and what you do here stays in your browser.</p>
        <p className="colophon-links"><Link href="/about/">About this prototype</Link><Link href="/plan/">Delivery plan</Link><Link href="/security/">Data &amp; security</Link><a href={GITHUB_URL}>Source on GitHub</a></p>
      </section>
    </Shell>
  );
}
