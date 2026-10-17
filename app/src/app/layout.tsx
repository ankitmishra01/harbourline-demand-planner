import "./globals.css";
import type { Metadata, Viewport } from "next";

const TITLE = "Harbourline Foods · Demand Planner prototype";
const DESCRIPTION = "Store and product demand forecasts for next week and the week after, with suggested order quantities, a model comparison judged in dollars and a worked business case. Fictional retailer, synthetic data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "Harbourline Foods Demand Planner" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
