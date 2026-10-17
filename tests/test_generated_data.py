"""Invariants of the synthetic dataset (data/generated, produced by pipeline/generate_data.py)."""
import json
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

import generate_data as g

GEN = Path(__file__).resolve().parents[1] / "data" / "generated"


@pytest.fixture(scope="module")
def sales():
    return pd.read_csv(GEN / "sales.csv.gz")


@pytest.fixture(scope="module")
def products():
    return pd.read_csv(GEN / "products.csv")


def test_shape(sales, products):
    assert sales.store.nunique() == 20
    assert sales.region.nunique() == 5
    assert len(products) >= 130
    hist = sales.dropna(subset=["units"]).week.unique()
    assert len(hist) == 104
    meta = json.load(open(GEN / "meta.json"))
    assert len(meta["forecast_weeks"]) == 2
    assert min(meta["forecast_weeks"]) > max(hist)


def test_units_non_negative_and_whole(sales):
    u = sales.units.dropna()
    assert (u >= 0).all()
    assert (u == u.round()).all()


def test_prices_positive(sales):
    assert (sales.price > 0).all()


def test_new_products_have_no_sales_before_launch(sales, products):
    new = products.dropna(subset=["launch_weeks_ago"])
    assert len(new) > 0
    weeks = sorted(sales.dropna(subset=["units"]).week.unique())
    for p in new.itertuples():
        launch = weeks[-int(p.launch_weeks_ago)]
        before = sales[(sales.sku == p.sku) & (sales.week < launch)].units.dropna()
        assert (before == 0).all(), p.sku


def test_holiday_weeks_spike(sales):
    hist = sales.dropna(subset=["units"])
    weekly = hist.groupby(["week", "holiday"], dropna=False).units.sum().reset_index()
    for name in ("Christmas", "Thanksgiving"):
        on = weekly[weekly.holiday == name].units.mean()
        off = weekly[weekly.holiday.isna()].units.mean()
        assert on > 1.1 * off, name


def test_holiday_calendar():
    assert g.easter(2026) == date(2026, 4, 5)
    assert g.holidays(2025)["Thanksgiving"] == date(2025, 10, 13)
    assert g.week_holiday(date(2025, 12, 22)) == "Christmas"


def test_public_calibration_files_are_cited():
    for f in ("statcan_supermarket_sales.json", "statcan_cpi_food_stores.json"):
        d = json.load(open(GEN.parent / "public" / f))
        assert d["url"].startswith("https://www150.statcan.gc.ca/")
        assert len(d["data"]) >= 24


def test_ambient_categories_use_lower_class_based_noise():
    """Noise calibration is by shelf-life class, never by a named category."""
    assert g.demand_dispersion(365) > g.demand_dispersion(7)
    assert g.demand_dispersion(30) == g.demand_dispersion(365)
