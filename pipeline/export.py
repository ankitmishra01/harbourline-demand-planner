"""Export compact JSON for the planner app (app/public/data/)."""
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

import business_case as bc
import simulate as sim

ROOT = Path(__file__).resolve().parents[1]
GEN, RES = ROOT / "data" / "generated", ROOT / "data" / "results"
APP = ROOT / "app" / "data"   # inside the app (not public/): served only by the gated /api/data route
SEED = 7
FRESH = {"Produce", "Dairy & Eggs", "Bakery", "Meat & Seafood"}
DEPARTMENT = {"Produce": "Fresh", "Dairy & Eggs": "Fresh", "Bakery": "Fresh", "Meat & Seafood": "Fresh",
              "Frozen": "Frozen", "Pantry": "Grocery", "Beverages": "Grocery", "Household": "Grocery"}
# Supply source, lead time (days from order to shelf) and case pack by category. Synthetic but typical.
SUPPLY = {"Produce": ("DC Fresh", 1, 10), "Dairy & Eggs": ("Direct store delivery", 2, 12), "Bakery": ("Direct store delivery", 1, 6),
          "Meat & Seafood": ("DC Fresh", 1, 6), "Frozen": ("DC Frozen", 3, 12), "Pantry": ("DC Ambient", 3, 12),
          "Beverages": ("Direct store delivery", 2, 6), "Household": ("DC Ambient", 3, 6)}
DAILY_ORDER = {"Produce", "Bakery", "Meat & Seafood"}
# Subcategory by keyword, first match wins; the last entry is the default.
SUBCATEGORY = {
    "Produce": [("Fruit", ["banana", "apple", "avocado", "strawberr", "blueberr", "lemon", "grape", "mandarin"]), ("Vegetables", [])],
    "Dairy & Eggs": [("Eggs", ["egg"]), ("Cheese", ["cheddar", "mozzarella", "brie", "parmesan", "cheese"]),
                     ("Yogurt and cultured", ["yogurt", "skyr", "sour cream", "kefir"]), ("Butter", ["butter"]), ("Milk and cream", [])],
    "Bakery": [("Sweet goods", ["croissant", "cinnamon", "pie", "muffin", "brioche"]), ("Bread and rolls", [])],
    "Meat & Seafood": [("Seafood", ["salmon", "shrimp", "tilapia"]), ("Pork", ["pork", "bacon", "ham", "sausage"]),
                       ("Beef and lamb", ["beef", "steak", "lamb"]), ("Poultry", [])],
    "Frozen": [("Frozen desserts", ["ice cream", "popsicle"]), ("Frozen fruit and vegetables", ["peas", "berries", "vegetable", "mango", "fries", "hash"]),
               ("Frozen meals", [])],
    "Pantry": [("Breakfast and snacks", ["cereal", "granola", "crackers", "oats", "coffee", "tea", "maple", "peanut"]),
               ("Baking", ["flour", "sugar", "oil", "stuffing"]), ("Pasta and rice", ["spaghetti", "rice", "mac and"]), ("Canned and jarred", [])],
    "Beverages": [("Juice", ["juice"]), ("Coffee, tea and cocoa", ["coffee", "kombucha", "chocolate"]), ("Soft drinks and water", [])],
    "Household": [("Paper", ["paper", "tissue"]), ("Cleaning", ["soap", "detergent", "pods", "cleaner", "sponge"]), ("Wraps and bags", [])],
}
EXCEPTION_WEIGHT = {"stockout": 5, "spoilage": 3, "deviation": 3, "new": 2, "promo": 2, "low_dos": 2, "holiday": 1}


def r(x, n=1):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), n)


def suggested_order(p50, sigma, on_hand, on_order, z):
    """Forecast plus safety stock, less what is already on hand or on order (never below zero)."""
    safety = z * sigma
    return max(0, math.ceil(p50 + safety - on_hand - on_order)), safety


def round_to_case(units, case_pack):
    """Round an order up to whole cases."""
    return int(math.ceil(units / case_pack) * case_pack) if units > 0 else 0


