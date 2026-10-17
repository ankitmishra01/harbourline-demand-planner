"use client";
import { fmtWeek, pct, type AutonomyEvidence } from "@/lib/data";
import { AUTONOMY_RULES, LEVEL_LABEL, type evaluateAutonomy } from "@/lib/logic";

export type Levels = Record<string, ReturnType<typeof evaluateAutonomy>>;

/** The autonomy ladder: which categories the system is trusted to order on its own, computed from the backtest evidence. */
export function AutonomyChip({ levels, open, onToggle }: { levels: Levels; open: boolean; onToggle: () => void }) {
  const n = Object.values(levels); const count = (lv: number) => n.filter((l) => l.level === lv).length;
  const parts = [`${count(3)} of ${n.length} categories at L3`, ...([2, 1] as const).filter((lv) => count(lv) > 0).map((lv) => `${count(lv)} at L${lv}`)];
  return (
    <button className="ghost sm" onClick={onToggle} aria-expanded={open} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span className="lvl L2">Autonomy</span> {parts.join(" · ")} {open ? "▴" : "▾"}
    </button>
  );
}

const LEVEL_NOTE: Record<1 | 2 | 3, string> = {
  1: "Shadow mode and the first pilot weeks. The system suggests; the planner approves every line.",
  2: "This screen today. Items that pass every rule are auto-approved; the planner decides the exceptions.",
  3: "The agent checks stock, cash, supplier limits and the ordering system, writes the orders, logs its reasoning and posts a summary the planner can veto before the cut-off.",
};

export function AutonomyPanel({ levels, evidence, weeks }: { levels: Levels; evidence: Record<string, AutonomyEvidence>; weeks: string[] }) {
  const cats = Object.keys(evidence).sort((a, b) => levels[b].level - levels[a].level || a.localeCompare(b));
  return (
    <div className="card t-teal">
      <h2>Autonomy ladder: trust is earned per category</h2>
      <div className="grid3" style={{ marginBottom: 4 }}>
        {([1, 2, 3] as const).map((l) => (
          <div key={l} className={`card ${l === 3 ? "dark" : ""}`} style={{ marginBottom: 0 }}>
            <span className={`lvl L${l}`}>L{l}</span> <strong>{LEVEL_LABEL[l].slice(5)}</strong>
            <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>{LEVEL_NOTE[l]}</p>
          </div>
        ))}
      </div>
      <div className="thresholds">
        {(["ambient", "fresh"] as const).map((k) => { const th = AUTONOMY_RULES[k]; return (
          <div key={k} style={{ gridColumn: "span 2" }}><strong style={{ fontSize: 13 }}>{k === "ambient" ? "Ambient (weekly or two-day ordering)" : "Fresh (daily ordering)"}</strong>
            WAPE ≤ {pct(th.wape, 0)} · bias ± {pct(th.bias, 0)} · overrides ≤ {pct(th.override, 0)} of lines · stockouts ≤ {pct(th.stockout, 0)} of lines</div>); })}
        <div><strong>{AUTONOMY_RULES.weeks} weeks</strong>in a row to move up to L3</div>
        <div><strong>1-week grace</strong>one miss holds L3; {AUTONOMY_RULES.demote_weeks} in a row drops to L2</div>
      </div>
      <div className="table-wrap" style={{ maxHeight: "none" }}>
        <table className="autonomy-table">
          <thead><tr><th>Category</th><th>Level now</th><th className="num">WAPE, 12 wks</th><th className="num">Bias</th><th className="num">Worst week stockouts</th><th className="hide-sm">Level by week</th><th>What it needs to move up</th></tr></thead>
          <tbody>{cats.map((c) => { const e = evidence[c]; const l = levels[c]; const worst = Math.max(...e.weeks.map((w) => w.stockout_rate)); return (
            <tr key={c}>
              <td data-label="Category"><strong>{c}</strong>{e.fresh && <span className="tag sb" style={{ marginLeft: 6 }}>Fresh</span>}</td>
              <td data-label="Level now"><span className={`lvl L${l.level}`}>L{l.level}</span></td>
              <td data-label="WAPE, 12 wks" className={`num ${e.wape <= l.thresholds.wape ? "good" : "bad"}`}>{pct(e.wape)}</td>
              <td data-label="Bias" className={`num ${Math.abs(e.bias) <= l.thresholds.bias ? "good" : "bad"}`}>{e.bias > 0 ? "+" : ""}{pct(e.bias)}</td>
              <td data-label="Worst stockouts" className={`num ${worst <= l.thresholds.stockout ? "good" : "bad"}`}>{pct(worst, 0)}</td>
              <td className="hide-sm"><span className="tl">{l.history.map((h, i) => <span key={i} className={`d ${h === 3 ? "on" : ""}`} title={`${weeks[i]}: L${h}`} />)}</span></td>
              <td data-label="What it needs" style={{ fontSize: 12 }}>{l.needs}{l.lostAt ? ` Earned L3 in the backtest and lost it in the week of ${fmtWeek(l.lostAt)} after two failing weeks.` : ""}</td>
            </tr>); })}</tbody>
        </table>
      </div>
      <p className="note" style={{ margin: "10px 0 0" }}>Evidence: the 12-week backtest on the Model comparison page, by category and week; override rate uses this browser&apos;s decisions for the latest week. Thresholds are set per category class because ambient items forecast better and stock out less than fresh; fresh categories (ordered daily) stay at L2 through the pilot. The accuracy bars are prototype settings: synthetic item-level demand has a noise floor near 30%, so a 25% target cannot be reached on this data; the pilot sets the production values at the week 5 checkpoint. At L3 the objective is in-stock at or above target, waste at or below target and spend inside open-to-buy; the agent proposes offers but never changes a price or a planogram itself.</p>
    </div>
  );
}
