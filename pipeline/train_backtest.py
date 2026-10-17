"""Train the forecasting models, backtest them on a 12-week holdout, and produce
next-week and week-after forecasts for every store and product.

Models (simplest first):
  0. Naive           "same as last week" (a reference point only, never selected)
  1. Baseline        "same week last year" (seasonal naive), the bar every model must beat
  2. Classic         damped Holt exponential smoothing on a deseasonalised series
  3. Machine learning gradient-boosted trees (histogram GBM, the LightGBM algorithm family)
                     with promotion, price, holiday, weather and lag features
  4. Hierarchical    the ML forecasts reconciled with a region-level model so that
                     store, region and national forecasts agree

The backtest is a rolling one-week-ahead (and two-weeks-ahead) evaluation: each week's
forecast only uses data available before that week. Models are compared on accuracy
(WAPE, bias) and on dollars: lost margin from empty shelves, waste of unsold perishables
and the cost of carrying extra stock, using the same assumptions as the business case.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

import business_case as bc
import simulate as sim

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "data" / "generated"
OUT = ROOT / "data" / "results"
HOLDOUT = 12
VALIDATION = 12
Z_ORDER = 1.0          # safety stock factor used to turn forecasts into orders in the backtest
Z_PLANNER = 1.28       # about a 90% service level for suggested orders in the app
MODEL_ORDER = ["baseline", "classic", "ml", "hierarchical"]
ALL_MODELS = ["naive"] + MODEL_ORDER
MODEL_LABEL = {"naive": "Same as last week (naive)", "baseline": "Same week last year (baseline)", "classic": "Classic time series (damped exponential smoothing)",
               "ml": "Gradient-boosted machine learning", "hierarchical": "Hierarchical (ML reconciled store to region to national)"}


def load():
    df = pd.read_csv(GEN / "sales.csv.gz")
    prod = pd.read_csv(GEN / "products.csv")
    stores = pd.read_csv(GEN / "stores.csv")
    meta = json.load(open(GEN / "meta.json"))
    df = df.merge(prod[["sku", "category", "store_brand", "shelf_life_days", "shrink_share", "price"]].rename(columns={"price": "list_price"}), on="sku") \
           .merge(stores[["store", "size_factor"]], on="store")
    weeks = sorted(df.week.unique())
    df["t"] = df.week.map({w: i for i, w in enumerate(weeks)})
    df = df.sort_values(["store", "sku", "t"]).reset_index(drop=True)
    return df, prod, stores, meta, weeks


def add_features(df, gap):
    """Lag features available `gap` weeks ahead of the target week."""
    g = df.groupby(["store", "sku"], sort=False).units
    df[f"lag{gap}"] = g.shift(gap)
    df[f"roll4_{gap}"] = g.transform(lambda s: s.shift(gap).rolling(4, min_periods=1).mean())
    df[f"roll13_{gap}"] = g.transform(lambda s: s.shift(gap).rolling(13, min_periods=1).mean())
    df["lag52"] = g.shift(52)
    df["weeks_live"] = df.groupby(["store", "sku"]).cumcount()
    cat = df.groupby(["store", "category", "t"]).units.transform("mean")
    df["_cat"] = cat
    df[f"cat_roll13_{gap}"] = df.groupby(["store", "sku"], sort=False)._cat.transform(lambda s: s.shift(gap).rolling(13, min_periods=1).mean())
    df["woy"] = pd.to_datetime(df.week).dt.isocalendar().week.astype(int)
    df["month"] = pd.to_datetime(df.week).dt.month
    df["temp_anom"] = df.temp_c - df.temp_normal_c
    return df


CAT_COLS = ["category", "region", "holiday"]


def feature_cols(gap):
    return ["size_factor", "store_brand", "shelf_life_days", "price", "list_price", "discount", "promo", "woy", "month",
            "temp_c", "temp_anom", "lag52", "weeks_live", f"lag{gap}", f"roll4_{gap}", f"roll13_{gap}", f"cat_roll13_{gap}"] + CAT_COLS


def to_matrix(df, cols):
    X = df[cols].copy()
    for c in CAT_COLS:
        X[c] = X[c].fillna("none").astype("category")
    X["store_brand"] = X.store_brand.astype(int)
    return X


def fit_gbm(train, gap, seed=7):
    cols = feature_cols(gap)
    m = HistGradientBoostingRegressor(loss="poisson", learning_rate=0.06, max_iter=500, max_leaf_nodes=48,
                                      min_samples_leaf=40, l2_regularization=1.0, categorical_features="from_dtype",
                                      random_state=seed)
    tr = train.dropna(subset=["units"])
    m.fit(to_matrix(tr, cols), tr.units)
    return m


def predict_gbm(m, rows, gap):
    return np.clip(m.predict(to_matrix(rows, feature_cols(gap))), 0, None)


def baseline_pred(df, gap):
    """Same week last year; products without a year of history use their recent average."""
    lag52 = df.lag52
    fallback = df[f"roll4_{gap}"].fillna(df[f"cat_roll13_{gap}"] * 0.5)
    return lag52.fillna(fallback).fillna(0).values


def naive_pred(df, gap):
    """Same as the latest known week."""
    return df[f"lag{gap}"].fillna(df[f"cat_roll13_{gap}"] * 0.5).fillna(0).values


def classic_pred(df, fit_until_t):
    """Damped Holt smoothing on series deseasonalised with a category week-of-year index.
    Returns one-step and two-step ahead predictions for every row (rolling updates)."""
    tr = df[df.t < fit_until_t].dropna(subset=["units"])
    cat_week = tr.groupby(["category", "woy"]).units.mean()
    cat_mean = tr.groupby("category").units.mean()
    idx = (cat_week / cat_mean.reindex(cat_week.index.get_level_values(0)).values).rename("idx")
    idx = idx.groupby(level=0, group_keys=False).apply(lambda s: s.rolling(3, center=True, min_periods=1).mean())
    idx = 0.5 + 0.5 * idx                       # shrink noisy one-year estimates toward 1
    season = df.set_index(["category", "woy"]).index.map(idx.to_dict()).to_numpy(dtype=float)
    season = np.where(np.isnan(season), 1.0, season)
    p1 = np.full(len(df), np.nan)
    p2 = np.full(len(df), np.nan)
    phi, beta = 0.9, 0.05
    for _, ix in df.groupby(["store", "sku"], sort=False).indices.items():
        y = df.units.values[ix] / season[ix]
        tt = df.t.values[ix]
        valid = ~np.isnan(y)
        if valid.sum() < 3:
            continue
        best = None
        for alpha in (0.1, 0.2, 0.35):
            l = b = None
            sse, f1, f2 = 0.0, np.full(len(y), np.nan), np.full(len(y), np.nan)
            for i in range(len(y)):
                if l is not None:
                    f1[i] = l + phi * b
                    if i + 1 < len(y):
                        f2[i + 1] = l + (phi + phi * phi) * b
                if np.isnan(y[i]):
                    continue
                if l is None:
                    l, b = y[i], 0.0
                    continue
                if tt[i] < fit_until_t:
                    sse += (y[i] - f1[i]) ** 2
                l_new = alpha * y[i] + (1 - alpha) * (l + phi * b)
                b = beta * (l_new - l) + (1 - beta) * phi * b
                l = l_new
            if best is None or sse < best[0]:
                best = (sse, f1, f2)
        p1[ix] = np.clip(best[1] * season[ix], 0, None)
        p2[ix] = np.clip(best[2] * season[ix], 0, None)
    return p1, p2


def reconcile(df, store_pred, region_pred):
    """Blend bottom-up store totals with an independent region-level model, then share the
    reconciled region total back to stores in proportion to their own forecasts."""
    tmp = df[["region", "sku", "t"]].copy()
    tmp["p"] = store_pred
    bottom_up = tmp.groupby(["region", "sku", "t"]).p.transform("sum")
    target = 0.5 * bottom_up + 0.5 * region_pred
    return np.where(bottom_up > 0, store_pred * target / bottom_up, store_pred)


def region_model(df, train_until_t, gap):
    agg = df.groupby(["region", "sku", "t", "week"], as_index=False).agg(
        units=("units", lambda s: s.sum(min_count=1)), price=("price", "mean"), list_price=("list_price", "first"),
        discount=("discount", "mean"), promo=("promo", "max"), holiday=("holiday", "first"), temp_c=("temp_c", "mean"),
        temp_normal_c=("temp_normal_c", "mean"), category=("category", "first"), store_brand=("store_brand", "first"),
        shelf_life_days=("shelf_life_days", "first"), size_factor=("size_factor", "sum"))
    agg = agg.rename(columns={"region": "store"}).assign(region=lambda d: d.store)
    agg = add_features(agg.sort_values(["store", "sku", "t"]).reset_index(drop=True), gap)
    m = fit_gbm(agg[agg.t < train_until_t], gap, seed=11)
    agg["pred"] = predict_gbm(m, agg, gap)
    look = agg.set_index(["store", "sku", "t"]).pred
    return df.set_index(["region", "sku", "t"]).index.map(look.to_dict()).to_numpy(dtype=float)


def dollars(rows, pred, sigma):
    """Simulate weekly ordering from a forecast (stock carried week to week, shelf-life
    spoilage, review-period safety stock) and price the outcome. See simulate.py."""
    order, sold, spoiled, left = sim.simulate(rows, pred, sigma, Z_ORDER)
    return sim.price_outcome(rows, order, sold, spoiled, left)


def wape(y, p):
    return float(np.abs(y - p).sum() / y.sum())


def bias(y, p):
    return float((p - y).sum() / y.sum())


def category_sigma(rows, pred):
    r = rows.assign(err=rows.units - pred)
    return r.groupby("category").err.apply(lambda e: float(np.sqrt(np.mean(e ** 2)))).to_dict()


def series_sigma(rows, pred):
    """Per-series error scale: category RMSE scaled by the series' relative volume (square root)."""
    cs = category_sigma(rows, pred)
    level = rows.groupby(["store", "sku"]).units.transform("mean")
    cat_level = rows.groupby("category").units.transform("mean")
    return rows.category.map(cs).values * np.sqrt(np.clip(level / cat_level, 0.1, 10)).values


