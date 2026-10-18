import Link from "next/link";
import Shell from "@/components/Shell";
import Journey from "@/components/Journey";

const PACK: [string, string, string, string][] = [
  ["Value tree and prioritised use-case list", "Which decisions the forecast changes, and in what order we build for them.", "Strategist", "Week 1"],
  ["Data contract", "Which feeds, at what grain, from which system, owned by whom.", "Data owner and strategist", "Week 1"],
  ["Data quality report", "What the joins, gaps and anomalies look like, and what we cut because of them.", "Data science lead", "Week 3"],
  ["Model comparison with dollar scoring", "Which model wins on lost margin, waste and carrying cost, not on a statistic.", "Data science lead", "Week 5"],
  ["Target architecture and integration design", "Where forecasts are computed, where orders are written, and what runs overnight.", "Solution architect", "Week 5"],
  ["Security and access design", "Residency, encryption, roles and the scoped service account that writes orders.", "Harbourline IT security", "Week 5"],
  ["Business case and go/no-go", "Whether the measured levers clear $0.70M a year in the low case.", "Strategist and SVP BI and Finance", "Week 7"],
  ["Pilot plan and acceptance criteria", "Which stores, which categories, what counts as passing shadow mode.", "Harbourline product owner", "Week 7"],
  ["Planner adoption plan", "How planners move from approving every line to supervising a system.", "Harbourline product owner", "Week 7"],
];

const FEEDS: [string, string, string, string, string][] = [
  ["Sales", "Item x store x day", "24 months", "POS", "Store operations"],
  ["Stock on hand and on order", "Item x store x day", "24 months", "Ordering system", "Supply chain"],
  ["Out-of-stock or zero-scan flags", "Item x store x day", "As available", "Ordering system", "Supply chain"],
  ["Promotions and prices", "Item x week", "24 months", "Merchandising", "Merchandising"],
  ["Product master", "Item", "Current", "Master data", "Master data team"],
  ["Store master", "Store", "Current", "Master data", "Master data team"],
  ["Supplier lead times and case packs", "Item x supplier", "Current", "Procurement", "Procurement"],
  ["Deliveries and receipts", "PO x day", "24 months", "Ordering system", "Supply chain"],
];

const CRITERIA: [string, string, string, string][] = [
  ["Week 2", "Can lost demand be recovered from stock records?", "The uplift estimate on known stockout days falls inside the band agreed with merchandising in week 1.", "Restrict the pilot to the categories where it can, and say so in the data quality report."],
  ["Week 5", "Does a model beat the baseline?", "The selected model's 12-week dollar cost is at least 10% below same-week-last-year, and bias is within ± 5%.", "Stop. Report what we found. No pilot."],
  ["Week 7", "Does the business case clear?", "The measured levers, applied to the chain, exceed $0.70M a year in the low case.", "Stop. The discovery report is the deliverable."],
  ["Pilot exit", "Is the system ready to order for real?", "Shadow-mode accuracy holds for 4 consecutive weeks and planners accept at least 85% of suggestions without change.", "Extend shadow mode, or drop the categories that are not holding."],
];

