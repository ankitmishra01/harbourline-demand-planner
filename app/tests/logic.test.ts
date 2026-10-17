import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTONOMY_RULES, buildPurchaseOrders, evaluateAutonomy, markdownOffer, openToBuyCheck, promoOffer, statusAt, type WeekEvidence } from "../src/lib/logic.ts";

const sent = new Date("2026-10-19T14:00:00Z");
const items = [
  { sku: "A", name: "Apples", supplier: "Fresh DC", lead_time_days: 1, case_pack: 12, final_units: 30, cost: 1.5, changed: true },
  { sku: "B", name: "Bread", supplier: "Bakery Co", lead_time_days: 2, case_pack: 8, final_units: 16, cost: 2, changed: false },
  { sku: "C", name: "Carrots", supplier: "Fresh DC", lead_time_days: 1, case_pack: 10, final_units: 0, cost: 1, changed: false },
  { sku: "D", name: "Detergent", supplier: "Ambient DC", lead_time_days: 5, case_pack: 6, final_units: 7, cost: 4, changed: false },
];

test("one purchase order per supplier, lines rounded up to whole cases, zero lines left out", () => {
  const pos = buildPurchaseOrders(items, "S09", sent, 1, 0);
  assert.deepEqual(pos.map((p) => p.supplier), ["Ambient DC", "Bakery Co", "Fresh DC"]);
  const fresh = pos.find((p) => p.supplier === "Fresh DC")!;
  assert.equal(fresh.lines.length, 1, "Carrots at 0 units is not sent");
  assert.equal(fresh.lines[0].cases, 3); assert.equal(fresh.lines[0].units, 36); assert.equal(fresh.lines[0].cost, 54);
  assert.equal(fresh.changed_lines, 1);
  const amb = pos.find((p) => p.supplier === "Ambient DC")!;
  assert.equal(amb.lines[0].cases, 2); assert.equal(amb.units, 12); assert.equal(amb.total_cost, 48);
  assert.equal(amb.expected_delivery, "2026-10-24", "send date + lead time");
  assert.equal(amb.po, "PO-20261019-S09-001"); assert.equal(pos[2].po, "PO-20261019-S09-003");
  assert.ok(pos.every((p) => p.status === "Sent" && p.week === 0));
});

test("sent orders move Sent → Acknowledged → Shipped → Received on a timer, or on the delivery date", () => {
  const po = { sent_at: sent.toISOString(), expected_delivery: "2026-10-24" };
  const t = sent.getTime();
  assert.equal(statusAt(po, t), "Sent");
  assert.equal(statusAt(po, t + 20_000), "Acknowledged");
  assert.equal(statusAt(po, t + 60_000), "Shipped");
  assert.equal(statusAt(po, t + 120_000), "Received");
  assert.equal(statusAt({ ...po, expected_delivery: "2026-10-19" }, t + 60_000), "Received", "delivery date reached after shipping");
  assert.equal(statusAt({ ...po, expected_delivery: "2026-10-19" }, t + 5_000), "Sent", "the delivery date never skips the acknowledgement");
});

test("open-to-buy check flags orders over the cash limit", () => {
  assert.equal(openToBuyCheck(21000, 41000).ok, true);
  const over = openToBuyCheck(45000.5, 41000);
  assert.equal(over.ok, false); assert.equal(over.over, 4000.5); assert.ok(Math.abs(over.share - 1.0976) < 0.001);
  assert.equal(openToBuyCheck(0, 0).share, 0);
});

test("markdown rule: fresh stock beyond what the shelf life can sell", () => {
  const base = { sku: "M", name: "Milk", fresh: true, shelf_life_days: 4, on_hand: 40, p50_next_week: 35, price: 3, cost: 2 };
  const o = markdownOffer(base)!;
  assert.equal(o.units_at_risk, 25, "40 on hand − 5/day × 3 days = 25");
  assert.equal(o.expected_cleared, 20);
  assert.equal(o.write_off_avoided, 40, "20 × cost 2");
  assert.equal(o.revenue_recovered, 42, "20 × 3 × 0.7");
  assert.equal(markdownOffer({ ...base, on_hand: 16 }), null, "1 unit at risk is below the 3-unit floor");
  assert.equal(markdownOffer({ ...base, fresh: false }), null);
  assert.equal(markdownOffer({ ...base, shelf_life_days: 14, on_hand: 60 }), null, "long shelf life sells through");
});

