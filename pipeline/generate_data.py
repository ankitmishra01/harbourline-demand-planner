"""Generate 24 months of synthetic weekly sales for a 20-store pilot.

Everything here is mock data for a fictional mid-sized Canadian grocer. Shapes are
calibrated to public Statistics Canada series saved in data/public/:
  * monthly seasonality of Canadian supermarket sales (Table 20-10-0056-01)
  * food-from-stores price inflation (CPI, Table 18-10-0004-01)
plus Canadian statutory holidays and approximate regional temperature normals.
The generator is seeded, so every run produces the same data.
"""
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "generated"
SEED = 20261017
N_WEEKS = 104
LAST_HISTORY_WEEK = date(2026, 10, 12)   # Monday of the last closed week
FORECAST_WEEKS = 2

# Approximate 1991-2020 climate normals, monthly mean temperature (°C), rounded.
# Source family: Environment and Climate Change Canada, Canadian Climate Normals.
# Values are approximations used only to shape weather sensitivity in mock data.
TEMP_NORMALS = {
    "Atlantic": [-5.9, -5.4, -1.6, 4.0, 9.6, 14.6, 18.5, 18.6, 14.8, 8.9, 3.4, -2.3],     # Halifax
    "Quebec":   [-9.7, -8.0, -2.5, 5.7, 13.0, 18.2, 20.9, 19.8, 15.3, 8.7, 2.3, -5.4],    # Montréal
    "Ontario":  [-5.5, -4.5, -0.1, 7.1, 13.1, 18.6, 21.5, 20.6, 16.2, 9.5, 3.7, -2.2],    # Toronto
    "Prairies": [-7.1, -5.4, -1.7, 4.4, 9.6, 13.7, 16.6, 16.0, 11.4, 5.2, -1.9, -6.0],    # Calgary
    "BC":       [4.1, 4.9, 6.9, 9.4, 12.8, 15.7, 18.0, 18.1, 15.1, 10.6, 6.3, 3.6],       # Vancouver
}

STORES = [
    # id, name, city, province, region, size factor
    ("S01", "Halifax Quinpool", "Halifax", "NS", "Atlantic", 1.10),
    ("S02", "Dartmouth Crossing", "Dartmouth", "NS", "Atlantic", 0.90),
    ("S03", "Moncton Mountain Rd", "Moncton", "NB", "Atlantic", 0.80),
    ("S04", "St. John's Kenmount", "St. John's", "NL", "Atlantic", 0.85),
    ("S05", "Montréal Plateau", "Montréal", "QC", "Quebec", 1.25),
    ("S06", "Laval Centropolis", "Laval", "QC", "Quebec", 1.05),
    ("S07", "Québec Sainte-Foy", "Québec City", "QC", "Quebec", 0.95),
    ("S08", "Gatineau Hull", "Gatineau", "QC", "Quebec", 0.85),
    ("S09", "Toronto Leslieville", "Toronto", "ON", "Ontario", 1.35),
    ("S10", "Mississauga Square One", "Mississauga", "ON", "Ontario", 1.20),
    ("S11", "Ottawa Glebe", "Ottawa", "ON", "Ontario", 1.00),
    ("S12", "London Masonville", "London", "ON", "Ontario", 0.90),
    ("S13", "Calgary Kensington", "Calgary", "AB", "Prairies", 1.15),
    ("S14", "Edmonton Whyte Ave", "Edmonton", "AB", "Prairies", 1.05),
    ("S15", "Winnipeg Osborne", "Winnipeg", "MB", "Prairies", 0.90),
    ("S16", "Saskatoon Broadway", "Saskatoon", "SK", "Prairies", 0.75),
    ("S17", "Vancouver Kitsilano", "Vancouver", "BC", "BC", 1.30),
    ("S18", "Burnaby Metrotown", "Burnaby", "BC", "BC", 1.10),
    ("S19", "Victoria Fort St", "Victoria", "BC", "BC", 0.85),
    ("S20", "Kelowna Orchard Park", "Kelowna", "BC", "BC", 0.80),
]

