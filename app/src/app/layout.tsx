import "./globals.css";
import type { Metadata, Viewport } from "next";
import Rail from "@/components/Rail";
import { fmtWeek } from "@/lib/data";
import { readMeta } from "@/lib/server-data";

const TITLE = "Harbourline Foods · Demand Planner prototype";
const DESCRIPTION = "Store and product demand forecasts for next week and the week after, with suggested order quantities, a model comparison judged in dollars and a worked business case. Fictional retailer, synthetic data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "Harbourline Foods Demand Planner" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = await readMeta();
  // The one badge is the same count the landing shows as "Items needing a planner": exceptions across every pilot store.
  const review = meta.stores.reduce((s, x) => s + x.needs_review, 0);
  const model = meta.backtest.find((b) => b.model === meta.selected_model)?.label.split(" (")[0].replace("machine learning", "ML") ?? meta.selected_model;
  const status = { weekNumber: meta.forecast_week_numbers[0], weekLabel: fmtWeek(meta.forecast_weeks[0]), stores: meta.stores.length, model };
  return <html lang="en"><body><Rail badges={{ review: { n: review, label: `${review.toLocaleString("en-CA")} items to review across ${meta.stores.length} stores` } }} status={status}>{children}</Rail></body></html>;
}