def main():
    df, prod, stores, meta, weeks = load()
    n_hist = len(weeks) - 2
    H = n_hist - HOLDOUT            # first holdout week index
    V = H - VALIDATION              # first validation week index
    for gap in (1, 2):
        df = add_features(df, gap)

    hist = df[df.t < n_hist]
    preds = {1: {}, 2: {}}
    sig = {}
    # --- Validation pass (fit before V, measure errors on V..H-1) to size safety stock fairly.
    val = hist[(hist.t >= V) & (hist.t < H)]
    c1, c2 = classic_pred(df, V)
    gbm_v = fit_gbm(hist[hist.t < V], 1)
    reg_v = region_model(df, V, 1)
    vpred = {"naive": naive_pred(val, 1), "baseline": baseline_pred(val, 1), "classic": c1[val.index], "ml": predict_gbm(gbm_v, val, 1)}
    vpred["hierarchical"] = reconcile(val, vpred["ml"], reg_v[val.index])
    vpred = {k: np.nan_to_num(v) for k, v in vpred.items()}
    for k in ALL_MODELS:
        sig[k] = series_sigma(val, vpred[k])
    sig_lookup = {k: pd.Series(sig[k], index=pd.MultiIndex.from_frame(val[["store", "sku"]])).groupby(level=[0, 1]).first() for k in ALL_MODELS}

    # --- Holdout pass (fit before H, rolling one- and two-step forecasts on H..end of history).
    ho = hist[hist.t >= H]
    c1, c2 = classic_pred(df, H)
    for gap, cp in ((1, c1), (2, c2)):
        gbm = fit_gbm(hist[hist.t < H], gap)
        reg = region_model(df, H, gap)
        p = {"naive": naive_pred(ho, gap), "baseline": baseline_pred(ho, gap), "classic": cp[ho.index], "ml": predict_gbm(gbm, ho, gap)}
        p["hierarchical"] = reconcile(ho, p["ml"], reg[ho.index])
        preds[gap] = {k: np.nan_to_num(v) for k, v in p.items()}

    y = ho.units.values
    results = []
    ho_sig = {}
    for k in ALL_MODELS:
        s = ho.set_index(["store", "sku"]).index.map(sig_lookup[k].to_dict()).to_numpy(dtype=float)
        ho_sig[k] = s = np.nan_to_num(s, nan=float(np.nanmedian(s)))
        d = dollars(ho, preds[1][k], s)
        results.append({"model": k, "label": MODEL_LABEL[k], "wape_next_week": wape(y, preds[1][k]), "wape_week_after": wape(y, preds[2][k]),
                        "bias_next_week": bias(y, preds[1][k]), **{f"usd_{kk}": float(v) for kk, v in d.items()}})
    res = pd.DataFrame(results)
    base = res.set_index("model").loc["baseline"]
    res["usd_saved_vs_baseline"] = base.usd_total - res.usd_total
    res["pct_cost_cut"] = res.usd_saved_vs_baseline / base.usd_total

    # Selection rule: among models that beat the baseline in dollars, take the simplest whose
    # savings are within 10% of the best model's savings.
    beat = res[res.model.isin(MODEL_ORDER[1:]) & (res.usd_saved_vs_baseline > 0)]
    best_saving = beat.usd_saved_vs_baseline.max() if len(beat) else 0
    selected = next((m for m in MODEL_ORDER[1:] if m in set(beat.model) and
                     res.set_index("model").loc[m, "usd_saved_vs_baseline"] >= 0.9 * best_saving), "baseline")

    # By category: every model's accuracy and dollar cost, and the winner in dollars ("tournament").
    by_cat = []
    for cat, g in ho.groupby("category"):
        ix = ho.index.get_indexer(g.index)
        row = {"category": cat, "units": float(g.units.sum()),
               "wape_baseline": wape(g.units.values, preds[1]["baseline"][ix]),
               "wape_selected": wape(g.units.values, preds[1][selected][ix])}
        for k in ALL_MODELS:
            row[f"wape_{k}"] = wape(g.units.values, preds[1][k][ix])
            row[f"usd_{k}"] = float(dollars(g, preds[1][k][ix], ho_sig[k][ix])["total"])
        row["winner"] = min(MODEL_ORDER, key=lambda k: row[f"usd_{k}"])
        by_cat.append(row)

    # Measured levers on the pilot (selected vs baseline), expressed like the business case.
    sel = res.set_index("model").loc[selected]
    measured = {
        "sales_uplift": float((base.usd_lost_revenue - sel.usd_lost_revenue) / base.usd_revenue),
        "waste_cut": float((base.usd_waste - sel.usd_waste) / base.usd_waste) if base.usd_waste else 0.0,
        "inv_cut": float((base.usd_stock_value - sel.usd_stock_value) / base.usd_stock_value),
    }

    # --- Final forecasts: refit on all 104 weeks, forecast the next two weeks.
    fut = df[df.t >= n_hist]
    fc = {}
    c1, c2 = classic_pred(df, n_hist)
    for gap, cp in ((1, c1), (2, c2)):
        gbm = fit_gbm(hist, gap)
        reg = region_model(df, n_hist, gap)
        p = {"naive": naive_pred(fut, gap), "baseline": baseline_pred(fut, gap), "classic": cp[fut.index], "ml": predict_gbm(gbm, fut, gap)}
        p["hierarchical"] = reconcile(fut, p["ml"], reg[fut.index])
        fc[gap] = {k: np.nan_to_num(v) for k, v in p.items()}
    # For the week after, the two-step models apply; for next week, the one-step models.
    w1, w2 = sorted(fut.week.unique())
    out = fut[["week", "store", "sku", "category", "price", "promo", "discount", "holiday", "shelf_life_days"]].copy()
    out["p50"] = np.where(out.week == w1, fc[1][selected], fc[2][selected])
    out["baseline"] = np.where(out.week == w1, fc[1]["baseline"], fc[2]["baseline"])
    s_sel = out.set_index(["store", "sku"]).index.map(sig_lookup[selected].to_dict()).to_numpy(dtype=float)
    s_sel = np.nan_to_num(s_sel, nan=float(np.nanmedian(s_sel)))
    out["sigma"] = s_sel * np.where(out.week == w1, 1.0, 1.15)
    out["p10"] = np.clip(out.p50 - 1.2816 * out.sigma, 0, None)
    out["p90"] = out.p50 + 1.2816 * out.sigma

    OUT.mkdir(parents=True, exist_ok=True)
    res.to_csv(OUT / "backtest.csv", index=False)
    out.to_csv(OUT / "forecasts.csv", index=False)
    pd.DataFrame(by_cat).to_csv(OUT / "backtest_by_category.csv", index=False)
    # Holdout predictions for charts (selected and baseline, next week)
    ho_out = ho[["week", "store", "sku", "units"]].copy()
    ho_out["selected"] = preds[1][selected]
    ho_out["baseline"] = preds[1]["baseline"]
    ho_out["sigma"] = ho_sig[selected]
    ho_out.to_csv(OUT / "holdout.csv.gz", index=False, compression="gzip")
    json.dump({"selected": selected, "selection_rule": "Among models that beat the baseline in dollars, pick the simplest one whose savings are within 10% of the best.",
               "holdout_weeks": [weeks[H], weeks[n_hist - 1]], "validation_weeks": [weeks[V], weeks[H - 1]],
               "measured_levers": measured, "z_order_backtest": Z_ORDER, "z_planner": Z_PLANNER},
              open(OUT / "summary.json", "w"), indent=1)
    print(res[["model", "wape_next_week", "wape_week_after", "bias_next_week", "usd_total", "usd_saved_vs_baseline", "pct_cost_cut"]].round(3).to_string(index=False))
    print("selected:", selected, "| measured levers:", {k: round(v, 4) for k, v in measured.items()})


if __name__ == "__main__":
    main()