def subcategory(category, name):
    n = name.lower()
    for sub, keys in SUBCATEGORY[category]:
        if not keys or any(k in n for k in keys):
            return sub
    return SUBCATEGORY[category][-1][0]


def upc(i):
    """Synthetic 12-digit UPC-A in the restricted '2' range (in-store use), with a valid check digit."""
    body = f"20618{i:06d}"
    odd = sum(int(d) for d in body[0::2])
    even = sum(int(d) for d in body[1::2])
    return body + str((10 - (odd * 3 + even) % 10) % 10)


# Review rules. An item goes to the planner only when one of these fires; everything else is
# auto-approved. Thresholds are shown on the About page.
RULES = {
    "stockout":  "Stock on hand runs out before the next delivery can land (days of supply on hand < lead time) with nothing on order, for items selling 3 or more units a day.",
    "low_dos":   "Weekly-ordered item (not produce, bakery or meat, which are ordered daily) with days of supply on hand and on order below lead time + review period, and a suggested order of 1.5 weeks of forecast or more.",
    "deviation": "Forecast differs from the last four weeks' average by more than two sigma and by more than 25%, excluding promo and holiday weeks.",
    "spoilage":  "Fresh item where the suggested order leaves projected spoilage of at least 5 units and 10% of the forecast.",
    "promo":     "A flyer promotion starts this week with a category lift of 20% or more (a promotion already running is not re-flagged).",
    "holiday":   "A statutory holiday week with a category lift of 25% or more.",
    "new":       "Launched within the last ten weeks, so the forecast still leans on a reference item.",
}


def exceptions(*, p50_1, sigma, recent4, dos, dos_on_hand, lead, review_days, order_units, on_order, spoil, promo_now, promo_prev, promo_lift_cat,
               holiday, hol_lift, new):
    ex = []
    if dos_on_hand < lead and on_order == 0 and p50_1 >= 21:
        ex.append("stockout")
    elif review_days > 1 and dos < lead + review_days and order_units >= 1.5 * p50_1 and p50_1 >= 21:
        ex.append("low_dos")
    if recent4 > 0 and abs(p50_1 - recent4) > 2 * sigma and abs(p50_1 - recent4) / recent4 > 0.25:
        ex.append("deviation")
    if spoil >= 5 and spoil >= 0.10 * p50_1:
        ex.append("spoilage")
    if promo_now and not promo_prev and promo_lift_cat >= 1.20:
        ex.append("promo")
    if holiday and hol_lift >= 1.25:
        ex.append("holiday")
    if new:
        ex.append("new")
    return ex


def priority(ex, dos_on_hand, lead):
    """High: stock runs out before a delivery can land, or spoilage. Medium: any other exception. Low: none."""
    if "stockout" in ex or "spoilage" in ex:
        return "High"
    return "Medium" if ex else "Low"


def business_case_block(measured):
    cases = {name: bc.scenario(i) for i, name in enumerate(["low", "base", "high"])}
    cumulative = {name: [round(c, 3) for c in bc.flows(s["total"])[2]] for name, s in cases.items()}
    pilot = bc.levers(measured["sales_uplift"], measured["waste_cut"], measured["inv_cut"])
    block = {"assumptions": {"revenue_m": bc.REVENUE, "stores": bc.STORES, "margin": bc.MARGIN, "waste_pct": bc.WASTE_PCT,
                             "inventory_m": bc.INVENTORY, "carry": bc.CARRY, "discount_rate": bc.DISC,
                             "sales_uplift": bc.SALES_UPLIFT, "waste_cut": bc.WASTE_CUT, "inv_cut": bc.INV_CUT},
             "breakeven_m": bc.breakeven(), "investment_m": sum(bc.INVEST), "run_cost_m": bc.RUN_COST[-1],
             "costs_m": {"blueprint": bc.BLUEPRINT, "pilot": bc.POC, "rollout": bc.SCALE_BUILD, "run_per_year": bc.RUN_COST[-1]},
             "cumulative_cash_m": cumulative, "scenarios": {}}
    for name, s in list(cases.items()) + [("mock_pilot", pilot)]:
        block["scenarios"][name] = {**{k: round(v, 4) for k, v in s.items()}, "npv_m": round(bc.npv(s["total"]), 3),
                                    "payback_years": None if bc.payback(s["total"]) is None else round(bc.payback(s["total"]), 2)}
    block["measured_levers"] = {k: round(v, 4) for k, v in measured.items()}
    return block


