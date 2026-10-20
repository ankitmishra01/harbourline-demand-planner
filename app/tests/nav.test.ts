import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { NAV_ITEMS, activeItem, breadcrumb, itemForKey } from "../src/lib/nav.ts";

const appDir = path.join(import.meta.dirname, "..", "src", "app");

test("every rail item links to an existing page, and every page is in the rail", () => {
  for (const i of NAV_ITEMS) assert.ok(existsSync(path.join(appDir, i.href, "page.tsx")), `${i.href} has no page.tsx`);
  const hrefs = new Set(NAV_ITEMS.map((i) => i.href));
  const pages = readdirSync(appDir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(path.join(appDir, d.name, "page.tsx")));
  assert.ok(pages.length >= 10);
  for (const d of pages) assert.ok(hrefs.has(`/${d.name}/`), `/${d.name}/ is not in the rail`);
});

test("rail keys and hrefs are unique single letters", () => {
  assert.equal(new Set(NAV_ITEMS.map((i) => i.key)).size, NAV_ITEMS.length);
  assert.equal(new Set(NAV_ITEMS.map((i) => i.href)).size, NAV_ITEMS.length);
  for (const i of NAV_ITEMS) assert.match(i.key, /^[A-Z]$/);
});

test("active item: home only on /, inner pages with or without a trailing slash", () => {
  assert.equal(activeItem("/")!.href, "/");
  assert.equal(activeItem("/planner")!.href, "/planner/");
  assert.equal(activeItem("/planner/")!.href, "/planner/");
  assert.equal(activeItem("/plan/")!.href, "/plan/");
  assert.equal(activeItem("/how-it-was-built/")!.href, "/how-it-was-built/");
  assert.equal(activeItem("/nowhere/"), null);
  assert.deepEqual(breadcrumb("/business-case/"), ["Engagement", "Business case"]);
  assert.deepEqual(breadcrumb("/nowhere/"), ["Demand planner"]);
});

test("shortcut keys map to their pages, case-insensitive; other keys do nothing", () => {
  assert.equal(itemForKey("p")!.href, "/planner/");
  assert.equal(itemForKey("L")!.href, "/plan/");
  assert.equal(itemForKey("Escape"), undefined);
  assert.equal(itemForKey("z"), undefined);
});
