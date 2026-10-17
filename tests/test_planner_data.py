"""Practicality invariants of what the planner shows (app/data, written by pipeline/export.py)."""
import json
from datetime import date, timedelta
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[1] / "app" / "data"


@pytest.fixture(scope="module")
def meta():
    return json.load(open(APP / "meta.json"))


@pytest.fixture(scope="module")
def stores(meta):
    return {s["store"]: json.load(open(APP / "store" / f"{s['store']}.json")) for s in meta["stores"]}


@pytest.fixture(scope="module")
def products(meta):
    return {p["sku"]: p for p in meta["products"]}


def every_item(stores):
    for sid, s in stores.items():
        for it in s["items"]:
            yield sid, it


def test_forecast_weeks_are_the_two_mondays_after_history(meta):
    last = date.fromisoformat(meta["history_weeks"][-1])
    w1, w2 = (date.fromisoformat(w) for w in meta["forecast_weeks"])
    assert last.weekday() == 0 and w1.weekday() == 0 and w2.weekday() == 0
    assert w1 == last + timedelta(days=7) and w2 == last + timedelta(days=14)
    assert meta["forecast_week_numbers"] == [w1.isocalendar()[1], w2.isocalendar()[1]]


def test_orders_are_whole_cases_and_never_negative(stores, products):
    for sid, it in every_item(stores):
        case = products[it["sku"]]["case_pack"]
        for f in it["fc"]:
            assert f["order"] >= 0 and f["order"] % case == 0, (sid, it["sku"])
            assert f["raw_order"] >= 0 and f["order"] >= f["raw_order"]
            assert f["order"] - f["raw_order"] < case, "rounded up by less than one case"
        assert it["on_hand"] >= 0 and it["on_order"] >= 0 and it["spoilage_units"] >= 0 and it["days_of_supply"] >= 0


def test_ranges_are_ordered(stores):
    for sid, it in every_item(stores):
        for f in it["fc"]:
            assert 0 <= f["p10"] <= f["p50"] <= f["p90"], (sid, it["sku"], f)
            assert f["safety"] >= 0


def test_why_components_sum_to_forecast(stores):
    for sid, it in every_item(stores):
        for f in it["fc"]:
            w = f["why"]
            assert abs(w["level"] + w["promo"] + w["holiday"] + w["other"] - f["p50"]) < 0.6, (sid, it["sku"])


def test_days_of_supply_formula(stores, products):
    for sid, it in every_item(stores):
        daily = it["fc"][0]["p50"] / 7
        if daily <= 0:
            continue
        lead = products[it["sku"]]["lead_time_days"]
        on_hand_only = it["on_hand"] / daily
        with_order = (it["on_hand"] + it["on_order"]) / daily
        expected = with_order if (on_hand_only >= lead or it["on_order"] == 0) else on_hand_only
        assert abs(it["days_of_supply"] - min(expected, 999)) < 0.11, (sid, it["sku"], it["days_of_supply"], expected)


def test_week_after_does_not_double_count(stores):
    # Projected on hand for the week after = on hand + on order + this week's order - this week's forecast - spoilage, floored at 0.
    for sid, it in every_item(stores):
        f1, f2 = it["fc"]
        proj = f2["projected_on_hand"]
        assert proj >= 0
        upper = it["on_hand"] + it["on_order"] + f1["order"] - f1["p50"]
        assert proj <= upper + 0.6, (sid, it["sku"], proj, upper)


def test_exception_rate_and_priorities(meta, stores):
    n = tot = 0
    for sid, s in stores.items():
        k = sum(1 for it in s["items"] if it["exceptions"])
        assert 0.08 <= k / len(s["items"]) <= 0.30, (sid, k)
        n += k; tot += len(s["items"])
        assert meta_store(meta, sid)["needs_review"] == k
    assert 0.10 <= n / tot <= 0.25, n / tot
    for sid, it in every_item(stores):
        ex = set(it["exceptions"])
        want = "High" if ex & {"stockout", "spoilage"} else "Medium" if ex else "Low"
        assert it["priority"] == want


def meta_store(meta, sid):
    return next(s for s in meta["stores"] if s["store"] == sid)


def test_spoilage_is_realistic(meta):
    assert 0.01 <= meta["chain_kpis"]["spoilage"] <= 0.03
    for s in meta["stores"]:
        assert 0.005 <= s["spoilage"] <= 0.04, s


def test_open_to_buy_per_store(meta, stores):
    for s in meta["stores"]:
        items = stores[s["store"]]["items"]
        expected = sum(it["fc"][0]["p50"] * it["cost"] for it in items)
        assert abs(s["open_to_buy"] - round(expected * 1.10)) <= 1
        assert s["orders_cost"] == round(sum(it["fc"][0]["order"] * it["cost"] for it in items))
        assert s["orders_cost"] < s["open_to_buy"] * 1.5, "suggested orders are not absurd against the cash limit"


def test_rules_and_evidence_exported(meta):
    assert set(meta["rules"]) == {"stockout", "low_dos", "deviation", "spoilage", "promo", "holiday", "new"}
    assert set(meta["autonomy_evidence"]) == set(meta["categories"])
    for e in meta["autonomy_evidence"].values():
        assert len(e["weeks"]) == len(meta["holdout_weeks"])
        for w in e["weeks"]:
            assert 0 <= w["wape"] <= 1 and -1 <= w["bias"] <= 1 and 0 <= w["stockout_rate"] <= 1
