import math

import pytest

from export import suggested_order


def test_order_is_forecast_plus_safety_less_stock():
    order, safety = suggested_order(p50=100, sigma=20, on_hand=30, on_order=10, z=1.28)
    assert safety == pytest.approx(25.6)
    assert order == math.ceil(100 + 25.6 - 30 - 10)


def test_order_never_negative():
    order, _ = suggested_order(p50=10, sigma=2, on_hand=500, on_order=0, z=1.28)
    assert order == 0


def test_more_uncertainty_means_bigger_order():
    low, _ = suggested_order(50, 5, 10, 0, 1.28)
    high, _ = suggested_order(50, 25, 10, 0, 1.28)
    assert high > low


def test_round_to_case():
    from export import round_to_case
    assert round_to_case(0, 12) == 0
    assert round_to_case(1, 12) == 12
    assert round_to_case(24, 12) == 24
    assert round_to_case(25, 6) == 30


def test_upc_check_digit_is_valid():
    from export import upc
    code = upc(7)
    assert len(code) == 12 and code.startswith("2")
    digits = [int(d) for d in code]
    assert (sum(digits[0::2]) * 3 + sum(digits[1::2])) % 10 == 0


def test_exceptions_rules():
    from export import exceptions, priority
    base = dict(p50_1=100, sigma=15, recent4=100, dos=10, dos_on_hand=10, lead=2, review_days=7, order_units=100, on_order=0, spoil=0,
                promo_now=False, promo_prev=False, promo_lift_cat=1.3, holiday=False, hol_lift=1.3, new=False)
    assert exceptions(**base) == []
    assert "stockout" in exceptions(**{**base, "dos_on_hand": 1})
    assert "stockout" not in exceptions(**{**base, "dos_on_hand": 1, "on_order": 40}), "stock already on order is not a stockout"
    assert "stockout" not in exceptions(**{**base, "dos_on_hand": 1, "p50_1": 10}), "slow sellers are not flagged"
    assert "low_dos" in exceptions(**{**base, "dos": 5, "order_units": 160})
    assert "low_dos" not in exceptions(**{**base, "dos": 5, "order_units": 160, "review_days": 1}), "daily-ordered categories skip low_dos"
    assert "deviation" in exceptions(**{**base, "recent4": 50})
    assert "deviation" not in exceptions(**{**base, "recent4": 90}), "small differences are not deviations"
    assert "spoilage" in exceptions(**{**base, "spoil": 12})
    assert "spoilage" not in exceptions(**{**base, "spoil": 4})
    assert exceptions(**{**base, "promo_now": True, "new": True}) == ["promo", "new"]
    assert "promo" not in exceptions(**{**base, "promo_now": True, "promo_prev": True}), "a promotion already running is not re-flagged"
    assert "holiday" in exceptions(**{**base, "holiday": True})
    assert priority(["stockout"], 1, 2) == "High" and priority(["spoilage"], 9, 2) == "High"
    assert priority(["promo"], 9, 2) == "Medium" and priority([], 9, 2) == "Low"