# category: (base weekly units per avg store, price range CAD, shelf life days,
#            shrink share of unsold units, promo probability per week, promo lift range,
#            temperature sensitivity per °C above normal, holiday sensitivity)
CATEGORIES = {
    "Produce":         (55, (1.5, 6.0), 7,   0.55, 0.10, (1.25, 1.60), 0.004, 1.2),
    "Dairy & Eggs":    (60, (2.5, 8.0), 14,  0.35, 0.08, (1.20, 1.45), 0.002, 1.1),
    "Bakery":          (40, (2.5, 7.5), 4,   0.65, 0.08, (1.20, 1.50), 0.000, 1.6),
    "Meat & Seafood":  (28, (6.0, 22.0), 5,  0.50, 0.10, (1.30, 1.70), 0.003, 1.8),
    "Frozen":          (24, (3.5, 11.0), 180, 0.03, 0.09, (1.25, 1.55), 0.010, 1.0),
    "Pantry":          (35, (1.5, 9.0), 365, 0.01, 0.07, (1.20, 1.50), -0.003, 1.2),
    "Beverages":       (45, (1.5, 9.5), 270, 0.01, 0.10, (1.25, 1.65), 0.015, 1.3),
    "Household":       (18, (3.0, 14.0), 720, 0.00, 0.06, (1.20, 1.45), 0.000, 1.0),
}

PRODUCT_NAMES = {
    "Produce": ["Bananas (per kg)", "Gala apples 3 lb", "Romaine hearts 3 pk", "Baby carrots 2 lb", "English cucumber",
                "Vine tomatoes (per kg)", "Russet potatoes 10 lb", "Yellow onions 3 lb", "Avocados 4 pk", "Strawberries 454 g",
                "Blueberries 510 g", "Baby spinach 312 g", "Broccoli crowns (per kg)", "Lemons 2 lb", "Red grapes (per kg)",
                "Mandarins 2 lb", "Sweet potatoes (per kg)", "Mushrooms 227 g", "Bell peppers 3 pk", "Celery stalks"],
    "Dairy & Eggs": ["2% milk 4 L", "Large eggs 12 pk", "Salted butter 454 g", "Greek yogurt 750 g", "Old cheddar 400 g",
                     "Mozzarella 340 g", "35% cream 473 ml", "Oat beverage 1.75 L", "Cottage cheese 500 g", "Sour cream 500 ml",
                     "Large eggs 30 pk", "Homo milk 2 L", "Brie wheel 200 g", "Skyr vanilla 650 g", "Lactose free milk 2 L",
                     "Parmesan grated 250 g", "Cream cheese 250 g", "Kefir 1 L"],
    "Bakery": ["Sourdough loaf", "Whole wheat sandwich bread", "Croissants 6 pk", "Bagels 6 pk", "Hamburger buns 8 pk",
               "Baguette", "Cinnamon rolls 6 pk", "Pumpkin pie 8 in", "Dinner rolls 12 pk", "Multigrain loaf",
               "Muffins 6 pk", "Tortillas 10 pk", "Apple pie 8 in", "Rye bread", "Brioche loaf"],
    "Meat & Seafood": ["Chicken breasts (per kg)", "Lean ground beef 1 lb", "Pork loin chops (per kg)", "Atlantic salmon fillet",
                       "Whole turkey (per kg)", "Bacon 375 g", "Chicken thighs (per kg)", "Striploin steak (per kg)",
                       "Pork sausages 500 g", "Shrimp 31/40 340 g", "Ham, spiral cut (per kg)", "Ground turkey 1 lb",
                       "Rotisserie chicken", "Beef stewing cubes (per kg)", "Lamb chops (per kg)", "Tilapia fillets 400 g"],
    "Frozen": ["Frozen pizza deluxe", "Vanilla ice cream 1.5 L", "Frozen peas 750 g", "Frozen berries 600 g", "French fries 1 kg",
               "Chicken nuggets 800 g", "Perogies 907 g", "Frozen lasagna 1 kg", "Ice cream sandwiches 6 pk",
               "Frozen vegetables mix 750 g", "Waffles 12 pk", "Fish sticks 700 g", "Frozen dumplings 600 g", "Popsicles 12 pk",
               "Frozen mango 600 g", "Veggie burgers 4 pk", "Hash browns 1 kg"],
    "Pantry": ["Spaghetti 900 g", "Basmati rice 2 kg", "Canned tomatoes 796 ml", "Peanut butter 1 kg", "Canola oil 3 L",
               "Maple syrup 540 ml", "Chicken noodle soup 284 ml", "Oats 1 kg", "All purpose flour 2.5 kg", "Granulated sugar 2 kg",
               "Black beans 540 ml", "Coffee, medium roast 925 g", "Tea, orange pekoe 72 pk", "Breakfast cereal 525 g",
               "Pasta sauce 650 ml", "Crackers 200 g", "Tuna, chunk light 170 g", "Granola bars 6 pk", "Mac and cheese 225 g",
               "Ketchup 1 L", "Stuffing mix 170 g", "Cranberry sauce 348 ml"],
    "Beverages": ["Sparkling water 12 pk", "Orange juice 2.63 L", "Cola 12 pk", "Spring water 24 pk", "Iced tea 1.75 L",
                  "Sports drink 6 pk", "Apple juice 1.89 L", "Ginger ale 12 pk", "Cold brew coffee 1 L", "Kombucha 414 ml",
                  "Lemonade 1.75 L", "Energy drink 4 pk", "Coconut water 1 L", "Tomato juice 1.36 L", "Hot chocolate mix 450 g",
                  "Sparkling juice 750 ml"],
    "Household": ["Paper towels 6 rolls", "Bathroom tissue 12 rolls", "Dish soap 709 ml", "Laundry detergent 2.95 L",
                  "Garbage bags 40 pk", "Aluminum foil 25 m", "Dishwasher pods 40 pk", "All purpose cleaner 950 ml",
                  "Sandwich bags 100 pk", "Facial tissue 6 pk", "Food storage containers", "Sponges 6 pk"],
}

