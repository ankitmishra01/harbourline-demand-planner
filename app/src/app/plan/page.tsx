import Shell from "@/components/Shell";
import Journey from "@/components/Journey";

const WORK: [string, number, number, string][] = [
  ["Mobilise and value tree", 1, 1, "var(--blue)"], ["Data audit", 2, 2, "var(--blue)"], ["Process and user audit", 3, 2, "var(--blue)"],
  ["Modelling experiments", 4, 3, "var(--yellow)"], ["Architecture", 5, 2, "var(--yellow)"], ["Business case and roadmap", 6, 2, "var(--ink)"],
];
const RISKS: [string, string, string, string][] = [
  ["Empty shelves look like zero demand", "Use stock records to estimate lost sales; test at the week 2 checkpoint.", "Data science lead", "peach"],
  ["Planners do not use the forecast", "Design the screen with them; track and learn from overrides. In this prototype every override needs a reason and is logged.", "Harbourline product owner", "peach"],
  ["Real profit is below the $0.70M a year break-even", "Re-check at week 7; stop if it does not clear.", "SVP BI and Finance", "peach"],
  ["Messy data: store and product codes do not match", "Check the joins in week 1; start with fewer stores or categories.", "Harbourline data owner", "lav"],
  ["Promotions and new products confuse the model", "Add promotion data; borrow patterns from similar products.", "Data science lead and Harbourline merchandising", "lav"],
  ["Data security as the platform scales to 300 stores", "Canadian data residency, encryption, role-based access and monitoring, plus scoped write access to the ordering system, signed off at weeks 5 and 7 before any pilot store goes live.", "Harbourline IT security and the delivery team", "lav"],
];

