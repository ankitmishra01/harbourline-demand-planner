import Link from "next/link";
import Shell from "@/components/Shell";
import Journey from "@/components/Journey";

const WEEKS: [string, string, string, string, string][] = [
  ["Weeks 1 to 2", "L1", "Review every line. Suggestions sit alongside the planner's own order; nothing is sent.", "Agreement rate between planner and suggestion; time per store.", "Nothing yet. The point is to watch."],
  ["Weeks 3 to 4", "L1", "Still every line, now with a reason code on every override. Champions coach on the codes.", "Override rate by category; reason mix; time per store.", "Reason codes become mandatory. First override review in the week 4 huddle."],
  ["Weeks 5 to 6", "L2", "Exceptions only for categories that pass. Lines that pass every rule are auto-approved; the planner decides the rest.", "Time per store, which should halve; stockouts and waste on reviewed lines against comparison stores.", "Categories that pass move to L2; the category manager confirms each move."],
  ["Weeks 7 onward", "L2 / L3", "Ambient categories with 8 passing weeks go to L3 with veto. Fresh stays at L2.", "Veto rate at L3; threshold misses; planner requests to move a category up.", "One miss holds L3. Two in a row drops the category to L2, and the huddle says so."],
];

const LADDER: [string, string, string, string, string, string][] = [
  ["L1", "Planner approves every line", "Every item for the store, with the suggestion, forecast and days of supply.", "Approve, change or skip each line, with a reason on every change.", "About 40 minutes a store.", "Promoted once the category passes its thresholds for the weeks agreed at kickoff."],
  ["L2", "Exceptions only", "The 15% to 20% of lines where a rule fired, High first, then fewest days of supply.", "Work the exceptions; spot-check a few auto-approved lines.", "About 15 minutes a store.", "Promoted to L3 after 8 passing weeks in a row. Two misses in a row at L3 come back here."],
  ["L3", "Autonomous with veto", "A morning summary: what the system ordered, why, and the lines it flagged, with a veto window before cut-off.", "Read, veto what looks wrong, record the reason. A veto is logged as an override.", "About 5 minutes a store for the veto review.", "One miss holds L3; two in a row drops to L2. Fresh cannot reach L3 in the pilot."],
];

const REASONS: [string, string][] = [
  ["Promo", "A promotion the feed did not carry, or one the model under-weighted. The promotion data gets corrected and the lift re-learned."],
  ["Local event", "A festival, a school holiday, a nearby store closure. Repeated use at one store argues for a store-level event calendar."],
  ["Weather", "A heat wave or storm the regional normal missed. Tells us whether a short-range weather feed is worth paying for."],
  ["Display", "An end cap or secondary location that lifts sales without a price change. Points to a display calendar the model cannot see."],
  ["Count wrong", "On hand is not what the system thinks. The fix is a cycle count, not a model change."],
  ["Other", "Free text, reviewed weekly. Anything that appears three times becomes a code or a rule."],
];

const SIGNALS: [string, string, string][] = [
  ["Suggestions accepted without change", "85% or higher", "The pilot exit criterion. Below it, the model or the trust is not ready."],
  ["Override reason given on changes", "100%", "Overrides without reasons teach the model nothing, and IT needs the audit trail complete."],
  ["Time per store from L1 to L2", "Down 60%", "The planner's own return on the system. If time does not fall, exceptions are set too wide."],
  ["Stockouts on reviewed lines", "Not worse than before", "Faster must not mean emptier shelves. Measured weekly against comparison stores."],
  ["Planners asking for categories to move up", "Qualitative", "The clearest sign of trust: a planner who asks for L3 on Pantry has read the table and believes it."],
];