# Store-brand items (the grocer's own label) and products launched recently (cold start).
STORE_BRAND_EVERY = 4
NEW_PRODUCTS = {"Skyr vanilla 650 g": 9, "Kombucha 414 ml": 7, "Frozen dumplings 600 g": 10,
                "Veggie burgers 4 pk": 6, "Cold brew coffee 1 L": 8, "Brioche loaf": 5}


def demand_dispersion(shelf_life_days):
    """Negative-binomial dispersion by perishability class (higher is steadier)."""
    return 18.0 if shelf_life_days >= 30 else 8.0

# Holiday effects by category for the week containing the holiday (multipliers).
HOLIDAY_EFFECTS = {
    "Thanksgiving": {"Meat & Seafood": 1.9, "Bakery": 1.8, "Produce": 1.35, "Pantry": 1.3, "Dairy & Eggs": 1.25},
    "Christmas":    {"Meat & Seafood": 2.0, "Bakery": 1.9, "Dairy & Eggs": 1.4, "Produce": 1.3, "Beverages": 1.4, "Pantry": 1.3},
    "Easter":       {"Meat & Seafood": 1.7, "Bakery": 1.5, "Dairy & Eggs": 1.35, "Produce": 1.2},
    "Victoria Day": {"Meat & Seafood": 1.35, "Beverages": 1.4, "Frozen": 1.2, "Bakery": 1.2},
    "Canada Day":   {"Meat & Seafood": 1.45, "Beverages": 1.5, "Frozen": 1.3, "Bakery": 1.25, "Produce": 1.15},
    "Labour Day":   {"Meat & Seafood": 1.3, "Beverages": 1.3, "Bakery": 1.15},
    "New Year":     {"Beverages": 1.35, "Frozen": 1.15},
}


def easter(y):
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(y, month, day)


def nth_weekday(y, m, weekday, n):
    d = date(y, m, 1)
    while d.weekday() != weekday:
        d += timedelta(days=1)
    return d + timedelta(weeks=n - 1)


