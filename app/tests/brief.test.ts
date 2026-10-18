import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildBriefFacts, deterministicBrief } from "../src/lib/brief.ts";
import { evaluateAutonomy } from "../src/lib/logic.ts";
import type { Item, Meta } from "../src/lib/data.ts";

const meta = JSON.parse(readFileSync(path.join(process.cwd(), "data", "meta.json"), "utf8")) as Meta;
const items = (JSON.parse(readFileSync(path.join(process.cwd(), "data", "store", "S09.json"), "utf8")) as { items: Item[] }).items;
const st = meta.stores.find((s) => s.store === "S09")!;
const levels: Record<string, 1 | 2 | 3> = {};
for (const [c, e] of Object.entries(meta.autonomy_evidence)) levels[c] = evaluateAutonomy(e.weeks, e.fresh).level as 1 | 2 | 3;

test("brief facts match the store summary and the item exceptions", () => {
  const f = buildBriefFacts(meta, st, items, 0, levels);
  assert.equal(f.store, "S09");
  assert.equal(f.needs_review, items.filter((i) => i.exceptions.length > 0).length);
  assert.equal(f.needs_review, st.needs_review);
  assert.equal(f.high + f.medium, items.filter((i) => i.priority !== "Low").length);
  assert.ok(f.stockouts.length <= 3 && f.spoilage.length <= 3);
  for (const s of f.stockouts) assert.ok(meta.products.some((p) => p.name === s.name));
  assert.ok(f.l3.length + f.l2.length === Object.keys(levels).length);
});

test("deterministic brief mentions every headline number and no product outside the facts", () => {
  const f = buildBriefFacts(meta, st, items, 0, levels);
  const text = deterministicBrief(f);
  assert.ok(text.includes(`${f.needs_review} of ${f.skus} items`));
  assert.ok(text.includes(`week ${f.week}`));
  for (const s of f.stockouts) assert.ok(text.includes(s.name));
  assert.ok(text.split(" ").length < 220);
  assert.ok(!text.includes("--") && !text.includes("—"));
});
