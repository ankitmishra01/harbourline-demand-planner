import Link from "next/link";
import { DISCLAIMER, DISCLAIMER_SHORT, GITHUB_URL } from "@/lib/brand";
export { DISCLAIMER, DISCLAIMER_SHORT, GITHUB_URL };

/** Page body inside the rail frame (see Rail, rendered by the root layout): the prototype notice, the page and the footer. */
export default function Shell({ children, notice = true }: { children: React.ReactNode; notice?: boolean }) {
  return (
    <>
      {notice && <div className="disclaimer"><strong>Prototype.</strong> <span>{DISCLAIMER_SHORT}</span> <Link href="/about/">About this prototype</Link></div>}
      <main id="content">{children}</main>
      <footer>{DISCLAIMER} Harbourline Foods is drawn as a mid-sized Canadian grocer (300 stores, $200M revenue); store, sales and stock data are generated, with seasonality and food price inflation calibrated to public Statistics Canada series. <Link href="/handoff/">Handoff pack</Link> · <Link href="/how-it-was-built/">How it was built</Link> · <a href={GITHUB_URL}>Source on GitHub</a>.</footer>
    </>
  );
}