def holidays(y):
    """Canadian statutory holidays (nationally observed set) used for demand effects."""
    vic = date(y, 5, 24)
    while vic.weekday() != 0:
        vic -= timedelta(days=1)
    return {
        "New Year": date(y, 1, 1),
        "Easter": easter(y) - timedelta(days=2),          # Good Friday week
        "Victoria Day": vic,
        "Canada Day": date(y, 7, 1),
        "Labour Day": nth_weekday(y, 9, 0, 1),
        "Thanksgiving": nth_weekday(y, 10, 0, 2),
        "Christmas": date(y, 12, 25),
    }


def week_holiday(monday):
    sunday = monday + timedelta(days=6)
    for y in {monday.year, sunday.year}:
        for name, d in holidays(y).items():
            # Shopping happens before the holiday: count the week containing it or the next 3 days.
            if monday <= d <= sunday or (name in ("Thanksgiving", "Christmas", "Easter") and sunday < d <= sunday + timedelta(days=3)):
                return name
    return ""


def load_public():
    sales = json.load(open(ROOT / "data/public/statcan_supermarket_sales.json"))["data"]
    cpi = json.load(open(ROOT / "data/public/statcan_cpi_food_stores.json"))["data"]
    s = pd.Series({p["month"]: p["value"] for p in sales})
    # Monthly seasonality: each month's sales relative to its trailing 12-month average,
    # averaged over the years available, normalised to mean 1 and scaled for days-per-month.
    days = pd.Series({m: pd.Period(m).days_in_month for m in s.index})
    daily = s / days
    ratio = daily / daily.rolling(12, center=True, min_periods=6).mean()
    idx = ratio.groupby([int(m[5:]) for m in ratio.index]).mean()
    idx = idx / idx.mean()
    cpi_s = pd.Series({p["month"]: p["value"] for p in cpi})
    return idx.to_dict(), cpi_s