export default function Plan() {
  return (
    <Shell>
      <Journey here="discovery" />
      <h1>A better forecast tells each store how much to order</h1>
      <p className="takeaway">Seven weeks to find out, with three checkpoints where we can stop; then a pilot that earns trust before any store is ordered for automatically.</p>
      <div className="eyebrow">Every store, every product, every day</div>
      <div className="grid3">
        <div className="card peach"><strong>Order too little</strong><p className="muted" style={{ margin: "4px 0 0" }}>Empty shelf, lost sale, unhappy customer.</p></div>
        <div className="card dark"><strong className="y" style={{ color: "var(--teal-brand)" }}>The right amount</strong><p className="muted" style={{ margin: "4px 0 0" }}>What a better forecast aims for, store by store.</p></div>
        <div className="card" style={{ background: "#FBEBCF", borderColor: "transparent" }}><strong>Order too much</strong><p className="muted" style={{ margin: "4px 0 0" }}>Food spoils, gets marked down, cash sits in stock.</p></div>
      </div>
      <div className="eyebrow">What we would build</div>
      <div className="steps">
        <div><span className="n">1</span>Look at past sales, promotions and holidays</div>
        <div><span className="n">2</span>Predict demand for each store and product</div>
        <div><span className="n">3</span>Tell planners what to order</div>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>This prototype shows all three on synthetic data: 24 months of history (step 1), forecasts for every store and product (step 2), and the planner&apos;s order screen (step 3). Use case 2, shelf layout, comes next: it needs a trusted demand signal first.</p>

      <h2 style={{ marginTop: 24, fontSize: 20 }}>Seven weeks, three checkpoints</h2>
      <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "150px repeat(7, 1fr)", gap: 4, fontSize: 12, alignItems: "center" }}>
            <span className="muted">Phase</span>
            <span style={{ gridColumn: "span 3", background: "var(--pastel-blue)", padding: "2px 6px", fontWeight: 700 }}>Understand · W1 to W3</span>
            <span style={{ gridColumn: "span 3", background: "var(--yellow)", padding: "2px 6px", fontWeight: 700 }}>Test and design · W4 to W6</span>
            <span style={{ background: "var(--ink)", color: "#fff", padding: "2px 6px", fontWeight: 700 }}>Decide</span>
            <span />{[1, 2, 3, 4, 5, 6, 7].map((w) => <span key={w} className="muted" style={{ textAlign: "center" }}>W{w}</span>)}
            {WORK.map(([name, start, len, color]) => (<div key={name} style={{ display: "contents" }}>
              <span>{name}</span>
              {start > 1 && <span style={{ gridColumn: `span ${start - 1}` }} />}
              <span style={{ gridColumn: `span ${len}`, background: color, height: 12 }} />
              {start + len - 1 < 7 && <span style={{ gridColumn: `span ${7 - (start + len - 1)}` }} />}
            </div>))}
            <span>Checkpoints</span>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => <span key={w} style={{ textAlign: "center" }}>{w === 2 ? <span className="dot">1</span> : w === 5 ? <span className="dot">2</span> : w === 7 ? <span className="dot">3</span> : null}</span>)}
          </div>
        </div>
        <div className="card peach">
          <div className="eyebrow" style={{ marginTop: 0 }}>The three checkpoints</div>
          <p style={{ margin: "4px 0" }}><span className="dot">1</span><strong>Week 2:</strong> can we tell lost demand from empty shelves?</p>
          <p style={{ margin: "4px 0" }}><span className="dot">2</span><strong>Week 5:</strong> does a model beat the baseline? <span className="muted">(the Model comparison page)</span></p>
          <p style={{ margin: "4px 0" }}><span className="dot">3</span><strong>Week 7:</strong> do the numbers justify going ahead? <span className="muted">(the Business case page)</span></p>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>About 21 team-weeks. Planning estimate, not a rate card. Assumes data access in week 1.</p>
        </div>
      </div>
      <div className="card" style={{ background: "var(--pastel-mint)", borderColor: "transparent" }}><strong>By week 7, Harbourline gets:</strong> a validated business case · a data quality report · a target IT architecture · a PoC plan. <span className="muted">Needed from Harbourline in week 1: 24 months of sales by store and product; stock levels and out-of-stock records; promotions, prices and supplier lead times; 3 to 5 hours a week from planners.</span></div>

      <h2 style={{ marginTop: 24, fontSize: 20 }}>Six risks, and what we do about each</h2>
      <p className="muted" style={{ marginTop: 0 }}>Five delivery risks common to forecasting programmes, plus data security as the sixth. A failed checkpoint is a result, not a failure: we say so and fix the data rather than force a model.</p>
      <div className="eyebrow">The biggest three</div>
      <div className="grid3">{RISKS.slice(0, 3).map(([t, d, o, c], i) => <div key={t} className={`card t-orange ${c}`}><span className="dot" style={{ background: "var(--ink)" }}>{i + 1}</span><strong>{t}</strong><p style={{ fontSize: 13 }}>{d}</p><div className="muted" style={{ fontSize: 12 }}><strong>Owner:</strong> {o}</div></div>)}</div>
      <div className="eyebrow">Also watched</div>
      <div className="grid3">{RISKS.slice(3).map(([t, d, o, c]) => <div key={t} className={`card t-violet ${c}`}><strong>{t}</strong><p style={{ fontSize: 13 }}>{d}</p><div className="muted" style={{ fontSize: 12 }}><strong>Owner:</strong> {o}</div></div>)}</div>

      <h2 style={{ marginTop: 24, fontSize: 20 }}>After discovery: prove the value, then earn adoption</h2>
      <div className="grid2">
        <div className="card t-teal">
          <h3>Prove the value</h3>
          <ul className="clean">
            <li><strong>Pilot:</strong> 20 to 30 stores, compared with similar stores that do not use it.</li>
            <li><strong>Track four things:</strong> forecast accuracy, stockouts and waste, profit and cash, planner usage. The planner screen&apos;s KPI strip shows the first two per store.</li>
            <li><strong>Watch for drift:</strong> agreed limits on accuracy, running cost and data quality; a breach triggers retraining or rollback.</li>
            <li><strong>Review quarterly</strong> with Finance against this business case.</li>
          </ul>
        </div>
        <div className="card t-orange">
          <h3>Get people to use it</h3>
          <ul className="clean">
            <li><strong>Co-design:</strong> planners help build it from week 3.</li>
            <li><strong>Shadow mode:</strong> run it 4 to 6 weeks without changing orders.</li>
            <li><strong>Show only what needs a decision, with the reason why.</strong> The planner screen sorts exceptions first and auto-approves the rest.</li>
            <li><strong>Champions:</strong> one per region; learn from every override, which is why each override carries a reason code.</li>
          </ul>
        </div>
      </div>
      <h2 style={{ marginTop: 24, fontSize: 20 }}>How it connects, and how autonomy is earned</h2>
      <p className="muted" style={{ marginTop: 0 }}>Approved orders do not stay on a screen. The planner app posts them to Harbourline&apos;s ordering system and the supplier replies close the loop; the same feeds bring tomorrow&apos;s stock and sales back into the forecast. The prototype simulates this loop (the Send orders card on the planner page); the architecture work in week 5 specifies the real one. EDI 850, 855 and 856 are the standard electronic messages retailers and suppliers already exchange: the purchase order, its acknowledgement and the advance ship notice.</p>
      <div className="steps n6">
        <div><span className="n">1</span><span>Planner app<br /><span className="muted" style={{ fontWeight: 400 }}>review by exception, send</span></span></div>
        <div><span className="n">2</span><span>Harbourline ordering / ERP<br /><span className="muted" style={{ fontWeight: 400 }}>API or EDI 850 purchase order</span></span></div>
        <div><span className="n">3</span><span>Supplier acknowledges<br /><span className="muted" style={{ fontWeight: 400 }}>EDI 855, quantities confirmed</span></span></div>
        <div><span className="n">4</span><span>Ship notice<br /><span className="muted" style={{ fontWeight: 400 }}>EDI 856, what is on the truck</span></span></div>
        <div><span className="n">5</span><span>Goods receipt at store<br /><span className="muted" style={{ fontWeight: 400 }}>stock on hand updated</span></span></div>
        <div><span className="n">6</span><span>Nightly feed back<br /><span style={{ fontWeight: 400, color: "#C2CDD2" }}>sales, stock, waste → forecast</span></span></div>
      </div>
      <div className="grid2">
        <div className="card t-teal">
          <h3>The autonomy ladder</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Trust is earned per category, from evidence, and can be lost.</p>
          <ul className="clean" style={{ fontSize: 13 }}>
            <li><span className="lvl L1">L1</span> <strong>Planner approves every line.</strong> Shadow mode and the first pilot weeks.</li>
            <li><span className="lvl L2">L2</span> <strong>Exceptions only.</strong> Items that pass every rule are auto-approved; the planner decides the rest. The planner page runs here.</li>
            <li><span className="lvl L3">L3</span> <strong>Autonomous replenishment with veto.</strong> The agent writes the category&apos;s orders itself and the planner can veto before the cut-off.</li>
          </ul>
          <p style={{ fontSize: 13 }}><strong>Up (L2 → L3):</strong> eight consecutive weeks inside the category class&apos;s thresholds (ambient: WAPE ≤ 35%, bias ± 5%, overrides ≤ 5% of lines, stockouts ≤ 10% of lines; fresh: WAPE ≤ 40%, stockouts ≤ 30%), with the accuracy bar confirmed at the week 5 checkpoint. <strong>Down (L3 → L2):</strong> any threshold broken two weeks running. Fresh categories stay at L2 through the pilot.</p>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>On the planner page the ladder is computed from the 12-week backtest: every category sits at L2 today; Pantry earned L3 in week 8 and lost it in week 12 when bias and stockouts broke the limits two weeks running. That is the mechanism working, not a failure.</p>
        </div>
        <div className="card t-orange">
          <h3>What the agent does at L3</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Each order cycle it checks, in this order, before it writes anything:</p>
          <ol style={{ fontSize: 13, paddingLeft: 18, margin: "0 0 8px" }}>
            <li><strong>Inventory position:</strong> on hand, on order, projected spoilage, days of supply against lead time.</li>
            <li><strong>Stock constraints:</strong> case packs, shelf capacity, minimum orders, delivery schedule.</li>
            <li><strong>Cash:</strong> the store&apos;s open-to-buy (cost of expected sales plus 10% in the prototype; set by Finance in production).</li>
            <li><strong>Supplier constraints:</strong> lead times, cut-off times, allocation limits.</li>
            <li><strong>Ordering system acknowledgement:</strong> the 855 confirms what was accepted; gaps become exceptions.</li>
          </ol>
          <p style={{ fontSize: 13 }}>Then it writes the order, logs its reasoning line by line, and posts a summary with a veto window. It also proposes markdowns on stock that will outlast its shelf life and flyer candidates where cover is long or last year&apos;s lift was strong; a planner accepts or dismisses each one, and the agent never changes a price or a planogram itself.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}><strong>Objective:</strong> in-stock at or above target, waste at or below target, spend inside open-to-buy. <strong>Governance:</strong> the week 5 checkpoint sets the accuracy bar, the week 7 checkpoint approves the integration design, and write access to the ordering system is part of the sixth risk&apos;s security sign-off: a named service account, scoped per store and category to the level earned, with every order it writes logged and reversible.</p>
        </div>
      </div>
      <div className="card dark"><strong className="y">Decision today:</strong> approve the 7-week discovery phase and name your sponsor, product owner and data owners. Go further only if profit clears $0.70M a year.</div>
    </Shell>
  );
}
