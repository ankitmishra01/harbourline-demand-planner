import Shell from "@/components/Shell";

const ITEMS: [string, string][] = [
  ["Data residency in Canada", "All store level sales, stock, pricing and supplier data stays in a Canadian cloud region (for example Canada Central or Canada East), including backups and model training jobs."],
  ["Encryption", "Data is encrypted at rest with keys managed by the grocer, and in transit with TLS 1.2 or higher between stores, the data platform and the planner app."],
  ["Access controls", "Single sign-on with role based access: planners see only their stores and categories, analysts see aggregated views, and administrators are few and named. Least privilege by default."],
  ["Monitoring for unusual access", "Every query and export is logged; alerts fire on unusual access such as bulk exports, access from new locations, or access outside working hours."],
  ["Model and data monitoring", "Forecast error and bias are tracked weekly by store and category, with drift alerts when accuracy slips, and a simple fallback to the baseline forecast if the model degrades."],
  ["Integration and write access", "The planner reads sales, stock and orders through a nightly feed and sends approved purchase orders back through the ordering system's API or EDI 850, with 855 acknowledgements and 856 ship notices closing the loop. Writing orders uses a separate, named service account scoped per store and category to the autonomy level that category has earned; every order it writes is logged with its reasoning and can be vetoed or reversed."],
  ["Governance checkpoints", "The grocer's IT and data owners sign off on residency, encryption, access and monitoring at the week 5 and week 7 checkpoints of the discovery phase, before any pilot store goes live."],
];

export default function Security() {
  return (
    <Shell>
      <h1>Data and security</h1>
      <p className="takeaway">Store data stays in Canada, access is by role, every order the system writes is logged and reversible, and IT signs off at weeks 5 and 7 before a single pilot store goes live.</p>
      <p className="lede">Once all 300 stores are live, the platform holds store level sales, stock, pricing and supplier data, so the security exposure grows with every store added. This is the sixth risk in the plan, and it carries its own controls and sign-offs.</p>
      <div className="grid2">{ITEMS.map(([t, d]) => (<div className="card" key={t}><h2>{t}</h2><p style={{ margin: 0 }}>{d}</p></div>))}</div>
      <div className="card">
        <h2>Cost</h2>
        <p style={{ margin: 0 }}>The business case already carries $62.5K a year for cloud and monitoring. Within that, the security share (key management, logging, alerting and periodic access reviews) is shown explicitly rather than folded into hosting.</p>
      </div>
      <p className="note">This prototype runs on synthetic data behind a shared demo password. It holds no user data and has no connection to any retailer system: sending orders, supplier replies and the autonomy ladder are simulated in the browser from the backtest.</p>
    </Shell>
  );
}
