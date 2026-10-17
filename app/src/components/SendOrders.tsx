"use client";
import { money, pct } from "@/lib/data";
import type { openToBuyCheck, PurchaseOrder } from "@/lib/logic";
import { full } from "@/components/SentOrders";

const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });

/** The review sheet before orders go out: one purchase order per supplier or DC, the cash check, and the send button. */
export default function SendOrders({ pos, otb, storeId, weekNumber, unreviewed, onClose, onSend }: {
  pos: PurchaseOrder[]; otb: ReturnType<typeof openToBuyCheck>; storeId: string; weekNumber: number; unreviewed: number; onClose: () => void; onSend: () => void;
}) {
  const lines = pos.reduce((s, p) => s + p.lines.length, 0), cases = pos.reduce((s, p) => s + p.cases, 0), changed = pos.reduce((s, p) => s + p.changed_lines, 0);
  const blocked = unreviewed > 0 ? `${unreviewed} item${unreviewed === 1 ? "" : "s"} still need${unreviewed === 1 ? "s" : ""} review: accept or override them first` : !pos.length ? "Nothing to send" : "";
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer sheet" role="dialog" aria-label="Review and send orders">
        <button className="close sm" onClick={onClose} aria-label="Close">Close ✕</button>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Send orders · Store {storeId} · Wk {weekNumber}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>One purchase order per supplier or DC, built from the final order on every line. Lines with a zero order are left out.</p>
        <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
          <div className="kpi"><div className="v">{pos.length}</div><div className="l">purchase orders</div></div>
          <div className="kpi"><div className="v">{lines}</div><div className="l">lines{changed > 0 ? ` · ${changed} changed` : ""}</div></div>
          <div className="kpi"><div className="v">{cases.toLocaleString()} cs</div><div className="l">cases</div></div>
          <div className="kpi"><div className="v" title={full(otb.ordersCost)}>{money(otb.ordersCost)}</div><div className="l">value at cost</div></div>
          <div className={`kpi ${otb.ok ? "" : "y"}`}><div className="v">{pct(otb.share, 0)}</div><div className="l">of {money(otb.openToBuy)} open-to-buy used</div></div>
        </div>
        {!otb.ok && <p className="callout bad" style={{ fontSize: 13 }}><strong>Over the cash limit by {money(otb.over)}.</strong> Trim the largest orders or get Finance approval before sending.</p>}
        {pos.map((po) => (
          <section key={po.po}>
            <div className="po-head" style={{ marginBottom: 6 }}>
              <span><strong>{po.supplier}</strong> <span className="sku muted">{po.po}</span>{po.changed_lines > 0 && <span className="tag sb" style={{ marginLeft: 8 }}>{po.changed_lines} line{po.changed_lines === 1 ? "" : "s"} changed</span>}</span>
              <span className="muted" style={{ fontSize: 12 }}>Lead time {po.lead_time_days} day{po.lead_time_days > 1 ? "s" : ""} · expected {fmtDate(po.expected_delivery)}</span>
            </div>
            <div className="table-wrap" style={{ maxHeight: 190 }}>
              <table>
                <thead><tr><th>SKU</th><th>Item</th><th className="num">Cases</th><th className="num">Units</th><th className="num">Cost</th></tr></thead>
                <tbody>{po.lines.map((l) => (
                  <tr key={l.sku}><td className="sku">{l.sku}</td><td>{l.name}{l.changed && <span className="tag sb" style={{ marginLeft: 6 }}>Changed</span>}</td><td className="num">{l.cases}</td><td className="num">{l.units}</td><td className="num" title={full(l.cost)}>{money(l.cost)}</td></tr>
                ))}</tbody>
                <tfoot><tr><td colSpan={2}><strong>Total</strong></td><td className="num"><strong>{po.cases}</strong></td><td className="num"><strong>{po.units}</strong></td><td className="num" title={full(po.total_cost)}><strong>{money(po.total_cost)}</strong></td></tr></tfoot>
              </table>
            </div>
          </section>
        ))}
        <section>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button disabled={!!blocked} onClick={onSend} title={blocked || undefined}>Send {pos.length} purchase order{pos.length === 1 ? "" : "s"}</button>
            <button className="ghost" onClick={onClose}>Cancel</button>
            {blocked ? <span className="bad" style={{ fontSize: 12 }}>{blocked}.</span> : <span className="muted" style={{ fontSize: 12 }}>Simulated: in production this posts to the ordering system (API or EDI 850) and waits for the supplier&apos;s acknowledgement (855).</span>}
          </div>
        </section>
      </aside>
    </>
  );
}
