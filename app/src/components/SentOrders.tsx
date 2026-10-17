"use client";
import { money } from "@/lib/data";
import { PO_STATUSES, STATUS_AFTER_SECONDS, statusAt, type PurchaseOrder } from "@/lib/logic";

const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
const fmtSent = (iso: string) => new Date(iso).toLocaleString("en-CA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const EDI: Record<PurchaseOrder["status"], string> = { Sent: "EDI 850", Acknowledged: "EDI 855", Shipped: "EDI 856", Received: "Receipt" };
export const full = (x: number) => `$${x.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Orders already sent, one card per purchase order, with the simulated supplier replies as a progress tracker. */
export default function SentOrders({ pos, now, weekNumbers }: { pos: PurchaseOrder[]; now: number; weekNumbers: [number, number] }) {
  return (
    <div className="card">
      <h2>Sent orders</h2>
      {pos.length === 0 ? <p className="note" style={{ margin: 0 }}>Nothing sent yet for this store. Review the orders above and send them to see one purchase order per supplier move from Sent to Received.</p> : (
        <>
          {pos.map((po) => {
            const st = statusAt(po, now); const idx = PO_STATUSES.indexOf(st);
            return (
              <div className="po" key={po.po}>
                <div className="po-head">
                  <span><strong>{po.supplier}</strong> <span className="sku muted">{po.po}</span>{po.changed_lines > 0 && <span className="tag sb" style={{ marginLeft: 8 }}>{po.changed_lines} line{po.changed_lines === 1 ? "" : "s"} changed</span>}</span>
                  <span className={`po-status ${st.toLowerCase()}`}>{st === "Received" ? "✓ Received" : st}</span>
                </div>
                <div className="kpi-mini">
                  <span><span className="k">Week</span><span className="v">Wk {weekNumbers[po.week]}</span></span>
                  <span><span className="k">Lines</span><span className="v">{po.lines.length}</span></span>
                  <span><span className="k">Cases</span><span className="v">{po.cases.toLocaleString()} cs</span></span>
                  <span><span className="k">Value at cost</span><span className="v" title={full(po.total_cost)}>{money(po.total_cost)}</span></span>
                  <span><span className="k">Expected</span><span className="v">{fmtDate(po.expected_delivery)}</span></span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>Sent {fmtSent(po.sent_at)}</div>
                <div className="tracker" aria-label={`Status: ${st}`}>
                  {PO_STATUSES.map((s, i) => <div key={s} className={i < idx ? "done" : i === idx ? "now" : ""}><span className="pt" /><span className="lab">{s}</span><span className="edi">{EDI[s]}</span></div>)}
                </div>
              </div>
            );
          })}
          <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>Simulated supplier replies: acknowledged about {STATUS_AFTER_SECONDS.Acknowledged} s after sending, shipped after {STATUS_AFTER_SECONDS.Shipped} s, received at the expected delivery date or after {STATUS_AFTER_SECONDS.Received} s. In production these are the 855, 856 and goods receipt from the ordering system.</p>
        </>
      )}
    </div>
  );
}
