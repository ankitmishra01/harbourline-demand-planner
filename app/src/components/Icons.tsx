/** 16px inline-SVG icons in one stroke style (1.5px, round joins). Decorative: the label carries the meaning. */
import type { Icon } from "@/lib/nav";
const P: Record<Icon | "menu" | "expand" | "mark", string> = {
  overview: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  planner: "M2.5 3h11M2.5 8h11M2.5 13h11M5.5 1.5v3M10.5 6.5v3M7.5 11.5v3",
  models: "M2 13.5h12M3.5 11l3-4 2.5 2.5L13 4M10.5 4H13v2.5",
  discovery: "M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM11 11l3.5 3.5",
  case: "M2.5 14V9.5M6.2 14V6.5M9.8 14V8M13.5 14V3",
  plan: "M2 3.5h12v10.5H2zM2 6.5h12M5 1.5v3M11 1.5v3M4.5 9h2M9.5 9h2M4.5 11.5h2",
  enablement: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM5.5 8.2l1.8 1.8 3.4-3.6",
  handoff: "M3 2.5h7l3 3v8H3zM10 2.5v3h3M5.5 8.5h5M5.5 11h3.5",
  security: "M8 1.5l5.5 2v4.2c0 3.2-2.3 5.6-5.5 6.8-3.2-1.2-5.5-3.6-5.5-6.8V3.5zM5.8 8l1.6 1.6 2.8-3",
  built: "M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5M9 3l-2 10",
  about: "M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 7.3v4M8 4.8v.2",
  menu: "M2 4h12M2 8h12M2 12h12",
  expand: "M6 3.5l4.5 4.5L6 12.5",
  // The Harbourline glyph (sun over water) from the wordmark, redrawn on the 16px grid.
  mark: "M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM3.4 9.4c1.5 0 1.5 1.4 3 1.4s1.6-1.4 3.1-1.4 1.5 1.4 3.1 1.4M8 2.5v4.6",
};
export function Ic({ name, size = 16 }: { name: keyof typeof P; size?: number }) {
  return <svg className="ic" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={P[name]} /></svg>;
}
