import Link from "next/link";
import Shell from "@/components/Shell";
import { GITHUB_URL } from "@/lib/brand";

const SEQUENCE: [string, string][] = [["Look back", "104 weeks of sales, promotions and holidays for 20 stores"], ["Predict", "Four models, backtested over 12 weeks and judged in dollars"], ["Order", "A suggested order per item, reviewed by exception"]];

const PANELS: [string, string, string, string, string][] = [
  ["01", "Planner", "Store order review", "Every item with the forecast for the next two weeks, stock on hand and a case-pack order. Planners decide the exceptions; the rest is approved automatically, and each category earns autonomy from evidence.", "/planner/"],
  ["02", "Model comparison", "Start simple, test honestly", "A same-week-last-year baseline against a classic time series model, gradient boosting and hierarchical reconciliation. The winner is the one that costs least in lost margin, waste and carrying stock.", "/models/"],
  ["03", "Business case", "Three levers, one go/no-go line", "Sell more, throw out less, hold less stock: a worked case from stated assumptions, with a seven-week discovery plan and the checkpoints where the work stops if the numbers do not clear.", "/business-case/"],
];

export default function Landing() {
  return (
    <Shell notice={false}>
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow hero-eyebrow">Demand forecasting / grocery pilot</p>
          <h1 id="hero-title">A better forecast tells each store how much to order.</h1>
          <p className="hero-lede">Harbourline Foods is a fictional Canadian grocer with 300 stores. This prototype walks a 20-store forecasting pilot from data to models to the screen a planner would open every morning.</p>
          <div className="hero-actions">
            <Link className="btn hero-cta" href="/planner/">Open the planner</Link>
            <Link className="btn ghost hero-cta" href="/business-case/">Read the business case</Link>
          </div>
        </div>
        <ol className="sequence" aria-label="How the pilot works">
          {SEQUENCE.map(([t, d], i) => <li key={t}><span>0{i + 1}</span><strong>{t}</strong>{d}</li>)}
        </ol>
      </section>

      <section className="workspace" aria-label="What is inside">
        {PANELS.map(([n, kicker, title, body, href]) => (
          <article className="panel" key={n}>
            <p className="panel-index">{n} · {kicker}</p>
            <h2>{title}</h2>
            <p>{body}</p>
            <Link href={href} className="panel-link">Open {kicker.toLowerCase()}</Link>
          </article>
        ))}
      </section>

      <section className="colophon" aria-label="About this prototype">
        <p><strong>Built by Ankit Mishra</strong> as an open work sample. Harbourline Foods is a fictional retailer and every number is synthetic; not affiliated with any company. Nothing to sign in to, and what you do here stays in your browser.</p>
        <p className="colophon-links"><Link href="/about/">About this prototype</Link><Link href="/plan/">Delivery plan</Link><Link href="/security/">Data &amp; security</Link><a href={GITHUB_URL}>Source on GitHub</a></p>
      </section>
    </Shell>
  );
}
