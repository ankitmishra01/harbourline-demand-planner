import Shell from "@/components/Shell";
import Journey from "@/components/Journey";

const MORNING: [string, string][] = [
  ["6:30, opens the ordering system. It shows last week’s sales and this morning’s stock, item by item.", "No forecast on the screen. Only history."],
  ["Scrolls all 136 items in the category, twenty to a page.", "Every item gets the same attention, whether it sells 400 units a week or 4."],
  ["Checks the paper flyer for next week’s promotions and tries to recall how last year’s deal sold.", "Promotion lift lives in memory, not in the system."],
  ["Phones the distribution centre about Tuesday’s short delivery.", "Twenty minutes on hold. The answer never reaches the order screen."],
  ["Guesses case quantities from same week last year, adjusted for a feel of the weather.", "The guess is unrecorded, so nobody can learn from it."],
  ["Overrides the system minimum on 30 or so items.", "No reason is captured. The same overrides recur every week."],
  ["Submits by the 9:00 cut-off, then walks the floor to see what ran out yesterday.", "The empty shelf is found after the order is placed, not before."],
  ["The same morning repeats across 20 pilot stores: 2,720 item-store lines a week.", "This week 424 of them (15.6%) need a person. The other 2,296 are routine."],
];

const HEARD: [string, string][] = [
  ["Store planner", "I know my store. The system knows last year. Neither of us knows what Thursday’s weather will do to bagged salad."],
  ["Category manager", "Every planner orders a promotion differently. I find out who guessed right when the markdowns show up."],
  ["DC supervisor", "Stores order in waves. Monday is a flood, Wednesday is quiet, and I staff for the flood."],
  ["Finance", "Waste is about 1.5% of sales at cost and nobody owns it. It sits between the store, the category and the DC."],
  ["IT", "We have 24 months of sales and stock in the ordering system. Nobody has asked for it in one table before."],
];

const USE_CASES: [string, string, string, string, string, string, string][] = [
  ["Store replenishment", "2,720 item-store lines every week", "Store planner", "$0.7M to $1.1M a year (base case $1.06M)", "Yes: 24 months of sales, stock and promotions", "High", "None. First pick."],
  ["Fresh markdowns", "Daily, per fresh item near the end of its shelf life", "Store planner, department lead", "$0.2M to $0.4M a year", "Partial: spoilage logged, price changes are not", "Med", "Rides on the replenishment forecast"],
  ["Promotion forecasting", "Weekly flyer, about 30 items", "Category manager", "$0.3M to $0.5M a year", "Partial: flyer history, no lift by store", "Med", "Rides on the same forecast plus flyer data"],
  ["Labour scheduling", "Weekly, per store", "Store manager", "$0.3M to $0.6M a year", "Partial: hours and sales, no footfall", "Low", "Collective agreement rules, separate system"],
  ["Assortment and space", "Twice a year, per category", "Merchandising", "Hard to size before a forecast exists", "No: no planogram history", "Low", "Needs a trusted demand signal first"],
  ["Supplier lead-time risk", "Per order, per supplier", "DC buyer", "Qualitative: fewer short deliveries", "Partial: receipts, no promised dates", "Low", "Supplier data sharing"],
];

const BUILD_BUY: [string, string, string, string, string][] = [
  ["Buy a replenishment suite (RELEX, Blue Yonder, Afresh-type tools)", "Full feature set: forecasting, ordering, promotions, fresh, truck fill", "9 to 18 months", "Licence plus integration; sized to 300 stores from day one", "Strong if the data is already clean and the budget is already there"],
  ["Build a pilot like this one", "A narrow forecast and order screen for 20 stores, with the ladder and the checkpoints", "7 weeks to a decision; pilot after", "People cost only: $0.175M discovery, $0.45M pilot, $0.60M rollout", "Right while the question is still: will this work for us?"],
  ["Do nothing", "Same-week-last-year ordering, as today", "None", "No new spend", "The cost is the go/no-go line, $0.70M a year, every year"],
];

const ELSEWHERE: [string, string, string][] = [
  ["Insurance claims triage", "Made thousands of times a day. A model that beats the current routing rule sends routine claims straight through and the odd ones to an adjuster.", "What changes: the unit is a claim, not an item-store line, and autonomy is earned per claim type. What stays: the discovery, the checkpoints, the ladder."],
  ["Content operations in media", "Which stories to localise or promote, and when. Today an editor decides from instinct and yesterday’s traffic.", "What changes: the forecast is attention, not demand. What stays: shadow mode first, then exceptions only, then autonomy with a veto."],
  ["Collections and credit limits", "Who to call, when, and how much credit to extend. A model beats the scorecard or it does not.", "What changes: the dollar line is written in losses avoided. What stays: a go/no-go number agreed before the work starts, and three places to stop."],
];