export default function Enablement() {
  return (
    <Shell>
      <Journey here="pilot" />
      <h1>How planners move from approving every line to supervising a system</h1>
      <p className="takeaway">Adoption is designed into the screen, not trained in afterwards. The order list shows only what needs a decision, every override carries a reason, and the autonomy table tells each category manager what their categories have earned.</p>
      <p className="lede">A forecast that planners do not use saves nothing. This is the planner adoption plan from the <Link href="/handoff/">handoff pack</Link>; the screen it describes is the <Link href="/planner/">Planner</Link> page.</p>

      <div className="eyebrow">Three roles, three jobs</div>
      <div className="grid3">
        <div className="card t-teal">
          <h3>Store planner</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Works the exceptions and gives a reason on every override.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}>The morning starts with the order list sorted needs-review first, High priority at the top. The planner reads why each rule fired, then approves, changes or skips. A change without a reason code does not save.</p>
        </div>
        <div className="card t-violet">
          <h3>Category manager</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Reads the autonomy table and decides which categories may move up.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}>Once a week, the table shows each category&apos;s WAPE, bias, override rate and stockout rate against its thresholds, and its run of passing weeks. The category manager confirms moves the evidence supports, and cannot promote one it does not.</p>
        </div>
        <div className="card t-orange">
          <h3>Store manager</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Sees the weekly summary and the veto window at L3.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}>Monday brings one page: stockouts, waste, spend against open-to-buy, and which categories sit at which level. At L3 the store manager also sees the morning summary of what the system ordered and has until cut-off to veto. Most mornings that is a two-minute read.</p>
        </div>
      </div>

      <div className="eyebrow">Week by week in the pilot</div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead><tr><th>Week</th><th>Level</th><th>Planner&apos;s work</th><th>What we measure</th><th>What changes</th></tr></thead>
          <tbody>
            {WEEKS.map(([w, l, work, m, c]) => (
              <tr key={w}><td style={{ whiteSpace: "nowrap" }}><strong>{w}</strong></td><td style={{ whiteSpace: "nowrap" }}>{l}</td><td>{work}</td><td>{m}</td><td className="muted">{c}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Shadow mode runs 4 to 6 weeks. No order reaches the ordering system before accuracy holds for 4 consecutive weeks and planners accept at least 85% of suggestions without change.</p>

      <div className="eyebrow">What the ladder looks like from a planner&apos;s chair</div>
      <div className="grid3">
        {LADDER.map(([lvl, name, see, doWhat, time, move]) => (
          <div key={lvl} className="card">
            <h3><span className={`lvl ${lvl}`}>{lvl}</span> {name}</h3>
            <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>What they see:</strong> {see}</p>
            <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>What they do:</strong> {doWhat}</p>
            <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>How long:</strong> {time}</p>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}><strong>Up or down:</strong> {move}</p>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Thresholds per category class: ambient WAPE ≤ 35%, bias ± 5%, overrides ≤ 5% of lines, stockouts ≤ 10% of lines; fresh WAPE ≤ 40%, stockouts ≤ 30%.</p>

      <div className="eyebrow">Override reasons are the training data</div>
      <div className="grid2">
        <div className="card">
          <h3>The six reason codes</h3>
          <ul className="clean" style={{ fontSize: 13 }}>
            {REASONS.map(([r, why]) => <li key={r}><strong>{r}:</strong> {why}</li>)}
          </ul>
        </div>
        <div className="card t-teal">
          <h3>What we do with them</h3>
          <p style={{ fontSize: 13, marginTop: 0 }}>Every week the delivery team reviews override rate by category and the top reasons behind it. A reason that keeps appearing becomes a feature the model can learn from, such as a display calendar, or a rule change.</p>
          <p style={{ fontSize: 13, marginBottom: 0 }}>We also check who was right. A planner whose overrides beat the suggestion more often than not knows something the data does not. The response is to raise the review bar for that store or category and learn what it is, not to treat the overrides as noise.</p>
        </div>
      </div>

      <div className="eyebrow">Coaching and support</div>
      <div className="card">
        <ul className="clean" style={{ fontSize: 13, columns: 2, columnGap: 32 }}>
          <li><strong>45-minute kickoff per store</strong>, with the planner&apos;s own order list on screen rather than a demo.</li>
          <li><strong>One-page screen guide</strong>: what each column means, what each rule checks.</li>
          <li><strong>Weekly 20-minute huddle</strong> per region to read the autonomy table together.</li>
          <li><strong>A named champion per region</strong>, a planner who takes the first question.</li>
          <li><strong>Office hours in week 1 and week 5</strong>, the two weeks where the work changes most.</li>
          <li><strong>Training mode with a reset</strong>, like the prototype&apos;s Clear demo changes button: try anything, then put the store back.</li>
        </ul>
      </div>

      <div className="eyebrow">Signals that adoption is working</div>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table>
          <thead><tr><th>Signal</th><th>Target</th><th>Why it matters</th></tr></thead>
          <tbody>
            {SIGNALS.map(([s, t, w]) => <tr key={s}><td><strong>{s}</strong></td><td style={{ whiteSpace: "nowrap" }}>{t}</td><td className="muted">{w}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="eyebrow">What goes wrong and what we do</div>
      <div className="grid3">
        <div className="card peach">
          <strong>Planners rubber-stamp</strong>
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>Acceptance climbs to 99% and time per store falls to nothing. Looks like success, is not. We sample approved lines in the huddle and add a confirmation step on High lines.</p>
        </div>
        <div className="card peach">
          <strong>Planners override everything</strong>
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>Override rate sits above 20% for a store. We sit with the planner for a morning and check the data. The planner is often right: a stock count is off, a promotion is missing, a case pack changed. The fix is upstream.</p>
        </div>
        <div className="card peach">
          <strong>A category gets demoted</strong>
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>Two misses in a row and Pantry drops from L3 to L2. We say so in the huddle, show the two weeks and the threshold that broke, and set the date it can earn L3 back. No blame. The mechanism working is the point.</p>
        </div>
      </div>

      <div className="card dark"><strong className="y">Enablement is finished when</strong> every pilot store runs ambient categories at L2 or above with a reason on every override, and a planner, not the delivery team, is the one asking for the next category to move up.</div>
    </Shell>
  );
}
