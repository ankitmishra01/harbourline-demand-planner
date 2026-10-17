"use client";
import { money } from "@/lib/data";
import type { AutonomyLevel, MarkdownOffer, PromoOffer } from "@/lib/logic";

export type Offer = (MarkdownOffer | PromoOffer) & { level: AutonomyLevel };
export type OfferDecision = { status: "Accepted" | "Dismissed"; reason?: string; ts: string };
export const OFFER_REASONS = ["Already planned", "Not enough stock", "Supplier funding pending", "Brand or price rule", "Other"];

/** One-line description, used in the change log. */
export const describe = (o: Offer) => o.kind === "markdown"
  ? `${Math.round(o.discount * 100)}% off ${o.days}: ${o.units_at_risk} units at risk of expiry, expected to clear ${o.expected_cleared}, recovering ${money(o.revenue_recovered)} of stock that would otherwise be written off at ${money(o.write_off_avoided)} cost`
  : `Flyer candidate (${o.reason === "excess" ? `${o.cover_weeks.toFixed(1)} weeks of cover` : `lifted ${o.lift.toFixed(1)}x in last year's promotion`}): about ${o.extra_units} extra units at 20% off, worth ${money(o.margin)} of margin`;

export function OfferStats({ o }: { o: Offer }) {
  return o.kind === "markdown" ? (
    <div className="kpi-mini">
      <span><span className="k">Offer</span><span className="v">{Math.round(o.discount * 100)}% off {o.days}</span></span>
      <span><span className="k">At risk</span><span className="v">{o.units_at_risk} units</span></span>
      <span><span className="k">Expected to clear</span><span className="v">{o.expected_cleared} units</span></span>
      <span><span className="k">Recovers</span><span className="v">{money(o.revenue_recovered)}</span></span>
      <span><span className="k">Write-off avoided</span><span className="v">{money(o.write_off_avoided)}</span></span>
    </div>
  ) : (
    <div className="kpi-mini">
      <span><span className="k">Why</span><span className="v">{o.reason === "excess" ? `${o.cover_weeks.toFixed(1)} wks cover` : `${o.lift.toFixed(1)}x last year`}</span></span>
      <span><span className="k">Offer</span><span className="v">20% off, flyer</span></span>
      <span><span className="k">Extra units</span><span className="v">{o.extra_units}</span></span>
      <span><span className="k">Margin</span><span className="v">{money(o.margin)}</span></span>
    </div>
  );
}

export function OfferActions({ o, decision, onDecide }: { o: Offer; decision?: OfferDecision; onDecide: (o: Offer, status: OfferDecision["status"], reason?: string) => void }) {
  if (decision) return <span className={`status ${decision.status === "Accepted" ? "ok" : "over"}`}>{decision.status}{decision.reason ? ` · ${decision.reason}` : ""}</span>;
  return (
    <div className="actions">
      <button className="sm" onClick={() => onDecide(o, "Accepted")}>Accept</button>
      <select aria-label={`Dismiss ${o.name}`} defaultValue="" onChange={(e) => { if (e.target.value) onDecide(o, "Dismissed", e.target.value); }}>
        <option value="">Dismiss…</option>{OFFER_REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
    </div>
  );
}

/** Markdowns and flyer candidates the system proposes; each needs a planner's accept or a dismissal with a reason. */
export default function Offers({ offers, decisions, keyOf, onDecide }: {
  offers: Offer[]; decisions: Record<string, OfferDecision>; keyOf: (o: Offer) => string; onDecide: (o: Offer, status: OfferDecision["status"], reason?: string) => void;
}) {
  const md = offers.filter((o) => o.kind === "markdown"), pr = offers.filter((o) => o.kind === "promo");
  const Row = ({ o }: { o: Offer }) => (
    <div className="offer">
      <div>
        <strong>{o.name}</strong> <span className="sku muted">{o.sku}</span>{o.level === 3 && <span className="lvl L3" style={{ marginLeft: 8 }}>Proposed by the agent · veto window</span>}
        <OfferStats o={o} />
      </div>
      <OfferActions o={o} decision={decisions[keyOf(o)]} onDecide={onDecide} />
    </div>
  );
  const Group = ({ title, list, empty }: { title: string; list: Offer[]; empty: string }) => (
    <div className="card" style={{ marginBottom: 0 }}>
      <h3 style={{ marginTop: 0 }}>{title} <span className="muted" style={{ fontWeight: 400 }}>({list.length})</span></h3>
      {list.length ? <div style={{ maxHeight: 320, overflowY: "auto" }}>{list.map((o) => <Row key={keyOf(o)} o={o} />)}</div> : <p className="note" style={{ margin: 0 }}>{empty}</p>}
    </div>
  );
  return (
    <div className="card t-orange">
      <h2>Suggested offers</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}><strong>Markdown rule:</strong> a fresh item with 3 or more units on hand beyond what its remaining shelf life can sell at the forecast rate. <strong>Flyer rule:</strong> 2.5 weeks of cover or more after this order, or a lift of 1.3x or more in last year&apos;s promotion. Formulas are in the item drawer; accepting or dismissing is logged like an override.</p>
      <div className="grid2">
        <Group title="Markdowns to avoid waste" list={md} empty="No fresh item carries more stock than its shelf life can sell." />
        <Group title="Flyer and promotion candidates" list={pr} empty="No item has excess cover or a strong promotion history this week." />
      </div>
    </div>
  );
}
