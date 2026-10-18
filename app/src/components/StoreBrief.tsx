"use client";
import { useEffect, useState } from "react";

type Brief = { text: string; source: "claude" | "facts"; model?: string; reason?: string };

/** "Brief me on this store": the facts are computed on the server from the exported data; Claude only rephrases them.
 *  If no model is configured the same facts come back as plain sentences, so the button always works. */
export default function StoreBrief({ store, week }: { store: string; week: 0 | 1 }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { setBrief(null); setOpen(false); }, [store, week]);
  async function run() {
    setOpen(true); setBusy(true);
    try { const r = await fetch(`/api/brief/?store=${store}&week=${week}`); setBrief((await r.json()) as Brief); }
    catch { setBrief({ text: "The brief could not be loaded. The order table below has every fact it would have used.", source: "facts" }); }
    finally { setBusy(false); }
  }
  return (
    <div className="brief">
      <div className="brief-head">
        <div><strong>Morning brief</strong> <span className="muted">The week's decisions for this store in plain English, written from the numbers below.</span></div>
        <button className="ghost" onClick={run} disabled={busy}>{busy ? "Writing…" : brief ? "Write it again" : "Brief me on this store"}</button>
      </div>
      {open && (
        <div className="brief-body" aria-live="polite">
          {busy && !brief && <p className="muted">Reading the store's forecasts, stock and exceptions…</p>}
          {brief && brief.text.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
          {brief && <p className="brief-source">{brief.source === "claude" ? `Written by Claude (${brief.model ?? "via AI Gateway"}) from facts computed on the server; every number comes from the table below.` : "Written from the facts directly, without a model. Every number comes from the table below."}</p>}
        </div>
      )}
    </div>
  );
}
