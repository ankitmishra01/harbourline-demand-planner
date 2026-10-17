import Link from "next/link";
import { DISCLAIMER, GITHUB_URL } from "@/components/Shell";

const STEPS: [string, string][] = [
  ["Look at past sales, promotions and holidays", "104 weeks of weekly sales for 20 pilot stores and 136 products, generated and calibrated to public Statistics Canada series."],
  ["Predict demand for each store and product", "A same-week-last-year baseline, a classic time series model, gradient-boosted machine learning and hierarchical reconciliation, tested on a 12-week holdout and judged in dollars."],
  ["Tell planners what to order", "A store order screen with the forecast for next week and the week after, a P10 to P90 range, stock on hand and on order, and a suggested order rounded to the case pack, reviewed by exception. Approved orders go out as purchase orders, and each category earns autonomy from evidence."],
];

export default function Landing() {
  return (
    <div className="landing">
      <div className="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/harbourline-wordmark.svg" alt="Harbourline Foods" style={{ height: 26, width: "auto", display: "block" }} />
        <span className="demo" style={{ display: "inline-block", marginTop: 16 }}>Demand planner prototype · synthetic data</span>
        <h1 style={{ marginTop: 12 }}>A better forecast tells each store how much to order.</h1>
        <p className="lede">Harbourline Foods is a fictional mid-sized Canadian grocer: 300 stores and $200M in revenue. This prototype walks through a 20-store forecasting pilot end to end, from data to models to the screen a planner would use every morning.</p>
        <ol className="landing-steps">
          {STEPS.map(([t, d], i) => <li key={t}><span className="n">{i + 1}</span><div><strong>{t}</strong><p className="muted">{d}</p></div></li>)}
        </ol>
        <div className="landing-cta">
          <Link className="btn" href="/planner/">Open the planner</Link>
          <nav className="landing-links" aria-label="Other pages">
            <Link href="/models/">Model comparison</Link>
            <Link href="/business-case/">Business case</Link>
            <Link href="/plan/">Delivery plan</Link>
            <a href={GITHUB_URL}>Source on GitHub</a>
          </nav>
        </div>
        <p className="note" style={{ marginTop: 18 }}>{DISCLAIMER} No sign-in: decisions, sent orders and offers you make live only in your browser.</p>
      </div>
    </div>
  );
}
