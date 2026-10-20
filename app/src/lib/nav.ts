/** Navigation model for the left rail, the top-bar breadcrumb and the keyboard shortcuts. Pure, so routes and keys can be tested. */
export type Badge = "review";
export type Icon = "overview" | "planner" | "models" | "discovery" | "case" | "plan" | "enablement" | "handoff" | "security" | "built" | "about";
export type NavItem = { href: string; label: string; key: string; icon: Icon; badge?: Badge };
export type NavGroup = { name: string; items: NavItem[] };
export type Badges = Partial<Record<Badge, { n: number; label: string }>>;
/** Facts for the rail header and footer, read from the exported metadata on the server. */
export type RailStatus = { weekNumber: number; weekLabel: string; stores: number; model: string };

export const NAV_GROUPS: NavGroup[] = [
  { name: "Pilot", items: [
    { href: "/", label: "Overview", key: "O", icon: "overview" },
    { href: "/planner/", label: "Planner", key: "P", icon: "planner", badge: "review" },
    { href: "/models/", label: "Models", key: "M", icon: "models" },
  ] },
  { name: "Engagement", items: [
    { href: "/discovery/", label: "Discovery", key: "D", icon: "discovery" },
    { href: "/business-case/", label: "Business case", key: "B", icon: "case" },
    { href: "/plan/", label: "Delivery plan", key: "L", icon: "plan" },
  ] },
  { name: "Adoption", items: [
    { href: "/enablement/", label: "Enablement", key: "E", icon: "enablement" },
    { href: "/handoff/", label: "Handoff pack", key: "H", icon: "handoff" },
    { href: "/security/", label: "Security", key: "S", icon: "security" },
  ] },
  { name: "Prototype", items: [
    { href: "/how-it-was-built/", label: "How it was built", key: "W", icon: "built" },
    { href: "/about/", label: "About", key: "A", icon: "about" },
  ] },
];
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.name })));

/** The nav item a path belongs to: the longest matching prefix, with "/" only for the home page. */
export function activeItem(path: string) {
  const p = path.endsWith("/") ? path : `${path}/`;
  if (p === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.filter((i) => i.href !== "/" && p.startsWith(i.href)).sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}
/** Breadcrumb for the top bar: group / page. Unknown paths (404) show only the product name. */
export const breadcrumb = (path: string) => { const it = activeItem(path); return it ? [it.group, it.label] : ["Demand planner"]; };
/** The rail item a single key press opens, ignoring modifiers. */
export const itemForKey = (key: string) => (key.length === 1 ? NAV_ITEMS.find((n) => n.key === key.toUpperCase()) : undefined);
