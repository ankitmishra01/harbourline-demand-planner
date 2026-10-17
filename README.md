# Harbourline Foods demand planner (prototype)

> Prototype built by Ankit Mishra. Harbourline Foods is a fictional retailer; all data is synthetic and calibrated to public Statistics Canada series. Not affiliated with, or built for, any company.

**Live demo:** https://harbourline-demand-planner.vercel.app (no sign-in). The site holds no user data: decisions, sent orders and offers live in the browser.

A better forecast tells each store how much to order. This prototype shows the three steps of a store forecasting pilot on 24 months of synthetic data for Harbourline Foods, a fictional mid-sized Canadian grocer (300 stores, $200M revenue):

1. **Look at past sales, promotions and holidays:** 104 weeks of weekly sales for 20 pilot stores and 136 products, calibrated to public Statistics Canada series.
2. **Predict demand for each store and product:** a "same week last year" baseline, a classic time series model, gradient-boosted machine learning and hierarchical reconciliation, tested on a 12-week holdout and judged in dollars.
3. **Tell planners what to order:** a store order screen with the forecast for next week and the week after, a P10 to P90 range, stock on hand and on order, and a suggested order rounded to the case pack, reviewed by exception. Approved orders go out as one purchase order per supplier, and each category earns autonomy from evidence (see [After approval](#after-approval-sending-orders-and-earning-autonomy)).

The Business case page works the numbers through from a small set of stated assumptions: $1.06M a year (low $0.72M, high $1.40M), payback in 2.7 years, and the $0.70M go/no-go line.

![Planner, desktop](docs/screenshots/planner-desktop.png)

| Order review drawer | Model comparison | Business case |
|---|---|---|
| ![Planner detail](docs/screenshots/planner-drawer-desktop.png) | ![Models](docs/screenshots/models-desktop.png) | ![Business case](docs/screenshots/business-case-desktop.png) |

Phone width: [planner](docs/screenshots/planner-mobile.png) · [models](docs/screenshots/models-mobile.png) · [business case](docs/screenshots/business-case-mobile.png) · [delivery plan](docs/screenshots/plan-mobile.png) · [security](docs/screenshots/security-mobile.png) · [about](docs/screenshots/about-mobile.png) · [landing](docs/screenshots/landing-mobile.png)

## Presenting this demo (five minutes)

1. **Open the planner** from the landing page. It lands on Store S09, Toronto Leslieville.
2. **Store order review.** Point at the yellow tile: 24 of 136 items need a planner this week; the rest are auto-approved. The table is sorted needs-review first, then priority, then days of supply. Read one High row aloud: stock runs out before the next delivery.
3. **Open an item** (click a row). Walk the drawer top to bottom: forecast vs actual with the P10–P90 band, "why this forecast", the order calculation, inventory position, fresh spoilage, and the suggested offer if there is one.
4. **Accept or override.** Accept one suggestion; override another with a reason. Show the change log filling up.
5. **Send orders.** "Review and send" is blocked while exceptions remain; use "Accept the N remaining" then review the sheet: one purchase order per supplier, lead time, expected delivery, open-to-buy check. Send. Watch the Sent orders cards move Sent → Acknowledged (20 s) → Shipped (60 s) → Received.
6. **Autonomy ladder** (chip beside the search box). Thresholds on top, evidence per category below: Pantry earned L3 in the backtest and lost it; fresh stays at L2.
7. **Suggested offers.** Markdowns on fresh stock that will outlast its shelf life; flyer candidates with excess cover or a strong lift last year. Accept one, dismiss one with a reason.
8. **Business case.** Three levers, $1.06M against the $0.70M line, payback 2.7 years; the synthetic backtest is labelled illustrative. Close on the Delivery plan: seven weeks, three checkpoints, and how the pieces connect.

"Clear demo changes" on the planner page resets the browser state between runs.

## Pages

| Page | What it shows | Where it sits in the plan |
|---|---|---|
| Landing | What the prototype is, the three steps, and links into every page | |
| **Planner** | Store picker, "Order for Wk 43 / Wk 44", KPI strip (WAPE, bias, in-stock, spoilage, inventory value), search by item, SKU or UPC, Department › Category › Subcategory, status, exception, fresh, promo and supplier filters; order table sorted needs-review → priority → days of supply; accept or override with a reason code; change log; send orders (one PO per supplier, open-to-buy check, simulated supplier replies); autonomy ladder per category; suggested markdowns and flyer candidates; item drawer with forecast vs actual, "why this forecast", order calculation, inventory position, fresh info, offers and item accuracy | Pilot, shadow mode |
| Model comparison | Four steps ("start simple, test honestly"), results table, winner per category, the "sales are not demand" watch-out | Discovery week 5 checkpoint |
| Business case | Three levers, cumulative cash, costs, low/base/high, break-even, comparison with published results, and the synthetic backtest (illustrative) | Discovery week 7 checkpoint |
| Delivery plan | The 7-week discovery plan and three checkpoints, six risks, pilot and adoption, how the planner connects to the ordering system and how autonomy is earned | The whole journey |
| Data & security | Canadian residency, encryption, role-based access, monitoring, integration and write access, sign-off at weeks 5 and 7 | Sixth risk |
| About | Data, models, review rules and thresholds, formulas, design references, limits | |

## Results (12-week holdout, 20 stores × 136 products, synthetic data)

| Model | Error next week (WAPE) | Error week after | Bias | Total cost (12 wks) | Saved vs baseline |
|---|---|---|---|---|---|
| Same as last week (naive) | 41.3% | 42.3% | -3.3% | $430K | costs $22K more |
| Same week last year (baseline) | 39.7% | 40.0% | -3.7% | $408K | — |
| Classic time series (damped exponential smoothing) | 31.5% | 32.1% | -4.6% | $373K | $35K (8.6%) |
| Gradient-boosted machine learning **(selected)** | 28.7% | 28.9% | -2.1% | $319K | $89K (21.9%) |
| Hierarchical (ML reconciled store to region to national) | 28.6% | 28.8% | -2.1% | $318K | $91K (22.2%) |

Winner by category (lowest dollar cost): Bakery: hierarchical, Beverages: hierarchical, Dairy & Eggs: ML, Frozen: classic, Household: ML, Meat & Seafood: hierarchical, Pantry: hierarchical, Produce: ML.

Planner KPIs across the 20 stores, simulated on the holdout with suggested orders, stock carried week to week and shelf-life spoilage ([`pipeline/simulate.py`](pipeline/simulate.py)): in-stock 92.8%, spoilage at cost 1.5% of sales (fresh categories 2% to 4%, ambient near zero), against a chain-wide 2% in the business case. Produce, bakery and meat are ordered daily, dairy and beverages every two days, the rest weekly; safety stock covers the review period, not a full week.

**Selection rule:** among models that beat the baseline in dollars, pick the simplest one whose savings are within 10% of the best. Result: **gradient-boosted machine learning**. Hierarchical reconciliation saves slightly more but not enough to justify the extra moving part.

Error is WAPE (total absolute error / total units). Dollars come from simulating each week's order (forecast + one standard deviation of safety stock, scaled to the category's review period) with stock carried week to week, and pricing lost margin on empty shelves (25% margin), spoiled perishables (stock that outlasts its shelf life, at cost, plus a small handling shrink) and carrying cost (15% a year), the same assumptions as the business case.

These are illustrative. Synthetic data has cleaner promotion and holiday signals than real data, and the "same week last year" baseline over-orders on it, so the measured levers (sales +2.0%, waste −30%, stock −26%) sit well above the plan's base case. Discovery replaces every assumption with Harbourline's own data.

## How it maps to the business case

| | Low | Base | High | Synthetic backtest |
|---|---|---|---|---|
| Sell more (revenue × uplift × 25% margin) | $0.25M | $0.38M | $0.50M | $1.00M |
| Throw out less (revenue × 2% waste × cut) | $0.32M | $0.46M | $0.60M | $1.21M |
| Hold less stock ($20M × cut × 15%) | $0.15M | $0.23M | $0.30M | $0.77M |
| **Profit a year** | **$0.72M** | **$1.06M** | **$1.40M** | **$2.98M** |
| Pays back (years) | 3.9 | 2.7 | 2.2 | |
| 5-year NPV at 10% | $0.06M | $1.05M | $2.04M | |

Costs: discovery $0.175M, pilot $0.45M, rollout $0.60M (total $1.23M), then $0.25M a year to run. Break-even (go/no-go): **$0.70M a year**. Formulas live in [`pipeline/business_case.py`](pipeline/business_case.py) and are tested in [`tests/test_business_case.py`](tests/test_business_case.py).

### How the levers compare with published results (vendor-reported)

| Lever | Base case | Published |
|---|---|---|
| Sell more | +0.75% | Shelf Engine +1.9% in a controlled test ([case study](https://www.shelfengine.com/wp-content/uploads/2024/01/Bagged-Salads_-1-Page-Case-Study.pdf)); Afresh about +3% ([store ordering](https://afresh.com/solutions/store-ordering)) |
| Throw out less | −11.5% | RELEX with Booths about −10%; vendor claims of 25% to 50% ([RELEX](https://www.relexsolutions.com/resources/inventory-planning-software/)) |
| Hold less stock | −7.5% | Morrisons 2 to 3 fewer days of stock ([Blue Yonder case study](https://edge.sitecorecloud.io/blueyonderie8e6-corporateefb0-prod6ccb-be06/media/project/blueyonder/corporate/files/customers/morrisons-01.pdf)); ICA safety stock −32% ([RELEX](https://www.relexsolutions.com/news/ica-sverige-enhances-inventory-efficiency-and-forecast-accuracy-with-relex/)) |

Our levers sit at or below the low end of published results, so the case is conservative.

## The data

Everything about the stores, products, sales and stock is **synthetic**, generated by [`pipeline/generate_data.py`](pipeline/generate_data.py) with a fixed seed (20261017).

| Input | Source | Status |
|---|---|---|
| Monthly seasonality of grocery sales | Statistics Canada, Table 20-10-0056-01, supermarkets and other grocery retailers, unadjusted, vector v1446859503 ([table](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2010005601)), retrieved 2026-10-17 into [`data/public/`](data/public) | Real |
| Price drift | Statistics Canada, Table 18-10-0004-01, CPI food purchased from stores, vector v41690975 ([table](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401)): 183.1 (Sep 2023) to 199.6 (Aug 2026) | Real |
| Holidays | Canadian statutory holidays (New Year, Good Friday/Easter, Victoria Day, Canada Day, Labour Day, Thanksgiving, Christmas), computed per year; category lifts are assumptions | Calendar real, lifts assumed |
| Weather | Approximate 1991–2020 monthly temperature normals for one city per region (Environment and Climate Change Canada, Canadian Climate Normals family), rounded, plus random weekly anomalies | Approximate |
| Promotions, lifts, shrink, case packs, lead times, suppliers, on hand, on order, UPCs | Typical ranges chosen for the demo (UPCs use the restricted "2" prefix for in-store codes) | Assumed |

20 stores across Atlantic, Québec, Ontario, Prairies and BC; 136 products in 8 categories; six products launched in the last ten weeks test the new item case; demand is negative binomial around a seasonal, promotional, holiday and weather adjusted mean. Ambient products (shelf life at least 30 days) use dispersion 18 while short-life fresh products use 8. This class-based calibration was chosen over relaxing the autonomy rule because published ambient grocery error is materially below fresh and the prior synthetic noise floor obscured earned autonomy. The fixed seed keeps the result reproducible.

## The models ([`pipeline/train_backtest.py`](pipeline/train_backtest.py))

- **Naive (reference only):** same as last week.
- **Baseline:** same week last year (seasonal naive); recent average for items without a year of history.
- **Classic:** damped Holt exponential smoothing on each series, deseasonalised by a category week-of-year index.
- **Machine learning:** scikit-learn `HistGradientBoostingRegressor` with a Poisson loss, the same histogram gradient boosting family as LightGBM (LightGBM's native library would not load on the build machine, so the scikit-learn implementation is used). Features: promotion, discount, price, holiday, temperature and anomaly, week of year, lags shifted by the forecast gap, rolling means, and the category's rolling mean in the store.
- **Hierarchical:** the ML store forecasts blended with a region-level model and shared back to stores in proportion.
- **New products:** the category features let a new item start from similar products' pattern; the planner shows the closest reference item.
- **Ranges and orders:** P10/P90 from validation-period errors per series; suggested order = P50 + 1.28 × σ × √(review days ÷ 7) (about a 90% service level over the category's review period) − on hand − on order, rounded up to whole cases. For the week after, on hand is projected from today's stock, this week's order, this week's forecast and spoilage, so nothing is counted twice. Days of supply = stock ÷ (forecast ÷ 7); stock on order counts only when it lands before the shelf runs empty.

## Review rules and thresholds ([`pipeline/export.py`](pipeline/export.py))

An item needs review when at least one rule fires; everything else is auto-approved. The rules are tuned so a typical store reviews 15% to 20% of its items (chain-wide 15.6%, 424 of 2,720 item-store lines).

| Exception | Rule |
|---|---|
| Projected stockout | Days of supply on hand < lead time, nothing on order, item sells 3+ units a day |
| Low days of supply | Weekly-ordered item with days of supply (on hand + on order) < lead time + review period and a suggested order ≥ 1.5 weeks of forecast |
| Forecast vs sales deviation | Forecast differs from the last four weeks' average by > 2σ and > 25%, outside promo and holiday weeks |
| High spoilage risk | Fresh item where the suggestion leaves projected spoilage ≥ 5 units and ≥ 10% of forecast |
| Promo week | A flyer promotion starts this week with a category lift ≥ 20% |
| Holiday week | A statutory holiday week with a category lift ≥ 25% |
| New item | Launched within the last ten weeks |

Priority: **High** when the stockout or spoilage rule fires (64 lines chain-wide), **Medium** for any other exception (365), **Low** otherwise. The invariants behind the screen (whole cases, P10 ≤ P50 ≤ P90, "why" parts sum to the forecast, the days-of-supply formula, no double counting for the week after, real calendar weeks, the review-rate band and the spoilage band) are tested in [`tests/test_planner_data.py`](tests/test_planner_data.py).

## After approval: sending orders and earning autonomy

| Send sheet | Sent orders | Autonomy ladder |
|---|---|---|
| ![Send sheet](docs/screenshots/planner-send-sheet-desktop.png) | ![Sent orders](docs/screenshots/planner-sent-orders-desktop.png) | ![Autonomy](docs/screenshots/planner-autonomy-desktop.png) |

- **Send orders.** Once every exception is decided, the planner reviews one purchase order per supplier or DC (lines, cases, cost at cost price, lead time, expected delivery, lines changed) and the week's spend against the store's open-to-buy (cost of expected sales × 1.10 in the prototype). Sending is simulated: each PO gets a number and moves Sent → Acknowledged (EDI 855, 20 s) → Shipped (EDI 856, 60 s) → Received (delivery date or 120 s), with the stage derived from the send time so a reload keeps it. The Delivery plan page shows the real loop: planner app → ordering/ERP (API or EDI 850) → acknowledgement → ship notice → goods receipt → nightly feed back.
- **Autonomy ladder.** L1 planner approves every line (shadow mode) · L2 exceptions only (this screen) · L3 autonomous replenishment with veto. Thresholds are set per category class, because ambient items forecast better and stock out less than fresh: ambient WAPE ≤ 35%, bias ± 5%, overrides ≤ 5% of lines, stockouts ≤ 10% of lines; fresh WAPE ≤ 40%, stockouts ≤ 30%. A category moves up after eight consecutive passing weeks. Once promoted, one failing week is a grace week; two consecutive failures demote it. Levels are computed week by week from the 12-week backtest ([`app/src/lib/logic.ts`](app/src/lib/logic.ts)), never set by hand. **Option A was used:** the generator now gives all ambient products a lower, class-based noise level instead of weakening this evidence rule. Household passes all 12 weeks and is L3 (12-week WAPE 27.7%, bias +0.8%, worst-week stockouts 8.8%). Frozen is L2 with five current passing weeks after a +6.4% bias miss; Pantry is L2 after consecutive bias and stockout misses; Beverages is L2 because stockouts remain above 10%; fresh categories remain L2 by design. The panel's "what it needs to move up" column shows the exact evidence and grace/demotion rule. The pilot sets production bars at the week 5 checkpoint.
- **At L3** the agent checks inventory position, stock constraints, cash (open-to-buy), supplier constraints and the ordering system's acknowledgement, writes the order, logs its reasoning and posts a summary with a veto window. Objective: in-stock ≥ target, waste ≤ target, spend inside open-to-buy.
- **Suggested offers.** Markdown rule: fresh stock on hand beyond what the remaining shelf life can sell at the forecast rate (≥ 3 units), 30% off Thu–Sat, 80% expected to clear; shown as revenue recovered against the write-off avoided. Flyer rule: cover ≥ 2.5 weeks after this order, or last year's promo lift ≥ 1.3x (capped at 2.5x for the estimate). Accept or dismiss with a reason; both are logged like overrides, and at L3 they would be proposed by the agent automatically.

Phone width: [send sheet](docs/screenshots/planner-send-sheet-mobile.png) · [sent orders](docs/screenshots/planner-sent-orders-mobile.png) · [autonomy](docs/screenshots/planner-autonomy-mobile.png) · [offers](docs/screenshots/planner-offers-mobile.png). The PO builder, open-to-buy check, lifecycle timer, markdown and flyer rules and the autonomy evaluation (including demotion) are tested in [`app/tests/logic.test.ts`](app/tests/logic.test.ts).

## Design informed by industry practice

The order screen uses patterns grocery planning tools document publicly, not any vendor's interface or branding: forecast review by exception with automatic approval ([Oracle Retail Demand Forecasting, forecast review](https://docs.oracle.com/en/industries/retail/demand-forecasting/22.1.202.0/rdfcu/forecast-review-task.htm)); shelf life and spoilage for fresh ([RELEX fresh](https://www.relexsolutions.com/solutions/fresh-inventory/)); store ordering with planner overrides ([Afresh store ordering](https://afresh.com/solutions/store-ordering)); and prioritised order lists ([Lokad, economic purchase prioritization](https://docs.lokad.com/library/economic-purchase-prioritization)). Left out on purpose: truck fill, supplier portals, multi-step approvals, what-if tuning, a native mobile app, markdown optimisation and batch tracking.

## Run it locally

```bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python pipeline/generate_data.py     # ~10 s, writes data/generated/
.venv/bin/python pipeline/train_backtest.py    # a few minutes, writes data/results/
.venv/bin/python pipeline/export.py            # writes app/data/
.venv/bin/pytest -q

cd app && npm ci && npm test && npm run build
npm start                                            # or: npm run dev
```

The app is server-rendered so `/api/data/*` can read the exported JSON in `app/data/` at runtime. There is no sign-in and no environment variable to set.

Generated data, results and the app's JSON are committed, so the app builds without re-running the pipeline. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the tests and the app typecheck and build on every push, and can re-run the pipeline on demand.

## Structure

```
data/public/       Statistics Canada series used for calibration (with source, vector, URL, date)
data/generated/    synthetic sales, products, stores
data/results/      backtest, forecasts, holdout predictions
pipeline/          generate_data.py → train_backtest.py → export.py; business_case.py
tests/             order formula, exception rules, planner data invariants, generated data invariants, business case reproduction
app/               Next.js app (planner, models, business case, plan, security, about); src/lib/logic.ts holds the PO, offer and autonomy rules; app/data/ is the exported JSON served by /api/data
docs/              screenshots
```

## Deliberate simplifications

- **Weekly, not daily.** The target is every store, every product, every day; the prototype forecasts weekly to keep the demo small, and notes that produce, bakery and meat are ordered daily in store.
- **20 stores, 136 products.** The low end of the 20 to 30 store pilot, and a product sample rather than a full assortment.
- **Sales equal demand.** The synthetic data has no hidden lost sales, so the week 2 checkpoint ("can we tell lost demand from empty shelves?") is described, not tested.
- **Six risks.** Data security is treated as a delivery risk in its own right, alongside the five usual forecasting-programme risks.
- **The synthetic backtest is not the business case.** It implies $2.98M a year, above the business case's high case, only because generated data is clean and the baseline over-orders on it. The Business case page shows the planning figures; the backtest is labelled illustrative.

## Limitations

- Synthetic data: cleaner than real data, so the measured improvements are illustrative. Discovery replaces every assumption with Harbourline's own data.
- Sales equal demand here. With real data, empty shelves hide demand; the week 2 checkpoint tests whether stock records can recover it.
- Orders use a simple rule; production would add delivery schedules, minimum orders and shelf capacity.
- Decisions, sent orders and offers live in the browser only; in production planners would use the grocer's single sign-on and see their own stores. Nothing connects to a retailer system.
- Harbourline Foods, its stores, products and suppliers are invented for this prototype.
