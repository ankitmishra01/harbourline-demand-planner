"""One weekly ordering simulation, shared by the backtest and the planner KPIs.

Stock carries from week to week. Each week the store orders up to a target of
forecast + safety stock, sells what demand allows, and whatever is left over carries
into the next week. Perishables spoil when stock outlasts its shelf life: any leftover
beyond what the shelf life can cover before the next week's demand is written off, and
a small handling shrink applies to everything sold. Ambient items only carry a cost of
capital. Safety stock is scaled by the review period: categories ordered daily in
store need far less cover than a category ordered once a week.

All costs use the business case assumptions (25% margin, 15% annual carrying rate).
"""
import math

import numpy as np

import business_case as bc

# Review period in days by category: how often the store places an order.
REVIEW_DAYS = {"Produce": 1, "Bakery": 1, "Meat & Seafood": 1, "Dairy & Eggs": 2,
               "Beverages": 2, "Frozen": 7, "Pantry": 7, "Household": 7}
# Handling shrink on units sold (damage, sampling, markdowns): fresh vs ambient.
HANDLING_SHRINK = {"Produce": 0.03, "Bakery": 0.03, "Meat & Seafood": 0.02, "Dairy & Eggs": 0.008,
                   "Beverages": 0.002, "Frozen": 0.002, "Pantry": 0.001, "Household": 0.001}


def safety_scale(category):
    """Safety stock covers demand over the review period, so it scales with sqrt(review / 7)."""
    return math.sqrt(REVIEW_DAYS[category] / 7.0)


def simulate(rows, pred, sigma, z):
    """Simulate weekly ordering for every (store, sku) series in `rows` (sorted by store, sku, week).

    rows must have: units, price, category, shelf_life_days and the group index columns.
    Returns per-row arrays: order, sold, spoiled, left (end-of-week stock)."""
    n = len(rows)
    order = np.zeros(n); sold = np.zeros(n); spoiled = np.zeros(n); left = np.zeros(n)
    demand = rows.units.values.astype(float)
    cats = rows.category.values
    shelf = rows.shelf_life_days.values.astype(float)
    target = np.clip(pred + z * np.array([safety_scale(c) for c in cats]) * sigma, 0, None)
    for _, ix in rows.groupby(["store", "sku"], sort=False).indices.items():
        carry = 0.0
        for i in ix:
            o = math.ceil(max(0.0, target[i] - carry))
            avail = carry + o
            s = min(demand[i], avail)
            rem = avail - s
            # Leftover beyond what the remaining shelf life can cover (measured in next week's expected
            # demand) spoils. Stock bought at the start of the week has already used a day on the shelf.
            cover = max(shelf[i] - 1.0, 0.0) / 7.0 * max(target[i], 1.0) if shelf[i] <= 14 else float("inf")
            sp = max(0.0, rem - cover) + s * HANDLING_SHRINK[cats[i]]
            sp = min(sp, rem + s * HANDLING_SHRINK[cats[i]])
            order[i], sold[i], spoiled[i], left[i] = o, s, sp, max(0.0, rem - max(0.0, rem - cover))
            carry = left[i]
    return order, sold, spoiled, left


def price_outcome(rows, order, sold, spoiled, left):
    """Dollar outcome of a simulation: lost margin, waste at cost, carrying cost of end-of-week stock."""
    price = rows.price.values
    cost = price * (1 - bc.MARGIN)
    demand = rows.units.values.astype(float)
    lost = demand - sold
    lost_margin = lost * price * bc.MARGIN
    waste = spoiled * cost
    carry = left * cost * bc.CARRY / 52
    return {"lost_margin": float(lost_margin.sum()), "waste": float(waste.sum()), "carry": float(carry.sum()),
            "total": float((lost_margin + waste + carry).sum()), "revenue": float((demand * price).sum()),
            "sales": float((sold * price).sum()), "lost_revenue": float((lost * price).sum()),
            "stock_value": float((left * cost).sum()), "units": float(demand.sum()), "sold_units": float(sold.sum())}
