"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [["/planner/", "Planner"], ["/models/", "Model comparison"], ["/business-case/", "Business case"], ["/plan/", "Delivery plan"], ["/security/", "Data & security"], ["/about/", "About"]];

import { DISCLAIMER, DISCLAIMER_SHORT, GITHUB_URL } from "@/lib/brand";
export { DISCLAIMER, DISCLAIMER_SHORT, GITHUB_URL };

export default function Shell({ children, notice = true }: { children: React.ReactNode; notice?: boolean }) {
  const path = usePathname();
  return (
    <>
      <header className="top">
        <div className="top-inner">
          <Link className="logo" href="/" aria-label="Harbourline Foods demand planner, home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/harbourline-wordmark-paper.svg" alt="Harbourline Foods" />
            <span>Demand planner prototype</span>
          </Link>
          <nav aria-label="Product pages">{NAV.map(([href, label]) => <Link key={href} href={href} className={path?.startsWith(href) ? "active" : ""} aria-current={path?.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav>
          <span className="demo">Synthetic data</span>
        </div>
      </header>
      {notice && <div className="disclaimer"><strong>Prototype.</strong> <span>{DISCLAIMER_SHORT}</span> <Link href="/about/">About this prototype</Link></div>}
      <main>{children}</main>
      <footer>{DISCLAIMER} Harbourline Foods is drawn as a mid-sized Canadian grocer (300 stores, $200M revenue); store, sales and stock data are generated, with seasonality and food price inflation calibrated to public Statistics Canada series. <a href={GITHUB_URL}>Source on GitHub</a>.</footer>
    </>
  );
}