export default function Discovery() {
  return (
    <Shell>
      <Journey here="discovery" />
      <h1>How we chose where to start</h1>
      <p className="takeaway">Replenishment won because it is the decision Harbourline makes most often, costs the most when it is wrong, and already has 24 months of data behind it.</p>
      <p className="lede">Discovery is a search for the decision that is made most often, costs the most when wrong, and has data behind it. At Harbourline Foods that meant two weeks beside store planners, interviews across five functions and a scan of six candidate use cases. This page shows the working, so the choice can be challenged before money is spent.</p>

      <div className="eyebrow">A planner&apos;s morning today</div>
      <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}>
        <div className="card">
          <h3>Eight steps, eight points of friction</h3>
          <ol style={{ paddingLeft: 0, listStyle: "none", margin: 0, fontSize: 13 }}>
            {MORNING.map(([step, friction], i) => (
              <li key={i} style={{ display: "grid", gridTemplateColumns: "20px minmax(0, 1fr)", gap: "0 8px", padding: "8px 0", borderBottom: i < MORNING.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span className="dot">{i + 1}</span>
                <div>
                  <span>{step}</span>
                  <div style={{ color: "var(--orange)", fontSize: 12, marginTop: 2 }}>Friction: {friction}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="card dark">
          <div className="eyebrow" style={{ marginTop: 0 }}>What we heard</div>
          {HEARD.map(([role, quote]) => (
            <p key={role} style={{ margin: "0 0 12px", fontSize: 14 }}>
              <span>“{quote}”</span>
              <br /><span className="muted" style={{ fontSize: 12 }}>{role}</span>
            </p>
          ))}
          <p className="muted" style={{ fontSize: 12, margin: 0, borderTop: "1px solid rgba(246, 247, 241, .2)", paddingTop: 10 }}>Illustrative composite quotes written for this prototype, not real people.</p>
        </div>
      </div>

      <div className="eyebrow">Six places AI could help</div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Same six questions for every candidate. Value ranges are planning estimates for a $200M chain.</p>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Use case</th><th>Decision made how often</th><th>Who decides</th><th>Value if improved</th><th>Data available today</th><th>Feasibility in 7 weeks</th><th>Dependency</th>
            </tr>
          </thead>
          <tbody>
            {USE_CASES.map(([name, freq, who, value, data, feas, dep], i) => (
              <tr key={name} style={i === 0 ? { background: "var(--accent-soft)" } : undefined}>
                <td><strong>{name}</strong>{i === 0 && <div style={{ fontSize: 11, color: "var(--accent-text)", fontWeight: 600 }}>First pick</div>}{i === 1 && <div className="muted" style={{ fontSize: 11 }}>Natural second</div>}{i === 2 && <div className="muted" style={{ fontSize: 11 }}>Third</div>}</td>
                <td>{freq}</td><td>{who}</td><td>{value}</td><td>{data}</td>
                <td><span style={{ fontWeight: 600, color: feas === "High" ? "var(--teal)" : feas === "Med" ? "var(--amber)" : "var(--muted)" }}>{feas}</span></td>
                <td>{dep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="eyebrow">Why replenishment first</div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>On a grid of value against feasibility in seven weeks, replenishment sits alone in the top right. Markdowns and promotions follow once a forecast exists.</p>
      <div className="grid3">
        <div className="card t-teal">
          <h3>Highest frequency decision</h3>
          <p style={{ fontSize: 13, margin: 0 }}>136 items, 20 stores, every week. A small gain per line compounds across 2,720 lines a week, and across 300 stores if it works.</p>
        </div>
        <div className="card t-violet">
          <h3>Data already exists</h3>
          <p style={{ fontSize: 13, margin: 0 }}>24 months of sales, stock and promotions sit in the ordering system. No new sensors, no new forms. The open question is quality, which the week 2 checkpoint tests.</p>
        </div>
        <div className="card t-orange">
          <h3>Reuses for the next two use cases</h3>
          <p style={{ fontSize: 13, margin: 0 }}>Markdowns and promotion forecasting ride on the same forecast. Build it once and the next two use cases start from a working signal, not from zero.</p>
        </div>
      </div>
      <div className="callout">
        <strong>The hypothesis:</strong> if a forecast that beats same-week-last-year is turned into a reviewed order, the chain earns at least $0.70M a year from fewer empty shelves, less waste and less stock. The 7-week discovery exists to test that sentence, with three places to stop: week 2 (can we tell lost demand from empty shelves), week 5 (does a model beat the baseline) and week 7 (do the numbers justify going ahead).
      </div>

      <div className="eyebrow">What we deliberately did not start with</div>
      <div className="grid2">
        <div className="card peach">
          <h3>Shelf layout and assortment</h3>
          <p style={{ fontSize: 13, margin: 0 }}>Merchandising asked for it first. But a planogram built on a bad demand signal moves the wrong products to eye level. It needs a trusted forecast first.</p>
        </div>
        <div className="card lav">
          <h3>Autonomous ordering on day one</h3>
          <p style={{ fontSize: 13, margin: 0 }}>Trust has to be earned, per category, from evidence. The autonomy ladder on the planner page is the answer: every line, then exceptions only, then orders with a veto.</p>
        </div>
      </div>

      <div className="eyebrow">Build or buy</div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Option</th><th>What you get</th><th>Time to first value</th><th>Typical cost shape</th><th>Fit for a 300-store grocer</th></tr>
          </thead>
          <tbody>
            {BUILD_BUY.map(([opt, get, time, cost, fit]) => (
              <tr key={opt}><td><strong>{opt}</strong></td><td>{get}</td><td>{time}</td><td>{cost}</td><td>{fit}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="callout">
        <strong>Recommendation:</strong> run the 7-week discovery first. Buy if the pilot proves the value and the integration surface is standard; a proven number makes the licence conversation short. Keep building only if the category mix or the ordering system is unusual. Two things would flip this early: an existing vendor contract that already covers forecasting, or data that cannot be cleaned in week 1.
      </div>

      <div className="eyebrow">Where else this pattern applies</div>
      <div className="grid3">
        {ELSEWHERE.map(([title, what, same]) => (
          <div key={title} className="card">
            <h3>{title}</h3>
            <p style={{ fontSize: 13, marginTop: 0 }}>{what}</p>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>{same}</p>
          </div>
        ))}
      </div>

      <div className="card dark" style={{ marginTop: 16 }}><strong className="y">Decision at the end of discovery:</strong> go to a 20-store pilot only if a model beats same-week-last-year at week 5 and the week 7 business case clears $0.70M a year; otherwise stop, publish the data quality report, and pick the next use case from this table.</div>
    </Shell>
  );
}