export default function Handoff() {
  return (
    <Shell>
      <Journey here="discovery" />
      <h1>What engineering receives at the end of discovery</h1>
      <p className="takeaway">The handoff is a document set, not a meeting. Every artifact below has an owner, a due week and a question it must answer before the pilot team can start.</p>
      <p className="lede">The <Link href="/plan/">Delivery plan</Link> covers the timeline and risks. This page covers the contents: what crosses the table, what the data contract asks for in week 1, how the pieces connect, and what each checkpoint has to show.</p>

      <div className="eyebrow">The handoff pack</div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead><tr><th>Artifact</th><th>What it answers</th><th>Owner</th><th>Ready by</th></tr></thead>
          <tbody>
            {PACK.map(([a, q, o, w]) => (
              <tr key={a}>
                <td><strong>{a === "Planner adoption plan" ? <Link href="/enablement/">{a}</Link> : a}</strong></td>
                <td>{q}</td>
                <td className="muted">{o}</td>
                <td style={{ whiteSpace: "nowrap" }}>{w}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="eyebrow">Data contract</div>
      <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}>
        <div className="card" style={{ padding: 0, overflow: "auto", marginBottom: 0 }}>
          <table>
            <thead><tr><th>Feed</th><th>Grain</th><th>History</th><th>Source system</th><th>Owner</th></tr></thead>
            <tbody>
              {FEEDS.map(([f, g, h, s, o]) => (
                <tr key={f}><td><strong>{f}</strong></td><td>{g}</td><td>{h}</td><td>{s}</td><td className="muted">{o}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card t-teal" style={{ marginBottom: 0 }}>
          <h3>Quality rules we check before modelling</h3>
          <ul className="clean" style={{ fontSize: 13 }}>
            <li>Join rate between sales and the product and store masters is 99% or higher.</li>
            <li>No store has more than 2% of days missing from the sales feed.</li>
            <li>Promotion start and end dates line up with flyer weeks.</li>
            <li>The case pack divides historical order quantities for the item.</li>
            <li>Lead times fall inside the ranges in the supplier contract.</li>
          </ul>
          <p style={{ fontSize: 13, marginBottom: 0 }}><strong>If a rule fails:</strong> we do not patch around it. We start with fewer stores or fewer categories, the ones where the rule holds, and write the gap into the data quality report. That is the week 2 decision, and it is made with the data owner in the room.</p>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Every feed arrives as a nightly read-only extract to a Canadian cloud region. Nothing in the contract asks Harbourline to change a source system.</p>

      <div className="eyebrow">Architecture sketch</div>
      <div className="steps n6">
        <div><span className="n">1</span><span>Nightly feeds<br /><span className="muted" style={{ fontWeight: 400 }}>sales, stock, promotions, receipts</span></span></div>
        <div><span className="n">2</span><span>Feature store and forecasts<br /><span className="muted" style={{ fontWeight: 400 }}>P50 and error per item and store</span></span></div>
        <div><span className="n">3</span><span>Order suggestion service<br /><span className="muted" style={{ fontWeight: 400 }}>safety stock, case packs, open-to-buy</span></span></div>
        <div><span className="n">4</span><span>Planner app<br /><span className="muted" style={{ fontWeight: 400 }}>exceptions first, reasons logged</span></span></div>
        <div><span className="n">5</span><span>Ordering / ERP write-back<br /><span className="muted" style={{ fontWeight: 400 }}>API or EDI 850; 855 and 856 close the loop</span></span></div>
        <div><span className="n">6</span><span>Monitoring and evidence<br /><span style={{ fontWeight: 400, color: "#C2CDD2" }}>accuracy, bias, overrides, autonomy table</span></span></div>
      </div>
      <div className="grid2">
        <div className="card">
          <h3>What is batch, what is live</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Boxes 1 to 3 run once a night: feeds land, features are rebuilt, forecasts and suggested orders are written for every item and store before planners arrive. The planner app in box 4 is live only in the sense that approvals and overrides are saved as they happen.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}>Box 5 runs at each category&apos;s order cut-off. The EDI 855 acknowledgement and 856 ship notice arrive on the supplier&apos;s schedule and are picked up by the next nightly run, where goods receipts update stock on hand. Box 6 recomputes the autonomy table weekly.</p>
        </div>
        <div className="card">
          <h3>What writes, what reads</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Only the order suggestion service writes to Harbourline&apos;s ordering system, and it does so through a named service account scoped per store and category to the autonomy level that category has earned. At L1 and L2 the account writes only what a planner approved. At L3 it writes the category&apos;s orders itself, with a veto window before the cut-off.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}>Everything else reads. Every order the account writes is logged with its reasoning and can be reversed. IT and the data owners sign off on this design at weeks 5 and 7, before any pilot store goes live. Details on the <Link href="/security/">Data and security</Link> page.</p>
        </div>
      </div>

      <div className="eyebrow">Acceptance criteria per checkpoint</div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead><tr><th>Checkpoint</th><th>Question</th><th>Pass if</th><th>Fail means</th></tr></thead>
          <tbody>
            {CRITERIA.map(([c, q, p, f], i) => (
              <tr key={c}>
                <td style={{ whiteSpace: "nowrap" }}>{i < 3 && <span className="dot">{i + 1}</span>}<strong>{c}</strong></td>
                <td>{q}</td>
                <td>{p}</td>
                <td className="muted">{f}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>The bars are written down before the work starts. In the prototype backtest, 424 of 2,720 item-store lines (15.6%) need review in a typical week and the base case comes to $1.06M a year; discovery replaces both with Harbourline&apos;s own numbers.</p>

      <div className="eyebrow">In and out of the pilot</div>
      <div className="grid2">
        <div className="card t-teal">
          <h3>In</h3>
          <ul className="clean" style={{ fontSize: 13 }}>
            <li>20 to 30 stores, chosen with similar stores held back as a comparison group.</li>
            <li>Weekly ordering for ambient categories, daily ordering for fresh.</li>
            <li>Markdown and flyer suggestions, each accepted or dismissed by a planner.</li>
            <li>One purchase order per supplier per store per cycle.</li>
            <li>Shadow mode for 4 to 6 weeks before any order is written for real.</li>
          </ul>
        </div>
        <div className="card t-orange">
          <h3>Out</h3>
          <ul className="clean" style={{ fontSize: 13 }}>
            <li>Shelf layout and planogram changes. Use case 2 needs a trusted demand signal first.</li>
            <li>Assortment changes: which items a store carries.</li>
            <li>Price changes. The system suggests markdowns; a planner sets them.</li>
            <li>Autonomous ordering for fresh. Fresh categories stay at L2 through the pilot.</li>
            <li>Any store outside the pilot, including read-only access to its data.</li>
          </ul>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Scope costs: discovery $0.175M, pilot $0.45M, rollout to all 300 stores $0.60M, then $0.25M a year to run. Each step is funded only after the one before it passes.</p>

      <div className="card dark"><strong className="y">Definition of done for discovery:</strong> all nine artifacts are signed by their owners, the three checkpoints have a recorded pass, and the pilot team can start on Monday without asking a question that is not already answered in the pack.</div>
    </Shell>
  );
}
