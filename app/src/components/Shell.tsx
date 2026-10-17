"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [["/planner/", "Planner"], ["/models/", "Model comparison"], ["/business-case/", "Business case"], ["/plan/", "Delivery plan"], ["/security/", "Data & security"], ["/about/", "About"]];

export const DISCLAIMER = "Prototype built by Ankit Mishra. Harbourline Foods is a fictional retailer; all data is synthetic and calibrated to public Statistics Canada series. Not affiliated with, or built for, any company.";
export const DISCLAIMER_SHORT = "Fictional retailer, synthetic data. Built by Ankit Mishra; not affiliated with any company.";
export const GITHUB_URL = "https://github.com/ankitmishra01/harbourline-demand-planner";

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <div className="disclaimer"><strong>Prototype</strong> · {DISCLAIMER_SHORT}</div>
      <header className="top">
        <div className="top-inner">
          <Link className="logo" href="/planner/" aria-label="Harbourline Foods demand planner, home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/harbourline-wordmark.svg" alt="Harbourline Foods" />
            <span>Demand Planner · pilot</span>
          </Link>
          <nav>{NAV.map(([href, label]) => <Link key={href} href={href} className={path?.startsWith(href) ? "active" : ""}>{label}</Link>)}</nav>
          <span className="demo">Synthetic data</span>
        </div>
      </header>
      <main>{children}</main>
      <footer>{DISCLAIMER} Harbourline Foods is drawn as a mid-sized Canadian grocer (300 stores, $200M revenue); store, sales and stock data are generated, with seasonality and food price inflation calibrated to public Statistics Canada series. <a href={GITHUB_URL}>Source on GitHub</a>.</footer>
    </>
  );
}
