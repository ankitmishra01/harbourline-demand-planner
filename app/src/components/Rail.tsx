"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GITHUB_URL } from "@/lib/brand";
import { NAV_GROUPS, activeItem, breadcrumb, itemForKey, type Badges, type RailStatus } from "@/lib/nav";
import { Ic } from "./Icons";

/** App frame: ink left rail (full from 1100px, icons only from 768px, a drawer below), a slim top bar, then the page. */
export default function Rail({ badges, status, children }: { badges: Badges; status: RailStatus; children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const [open, setOpen] = useState(false); // drawer (phone) or expanded overlay (tablet)
  const act = activeItem(path);
  const crumbs = breadcrumb(path);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      const t = e.target as HTMLElement | null;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName)))) return;
      if (document.querySelector(".drawer")) return; // a planner sheet is open: keys belong to it
      const hit = itemForKey(e.key);
      if (hit) { e.preventDefault(); router.push(hit.href); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className={`app${open ? " rail-open" : ""}`}>
      <a className="skip" href="#content">Skip to content</a>
      <aside className="rail" id="rail" aria-label="Site navigation">
        <div className="rail__brand">
          <Link href="/" className="rail__mark" aria-label="Harbourline Foods demand planner, home"><Ic name="mark" size={18} /></Link>
          <div className="rail__brandtext">
            <div className="rail__title">Harbourline<span> Foods</span></div>
            <div className="rail__sub">Demand planner prototype</div>
            <div className="rail__asof">Order week Wk {status.weekNumber} · {status.weekLabel}</div>
          </div>
          <button className="rail__expand" onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse navigation" : "Expand navigation"} aria-expanded={open} aria-controls="rail"><Ic name="expand" /></button>
        </div>
        <nav aria-label="Primary" className="rail__navwrap">
          {NAV_GROUPS.map((g) => (
            <div key={g.name} className="rail__group">
              <div className="rail__hdr">{g.name}</div>
              {g.items.map((it) => {
                const b = it.badge ? badges[it.badge] : undefined, on = act?.href === it.href;
                return (
                  <Link key={it.href} href={it.href} className={`rail__item${on ? " active" : ""}`} aria-current={on ? "page" : undefined} data-label={it.label} aria-label={b ? `${it.label}, ${b.label}` : undefined} title={b ? `${it.label}: ${b.label} (${it.key})` : `${it.label} (${it.key})`}>
                    <Ic name={it.icon} /><span className="rail__lbl rail__text">{it.label}</span>
                    {b && <span className="rail__badge">{b.n.toLocaleString("en-CA")}</span>}
                    <span className="rail__lbl kbd" aria-hidden="true">{it.key}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="rail__spacer" />
        <div className="rail__foot rail__lbl">
          <ul className="rail__conn" aria-label="Pilot status">
            <li><i className="dot ok" />Forecast · Wk {status.weekNumber} and {status.weekNumber + 1}</li>
            <li><i className="dot ok" />{status.stores} pilot stores · backtested</li>
            <li><i className="dot" />Model · {status.model}</li>
          </ul>
          <div className="rail__note">Fictional retailer, synthetic data. <a href={GITHUB_URL}>Source on GitHub</a></div>
        </div>
      </aside>
      <div className="rail-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="main-col">
        <header className="topbar">
          <button className="topbar__menu" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} aria-controls="rail"><Ic name="menu" /></button>
          <nav className="crumbs" aria-label="Breadcrumb"><ol>{crumbs.map((c, i) => <li key={i} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</li>)}</ol></nav>
          <span className="topbar__week">Wk {status.weekNumber} · {status.weekLabel}</span>
          <span className="demo">Synthetic data</span>
        </header>
        {children}
      </div>
    </div>
  );
}