def main():
    rng = np.random.default_rng(SEED)
    season, cpi = load_public()
    weeks = [LAST_HISTORY_WEEK - timedelta(weeks=N_WEEKS - 1 - i) for i in range(N_WEEKS + FORECAST_WEEKS)]

    # Products
    products = []
    n = 0
    for cat, names in PRODUCT_NAMES.items():
        base, (plo, phi), shelf, shrink, promo_p, lift, temp_sens, hol_sens = CATEGORIES[cat]
        for nm in names:
            n += 1
            store_brand = n % STORE_BRAND_EVERY == 0
            price = round(float(rng.uniform(plo, phi)) * (0.82 if store_brand else 1.0), 2)
            products.append({
                "sku": f"{cat[:3].upper()}-{n:04d}", "name": ("Store brand " + nm) if store_brand else nm,
                "base_name": nm, "category": cat, "store_brand": bool(store_brand),
                "base_units": float(base * rng.lognormal(0, 0.45)), "price": price,
                "shelf_life_days": shelf, "shrink_share": shrink, "promo_prob": promo_p,
                "lift": lift, "temp_sens": temp_sens, "hol_sens": hol_sens,
                "launch_weeks_ago": NEW_PRODUCTS.get(nm),
                "seasonal_peak": nm in ("Pumpkin pie 8 in", "Whole turkey (per kg)", "Stuffing mix 170 g", "Cranberry sauce 348 ml",
                                        "Ham, spiral cut (per kg)", "Hot chocolate mix 450 g", "Popsicles 12 pk", "Strawberries 454 g"),
            })
    prod = pd.DataFrame(products)

    # Weather path: normals plus persistent weekly anomalies per region.
    regions = sorted(TEMP_NORMALS)
    anomalies = {r: np.convolve(rng.normal(0, 2.2, len(weeks) + 3), np.ones(4) / 4, mode="valid")[: len(weeks)] for r in regions}

    # Promo calendar: chain-wide flyer, the same SKU promoted in every store that week.
    promo = {sku: rng.random(len(weeks)) < p for sku, p in zip(prod.sku, prod.promo_prob)}
    discount = {sku: rng.uniform(0.15, 0.30, len(weeks)) for sku in prod.sku}

    cpi_base = cpi.iloc[-1]
    rows = []
    for wi, monday in enumerate(weeks):
        month = monday.month
        hol = week_holiday(monday)
        cpi_month = cpi.get(f"{monday.year}-{month:02d}", cpi.iloc[-1])
        price_factor = cpi_month / cpi_base
        for st_id, st_name, city, prov, region, size in STORES:
            temp_norm = TEMP_NORMALS[region][month - 1]
            temp = temp_norm + anomalies[region][wi]
            for p in products:
                weeks_from_end = (N_WEEKS - 1) - wi
                if p["launch_weeks_ago"] is not None and weeks_from_end >= p["launch_weeks_ago"]:
                    continue  # not launched yet
                mu = p["base_units"] * size * season[month]
                if p["seasonal_peak"]:
                    if p["category"] in ("Bakery", "Meat & Seafood", "Pantry") or "chocolate" in p["name"]:
                        mu *= 2.2 if month in (10, 11, 12) else (0.6 if month in (5, 6, 7, 8) else 1.0)
                    else:
                        mu *= 2.0 if month in (6, 7, 8) else 0.55
                mu *= 1 + p["temp_sens"] * (temp - temp_norm) + p["temp_sens"] * 0.6 * (temp_norm - 8)
                if hol:
                    eff = HOLIDAY_EFFECTS.get(hol, {}).get(p["category"], 1.0)
                    mu *= 1 + (eff - 1) * min(p["hol_sens"] / 1.4, 1.3)
                is_promo = bool(promo[p["sku"]][wi])
                disc = float(discount[p["sku"]][wi]) if is_promo else 0.0
                if is_promo:
                    lo, hi = p["lift"]
                    mu *= lo + (hi - lo) * (disc - 0.15) / 0.15
                if p["launch_weeks_ago"] is not None:
                    age = p["launch_weeks_ago"] - weeks_from_end
                    mu *= min(1.0, 0.35 + 0.12 * age)   # ramp-up after launch
                mu *= 1 + 0.0004 * wi                    # mild volume growth
                mu = max(mu, 0.2)
                # Negative binomial noise (over-dispersed counts typical of store-SKU sales).
                # Ambient grocery demand is materially steadier than short-life fresh demand;
                # retain the noisier fresh series while giving ambient categories a realistic
                # item-store WAPE floor. This is class-based, never tuned to one category.
                k = demand_dispersion(p["shelf_life_days"])
                units = int(rng.negative_binomial(k, k / (k + mu))) if wi < N_WEEKS else None
                rows.append((monday.isoformat(), st_id, region, p["sku"], units, round(p["price"] * price_factor * (1 - disc), 2),
                             int(is_promo), round(disc, 3), hol, round(float(temp), 1), round(float(temp_norm), 1)))

    df = pd.DataFrame(rows, columns=["week", "store", "region", "sku", "units", "price", "promo", "discount", "holiday", "temp_c", "temp_normal_c"])
    OUT.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT / "sales.csv.gz", index=False, compression="gzip")
    prod.drop(columns=["lift"]).assign(promo_lift_lo=[l[0] for l in prod.lift], promo_lift_hi=[l[1] for l in prod.lift]) \
        .to_csv(OUT / "products.csv", index=False)
    pd.DataFrame(STORES, columns=["store", "name", "city", "province", "region", "size_factor"]).to_csv(OUT / "stores.csv", index=False)
    json.dump({"seed": SEED, "first_week": weeks[0].isoformat(), "last_history_week": weeks[N_WEEKS - 1].isoformat(),
               "forecast_weeks": [w.isoformat() for w in weeks[N_WEEKS:]], "monthly_seasonality": {int(k): round(v, 4) for k, v in season.items()},
               "rows": len(df), "stores": len(STORES), "products": len(prod)}, open(OUT / "meta.json", "w"), indent=1)
    print(f"{len(df):,} rows · {len(STORES)} stores · {len(prod)} products · weeks {weeks[0]} to {weeks[-1]}")


if __name__ == "__main__":
    main()