def main():
    rng = np.random.default_rng(SEED)
    sales = pd.read_csv(GEN / "sales.csv.gz")
    prod = pd.read_csv(GEN / "products.csv")
    stores = pd.read_csv(GEN / "stores.csv")
    meta = json.load(open(GEN / "meta.json"))
    fc = pd.read_csv(RES / "forecasts.csv")
    bt = pd.read_csv(RES / "backtest.csv")
    bycat = pd.read_csv(RES / "backtest_by_category.csv")
    ho = pd.read_csv(RES / "holdout.csv.gz")
    summary = json.load(open(RES / "summary.json"))
    hist_weeks = sorted(sales.dropna(subset=["units"]).week.unique())
    w1, w2 = meta["forecast_weeks"]
    z = summary["z_planner"]
    pinfo = prod.set_index("sku")

    APP.mkdir(parents=True, exist_ok=True)
    (APP / "store").mkdir(exist_ok=True)

    hsales = sales[sales.week.isin(hist_weeks)]
    hist = hsales.pivot_table(index=["store", "sku"], columns="week", values="units", aggfunc="first").reindex(columns=hist_weeks)
    normal = hsales.assign(units=hsales.units.where((hsales.promo == 0) & hsales.holiday.isna()))
    normal = normal.pivot_table(index=["store", "sku"], columns="week", values="units", aggfunc="first").reindex(columns=hist_weeks)
    last_price = hsales[hsales.week == hist_weeks[-1]].set_index(["store", "sku"]).price

    # Average promotion and holiday lift by category, measured from history, for the "why this forecast" breakdown.
    hs = hsales.merge(prod[["sku", "category"]], on="sku").dropna(subset=["units"])
    base_lvl = hs[(hs.promo == 0) & hs.holiday.isna()].groupby(["store", "sku"]).units.mean().rename("lvl")
    hs = hs.join(base_lvl, on=["store", "sku"])
    hs = hs[hs.lvl > 0]
    promo_lift = (hs[(hs.promo == 1) & hs.holiday.isna()].groupby("category").apply(lambda g: g.units.sum() / g.lvl.sum())).to_dict()
    hol_lift = hs[hs.holiday.notna()].groupby(["category", "holiday"]).apply(lambda g: g.units.sum() / g.lvl.sum()).to_dict()

    # Reference item for new products: the established item in the same category closest in price.
    established = prod[prod.launch_weeks_ago.isna()]
    reference = {}
    for p in prod[prod.launch_weeks_ago.notna()].itertuples():
        pool = established[established.category == p.category]
        reference[p.sku] = pool.iloc[(np.log(pool.price) - np.log(p.price)).abs().argmin()].sku

    hos = ho.set_index(["store", "sku"]).sort_index()
    ho_weeks = sorted(ho.week.unique())
    ho_last8 = ho[ho.week.isin(ho_weeks[-8:])]
    acc = ho_last8.groupby(["store", "sku"]).apply(
        lambda g: pd.Series({"wape": (g.units - g.selected).abs().sum() / max(g.units.sum(), 1),
                             "bias": (g.selected - g.units).sum() / max(g.units.sum(), 1)}))

    # Store KPIs on the 12-week holdout: what would have happened had orders followed the suggestion,
    # using the same shared simulation as the backtest (stock carried week to week, shelf-life spoilage).
    hk = ho.merge(sales[["week", "store", "sku", "price"]], on=["week", "store", "sku"]).merge(prod[["sku", "category", "shelf_life_days"]], on="sku")
    hk = hk.sort_values(["store", "sku", "week"]).reset_index(drop=True)
    _order, sold, spoiled, _left = sim.simulate(hk, hk.selected.values, hk.sigma.values, z)
    hk["sold"] = sold
    hk["waste_usd"] = spoiled * hk.price * (1 - bc.MARGIN)

    def kpis(g):
        return {"wape": round(float((g.units - g.selected).abs().sum() / g.units.sum()), 4),
                "bias": round(float((g.selected - g.units).sum() / g.units.sum()), 4),
                "in_stock": round(float(g.sold.sum() / g.units.sum()), 4),
                "spoilage": round(float(g.waste_usd.sum() / (g.sold * g.price).sum()), 4)}  # spoiled stock at cost, % of sales

    store_summ = []
    review_total = 0
    for st in stores.itertuples():
        items = []
        f = fc[fc.store == st.store].set_index(["sku", "week"])
        for p in prod.itertuples():
            if (st.store, p.sku) not in hist.index:
                continue
            h = hist.loc[(st.store, p.sku)].tolist()
            a, b = f.loc[(p.sku, w1)], f.loc[(p.sku, w2)]
            supplier, lead, case = SUPPLY[p.category]
            review_days = sim.REVIEW_DAYS[p.category]
            perishable = p.shelf_life_days <= 14
            recent = float(np.nanmean(h[-4:]))
            daily = max(a.p50 / 7, 0.01)
            # Opening position. Fresh items hold at most a few days of cover; ambient items can hold more.
            on_hand = int(round(recent * (rng.uniform(0.15, 0.6) if perishable else rng.uniform(0.4, 1.6))))
            # Stock on order exists only where the lead time makes it plausible: an order placed before the
            # week starts that lands within the lead time, so it counts toward the opening position.
            on_order = int(round(recent * rng.uniform(0.15, 0.5))) if (lead >= 2 and rng.random() < 0.45) else 0
            # Safety stock covers demand over the review period (daily-ordered categories need less).
            scale = sim.safety_scale(p.category)
            raw1, ss1 = suggested_order(a.p50, a.sigma * scale, on_hand, on_order, z)
            o1 = round_to_case(raw1, case)
            # Projected spoilage this week: stock beyond the remaining shelf-life cover, plus handling shrink.
            cover = max(p.shelf_life_days - 1, 0) / 7 * max(a.p50 + z * a.sigma * scale, 1) if perishable else float("inf")
            closing = max(0.0, on_hand + on_order + o1 - a.p50)
            spoil = int(round(max(0.0, closing - cover) + min(a.p50, on_hand + on_order + o1) * sim.HANDLING_SHRINK[p.category])) if perishable else 0
            # Week after: this week's order has landed, this week's forecast has sold, spoilage is gone.
            proj = max(0.0, closing - (max(0.0, closing - cover) if perishable else 0.0))
            raw2, ss2 = suggested_order(b.p50, b.sigma * scale, proj, 0, z)
            o2 = round_to_case(raw2, case)
            # Days of supply = stock / forecast daily demand. On order counts once it lands (after the lead time).
            dos_on_hand = on_hand / daily
            dos = (on_hand + on_order) / daily if dos_on_hand >= lead or on_order == 0 else dos_on_hand
            nrm = normal.loc[(st.store, p.sku)].dropna().tolist()[-13:]
            level = float(np.mean(nrm)) if nrm else float(a.p50)
            prev_promo = bool(hsales[(hsales.store == st.store) & (hsales.sku == p.sku) & (hsales.week == hist_weeks[-1])].promo.max())
            hol_now = a.holiday if isinstance(a.holiday, str) else (b.holiday if isinstance(b.holiday, str) else "")
            ex = exceptions(p50_1=a.p50, sigma=a.sigma, recent4=recent if not math.isnan(recent) else 0, dos=dos, dos_on_hand=dos_on_hand,
                            lead=lead, review_days=review_days, order_units=o1, on_order=on_order, spoil=spoil, promo_now=bool(a.promo), promo_prev=prev_promo,
                            promo_lift_cat=promo_lift.get(p.category, 1), holiday=bool(hol_now), hol_lift=hol_lift.get((p.category, hol_now), 1) if hol_now else 1,
                            new=not pd.isna(p.launch_weeks_ago))
            pri = priority(ex, dos_on_hand, lead)
            score = sum(EXCEPTION_WEIGHT[e] for e in ex) * math.log1p(o1 * (last_price.get((st.store, p.sku)) or p.price))
            hrow = hos.loc[(st.store, p.sku)] if (st.store, p.sku) in hos.index else None
            # Offer inputs: cover in weeks after this week's order lands, and how this item responded to a
            # promotion in the same weeks last year (units in the promo week / the item's normal level).
            cover_weeks = round((on_hand + on_order + o1) / max(a.p50, 1), 2)
            ly = hsales[(hsales.store == st.store) & (hsales.sku == p.sku)].set_index("week")
            ly_weeks = [w for w in hist_weeks[-52 - 1:-52 + 2] if w in ly.index] if len(hist_weeks) >= 54 else []
            ly_promo = ly.loc[ly_weeks] if ly_weeks else ly.iloc[0:0]
            ly_promo = ly_promo[ly_promo.promo == 1]
            ly_lift = round(float(ly_promo.units.mean() / level), 2) if len(ly_promo) and level > 0 else None

            def why(fr):
                promo = level * (promo_lift.get(p.category, 1) - 1) if fr.promo else 0.0
                hol = level * (hol_lift.get((p.category, fr.holiday), 1) - 1) if isinstance(fr.holiday, str) else 0.0
                return {"level": r(level), "promo": r(promo), "holiday": r(hol), "other": r(fr.p50 - level - promo - hol)}

            def fcw(fr, ss, raw, order, extra=None):
                return {"p10": r(fr.p10), "p50": r(fr.p50), "p90": r(fr.p90), "baseline": r(fr.baseline),
                        "promo": int(fr.promo), "discount": r(fr.discount, 2), "holiday": fr.holiday if isinstance(fr.holiday, str) else "",
                        "safety": r(ss), "raw_order": raw, "order": order, "why": why(fr), **(extra or {})}

            items.append({
                "sku": p.sku, "history": [None if (x is None or (isinstance(x, float) and math.isnan(x))) else int(x) for x in h],
                "price": r(last_price.get((st.store, p.sku)), 2), "cost": r((last_price.get((st.store, p.sku)) or p.price) * (1 - bc.MARGIN), 2),
                "on_hand": on_hand, "on_order": on_order,
                "days_of_supply": r(dos), "stockout_in_days": r(dos_on_hand) if dos_on_hand < 7 else None, "spoilage_units": spoil,
                "exceptions": ex, "priority": pri, "score": r(score, 2), "review_days": review_days,
                "cover_weeks": cover_weeks, "last_year_promo_lift": ly_lift,
                "accuracy": None if (st.store, p.sku) not in acc.index else {k: r(v, 3) for k, v in acc.loc[(st.store, p.sku)].items()},
                "fc": [fcw(a, ss1, raw1, o1) | {"week": w1}, fcw(b, ss2, raw2, o2, {"projected_on_hand": r(proj)}) | {"week": w2}],
                "holdout": None if hrow is None else {"actual": [int(x) for x in hrow.units.tolist()], "model": [r(x) for x in hrow.selected.tolist()],
                                                      "baseline": [r(x) for x in hrow.baseline.tolist()]},
            })
        review = sum(1 for i in items if i["exceptions"])
        review_total += review
        inv_value = sum(i["on_hand"] * (i["price"] or 0) * (1 - bc.MARGIN) for i in items)
        expected_cost = sum(i["fc"][0]["p50"] * (i["cost"] or 0) for i in items)
        open_to_buy = round(expected_cost * 1.10)        # simple weekly cash limit: cost of expected sales, plus 10%
        orders_cost = round(sum(i["fc"][0]["order"] * (i["cost"] or 0) for i in items))
        json.dump({"store": st.store, "items": items}, open(APP / "store" / f"{st.store}.json", "w"), separators=(",", ":"))
        store_summ.append({"store": st.store, "name": st.name, "city": st.city, "province": st.province, "region": st.region,
                           "orders_next_week": int(sum(i["fc"][0]["order"] for i in items)), "skus": len(items), "needs_review": review,
                           "inventory_value": round(inv_value), "open_to_buy": open_to_buy, "orders_cost": orders_cost,
                           **kpis(hk[hk.store == st.store])})

    # Autonomy evidence per category, from the 12-week holdout: accuracy, bias, and weeks in which the
    # simulated stock ran out. The autonomy ladder on the plan page is computed from this.
    hk["stockout"] = hk.sold < hk.units
    autonomy = {}
    for cat, g in hk.groupby("category"):
        weekly = g.groupby("week").apply(lambda w: pd.Series({
            "wape": (w.units - w.selected).abs().sum() / max(w.units.sum(), 1),
            "bias": (w.selected - w.units).sum() / max(w.units.sum(), 1),
            "stockout_lines": int(w.stockout.sum()), "lines": int(len(w))}))
        autonomy[cat] = {"weeks": [{"week": wk, "wape": round(float(r_.wape), 4), "bias": round(float(r_.bias), 4),
                                    "stockout_rate": round(float(r_.stockout_lines / r_.lines), 4)} for wk, r_ in weekly.iterrows()],
                         "wape": round(float((g.units - g.selected).abs().sum() / g.units.sum()), 4),
                         "bias": round(float((g.selected - g.units).sum() / g.units.sum()), 4),
                         "fresh": cat in FRESH, "review_days": sim.REVIEW_DAYS[cat]}

    # Chain-level holdout series (all stores, next-week forecasts) for the model comparison chart.
    chain = ho.groupby("week")[["units", "selected", "baseline"]].sum().reindex(ho_weeks)
    products = []
    for i, p in enumerate(prod.itertuples(), start=1):
        supplier, lead, case = SUPPLY[p.category]
        products.append({"sku": p.sku, "upc": upc(i), "name": p.name, "category": p.category, "department": DEPARTMENT[p.category],
                         "subcategory": subcategory(p.category, p.base_name), "supplier": supplier, "lead_time_days": lead, "case_pack": case,
                         "fresh": p.category in FRESH, "daily_order": p.category in DAILY_ORDER, "store_brand": bool(p.store_brand),
                         "shelf_life_days": int(p.shelf_life_days), "new": not pd.isna(p.launch_weeks_ago),
                         "launch_weeks_ago": None if pd.isna(p.launch_weeks_ago) else int(p.launch_weeks_ago),
                         "reference_sku": reference.get(p.sku)})
    out = {
        "generated_note": "All sales, stock and store data are synthetic, generated for a fictional mid-sized Canadian grocer.",
        "history_weeks": hist_weeks, "forecast_weeks": [w1, w2],
        "forecast_week_numbers": [int(pd.Timestamp(w).isocalendar().week) for w in (w1, w2)], "holdout_weeks": ho_weeks,
        "stores": store_summ, "products": products, "categories": sorted(prod.category.unique().tolist()),
        "selected_model": summary["selected"], "selection_rule": summary["selection_rule"], "z_planner": z, "rules": RULES,
        "review_days": sim.REVIEW_DAYS,
        "backtest": [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in row.items()} for row in bt.to_dict("records")],
        "backtest_by_category": [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in row.items()} for row in bycat.to_dict("records")],
        "chain_holdout": {"weeks": ho_weeks, "actual": [int(x) for x in chain.units], "model": [round(float(x)) for x in chain.selected],
                          "baseline": [round(float(x)) for x in chain.baseline]},
        "chain_kpis": kpis(hk),
        "autonomy_evidence": autonomy,
        "business_case": business_case_block(summary["measured_levers"]),
        "seasonality": meta["monthly_seasonality"],
    }
    json.dump(out, open(APP / "meta.json", "w"), separators=(",", ":"))
    size = sum(f.stat().st_size for f in APP.rglob("*.json"))
    n_items = sum(s["skus"] for s in store_summ)
    print(f"exported {len(store_summ)} stores, {len(products)} products, {size/1e6:.1f} MB of JSON; "
          f"{review_total}/{n_items} items need review ({review_total/n_items:.0%})")


if __name__ == "__main__":
    main()