test("excess-promo rule: long cover or a strong lift last year, never while a promo is running", () => {
  const base = { sku: "P", name: "Pasta", cover_weeks: 3.1, p50_next_week: 50, last_year_promo_lift: null, price: 2.5, cost: 1.5, promo_now: false };
  const o = promoOffer(base)!;
  assert.equal(o.reason, "excess"); assert.equal(o.lift, 1.3); assert.equal(o.extra_units, 15); assert.equal(o.margin, 7.5);
  const s = promoOffer({ ...base, cover_weeks: 1, last_year_promo_lift: 1.6 })!;
  assert.equal(s.reason, "seasonal"); assert.equal(s.extra_units, 30);
  assert.equal(promoOffer({ ...base, cover_weeks: 1, last_year_promo_lift: 7 })!.lift, 2.5, "lift is capped");
  assert.equal(promoOffer({ ...base, cover_weeks: 1 }), null);
  assert.equal(promoOffer({ ...base, promo_now: true }), null);
  assert.equal(promoOffer({ ...base, p50_next_week: 5 }), null, "fewer than 3 extra units is not worth a flyer slot");
});

const good: WeekEvidence = { week: "w", wape: 0.30, bias: 0.01, stockout_rate: 0.08 };
const bad: WeekEvidence = { week: "w", wape: 0.40, bias: 0.01, stockout_rate: 0.08 };
const fresh_ok: WeekEvidence = { week: "w", wape: 0.38, bias: 0.01, stockout_rate: 0.25 };

test("autonomy: L3 after eight consecutive passing weeks, fresh capped at L2", () => {
  const r = evaluateAutonomy(Array(8).fill(good), false);
  assert.equal(r.level, 3); assert.equal(r.eligible, true); assert.deepEqual(r.history.slice(6), [2, 3]);
  assert.equal(evaluateAutonomy(Array(7).fill(good), false).level, 2);
  assert.equal(evaluateAutonomy(Array(12).fill(good), true).level, 2);
  assert.equal(evaluateAutonomy(Array(7).fill(good), false).needs.startsWith("Eligible next week"), true);
  assert.equal(evaluateAutonomy(Array(3).fill(fresh_ok), true).needs.includes("latest week"), false, "fresh thresholds are looser: 38% WAPE and 25% stockouts pass");
  assert.equal(evaluateAutonomy(Array(3).fill(fresh_ok), false).passStreak, 0, "the same week fails the ambient thresholds");
  assert.equal(evaluateAutonomy([...Array(5).fill(good), bad, ...Array(7).fill(good)], false).level, 2, "a failing week resets the streak");
  assert.match(evaluateAutonomy([...Array(5).fill(good), bad, ...Array(7).fill(good)], false).needs, /Eligible next week/);
});

test("autonomy: one-week grace preserves L3, then two consecutive misses demote", () => {
  const r = evaluateAutonomy([...Array(8).fill(good), bad, bad], false);
  assert.equal(r.level, 2); assert.deepEqual(r.history.slice(-3), [3, 3, 2]); assert.equal(r.lostAt, "w");
  assert.equal(evaluateAutonomy([...Array(8).fill(good), bad, good], false).level, 3, "one bad week is tolerated");
  const overridden = { ...good, override_rate: AUTONOMY_RULES.ambient.override + 0.01 };
  assert.equal(evaluateAutonomy([...Array(8).fill(good), overridden, overridden], false).level, 2);
  assert.equal(evaluateAutonomy([...Array(8).fill(good), { ...good, bias: -0.06 }, { ...good, bias: -0.06 }], false).level, 2);
});
