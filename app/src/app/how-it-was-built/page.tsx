import Shell from "@/components/Shell";

const PRE: React.CSSProperties = { margin: "8px 0 0", padding: "12px 14px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 4, fontSize: 12.5, lineHeight: 1.55, overflowX: "auto", color: "var(--ink)" };

const LOOP: [string, string][] = [
  ["Write the spec in plain English", "what the data must contain, what the screen must show, what counts as done"],
  ["Generate", "Claude Code or Codex drafts the file, the test or the page"],
  ["Test against invariants", "the stated rules run as code before the output is trusted"],
  ["Read every line", "the diff is read in full; nothing merges on a green check alone"],
  ["Measure in dollars", "lost margin, waste and carrying cost decide, not error alone"],
  ["Ship and screenshot", "deploy, retake every capture by script, read the page as a user"],
];

const MISSES: [string, string, string][] = [
  ["A proposed loosening of the autonomy thresholds", "The first draft of the ladder raised the ambient WAPE limit and widened the bias band so that more categories reached L3.", "Caught by reading the diff. Rejected. The data generator was recalibrated instead (ambient demand given lower dispersion than fresh) and every threshold stayed as written."],
  ["A brand constant exported from a client component", "The disclaimer strings lived in the client-side Shell and were imported by a server component; the build rejected the import.", "Caught by the production build. The constants moved to a plain module (lib/brand) that both sides import."],
  ["A CI runner on an older Node", "The Node test job could not load the TypeScript test file on the first push, although it passed locally.", "Caught by CI. The workflow pins a Node version that runs TypeScript tests natively, with the typecheck before the tests."],
  ["The baseline over-ordering on clean synthetic data", "The baseline over-orders on data with no hidden lost sales, so the backtest implied $2.98M a year, above the plan's high case.", "Caught by comparing the levers with published vendor results. The backtest is labelled illustrative and the business case uses its own, lower levers."],
  ["Copy that repeated 'fictional' four times on one screen", "Header badge, disclaimer bar, lede and footer each said the retailer was invented, in slightly different words.", "Caught in design review. One short notice at the top, one full disclaimer in the footer, and the lede talks about the product instead."],
];

export default function HowItWasBuilt() {
  return (
    <Shell>
      <h1>How this was built</h1>
      <p className="takeaway">AI wrote most of the code; a human owned every decision. The tools proposed, the author disposed, and every number was tested before it reached a page.</p>
      <p className="lede">The whole prototype took about two working days of elapsed time. It was built with Claude Code and Codex, with the author reviewing every model choice, threshold and sentence. This page sets out what the tools did, what the author decided, and how quality was kept.</p>

      <div className="eyebrow">The split</div>
      <div className="grid2">
        <div className="card">
          <h2>What the AI did</h2>
          <ul className="clean">
            <li>Scaffolded the Python pipeline and the Next.js app from a written outline.</li>
            <li>Wrote the first draft of every page, component and API route.</li>
            <li>Generated the synthetic data generator from a spec that named the Statistics Canada series, holidays and climate normals to calibrate against.</li>
            <li>Wrote the 30 Python and 7 Node tests from invariants stated in plain English.</li>
            <li>Retook every screenshot by script after each change.</li>
            <li>Drafted copy for the author to cut, correct and rewrite.</li>
          </ul>
        </div>
        <div className="card dark">
          <h2>What the author decided</h2>
          <ul className="clean">
            <li>Which use case to build, and which to leave for later.</li>
            <li>The five models, the rolling 12-week holdout and the selection rule: the simplest model within 10% of the best in dollars.</li>
            <li>Every threshold in the seven review rules and the autonomy ladder.</li>
            <li>The business-case assumptions, the $0.70M a year go/no-go line and the stage-gated spend.</li>
            <li>What to leave out: truck fill, supplier portals, price optimisation, multi-step approvals.</li>
            <li>Every sentence on the site.</li>
          </ul>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>One example of the rule in practice: a first draft loosened the autonomy thresholds so that more categories would pass. It was rejected. The data generator was recalibrated instead, and the thresholds did not move.</p>
        </div>
      </div>

      <div className="eyebrow">The working loop</div>
      <div className="steps n6">
        {LOOP.map(([t, d], i) => (
          <div key={t}><span className="n">{i + 1}</span><span>{t}<br /><span className={i === 5 ? "" : "muted"} style={{ fontWeight: 400, color: i === 5 ? "#C2CDD2" : undefined }}>{d}</span></span></div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>The spec came first every time; code that arrived without one was discarded, however good it looked.</p>

      <div className="eyebrow">Guardrails that kept quality up</div>
      <div className="grid3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="card t-violet">
          <h3>Tests first for anything with a number</h3>
          <p style={{ fontSize: 13, margin: 0 }}>30 Python tests and 7 Node tests pin the invariants: orders are whole cases; P10 ≤ P50 ≤ P90 on every line; the &quot;why this forecast&quot; parts sum to the forecast; the review rate sits in the 15% to 20% band; projected spoilage stays inside its band; and the business-case totals reproduce from the stated assumptions.</p>
        </div>
        <div className="card t-teal">
          <h3>Determinism</h3>
          <p style={{ fontSize: 13, margin: 0 }}>One seed (20261017) drives the data generator and the models. A clean rerun reproduces backtest.csv and meta.json byte for byte, so any change in a number is a change someone made, not noise.</p>
        </div>
        <div className="card t-violet">
          <h3>Dollars, not accuracy</h3>
          <p style={{ fontSize: 13, margin: 0 }}>WAPE alone misleads: a model can cut error and still cost more by under-ordering items where a lost sale is worth more than a spoiled unit. Every error is priced as lost margin at 25%, waste at cost and carrying cost at 15% a year, and the dollars pick the model.</p>
        </div>
        <div className="card t-teal">
          <h3>Review by a human</h3>
          <p style={{ fontSize: 13, margin: 0 }}>Every page was read aloud before it shipped. Reading aloud catches repeated words, claims that outrun the evidence and copy a planner would not say.</p>
        </div>
        <div className="card t-violet">
          <h3>Public data, cited</h3>
          <p style={{ fontSize: 13, margin: 0 }}>Seasonality comes from Statistics Canada Table 20-10-0056-01 and price drift from Table 18-10-0004-01, cited with vector numbers and dates; holidays are the Canadian statutory calendar; weather uses ECCC climate normals. Everything else is marked as assumed.</p>
        </div>
        <div className="card t-teal">
          <h3>One design system</h3>
          <p style={{ fontSize: 13, margin: 0 }}>Colours, spacing and type are CSS variables that follow the AM Consulting Group design system: hairlines, 4px radius, violet for the next action. No ad hoc styling, so a generated page looks like the rest without a second pass.</p>
        </div>
      </div>

      <div className="eyebrow">What the tools got wrong, and how it was caught</div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th style={{ position: "static" }}>Issue</th><th style={{ position: "static" }}>How it showed up</th><th style={{ position: "static" }}>Fix</th></tr></thead>
          <tbody>
            {MISSES.map(([a, b, c]) => <tr key={a}><td><strong>{a}</strong></td><td>{b}</td><td>{c}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Each was caught by a check already in place: the diff review, the build, CI, the comparison with published results, or the design review.</p>

      <div className="eyebrow">Time and cost</div>
      <div className="callout">
        <p style={{ margin: "4px 0" }}><strong>About two working days of elapsed time</strong> for the data, the models, the app, the tests, the design and the documentation. No paid services beyond the author&apos;s existing tools; hosting on a free tier with no environment variables and no database.</p>
        <p style={{ margin: "4px 0" }}>That is the point. The expensive part of a pilot is now the decisions: which use case, which thresholds, which assumptions, where the go/no-go line sits. The code that carries them costs days, not months.</p>
      </div>

      <div className="eyebrow">How to reproduce it</div>
      <div className="card">
        <p style={{ margin: 0, fontSize: 13 }}>Clone the repository and run the pipeline, the tests and the app. Generated data is committed, so the app builds without the pipeline.</p>
        <pre style={PRE}>{`python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python pipeline/generate_data.py
.venv/bin/python pipeline/train_backtest.py
.venv/bin/python pipeline/export.py
.venv/bin/pytest -q

cd app && npm ci && npm test && npm run build`}</pre>
        <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>CI on GitHub Actions runs pytest, the typecheck, the Node tests and the build on every push, and can re-run the pipeline on demand. Source: <a href="https://github.com/ankitmishra01/harbourline-demand-planner">github.com/ankitmishra01/harbourline-demand-planner</a>.</p>
      </div>

      <div className="eyebrow">What this means for a client engagement</div>
      <div className="grid2">
        <div className="card t-teal">
          <h3>What gets cheaper</h3>
          <ul className="clean" style={{ fontSize: 13 }}>
            <li><strong>Prototypes.</strong> A working screen in front of planners in week 1, not a slide of one.</li>
            <li><strong>Test coverage.</strong> Invariants stated in a sentence become tests the same hour.</li>
            <li><strong>Documentation.</strong> The README, the About page and this page were drafted alongside the code.</li>
            <li><strong>Design consistency.</strong> With tokens in place, every generated page lands on brand.</li>
          </ul>
        </div>
        <div className="card t-violet">
          <h3>What does not</h3>
          <ul className="clean" style={{ fontSize: 13 }}>
            <li><strong>Stakeholder interviews.</strong> Planners, merchandising and finance still have to be heard.</li>
            <li><strong>Data access.</strong> Week 1 still depends on the grocer delivering 24 months of sales, stock and promotions.</li>
            <li><strong>Choosing thresholds.</strong> Someone accountable has to say how much error is acceptable and live with it.</li>
            <li><strong>Change management.</strong> Shadow mode and champions take calendar weeks, whatever the tooling.</li>
            <li><strong>The go/no-go decision.</strong> A model can inform it; a sponsor has to make it.</li>
          </ul>
        </div>
      </div>
      <div className="card dark"><strong className="y">In one line:</strong> the tools made the build cheap enough that all the time went where it belongs, on the decisions a client has to own.</div>
    </Shell>
  );
}
