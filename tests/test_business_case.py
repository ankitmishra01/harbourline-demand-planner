import pytest

import business_case as bc


def test_base_case_run_rate_is_1_06m():
    assert bc.scenario(1)["total"] == pytest.approx(1.06, abs=0.005)


def test_breakeven_is_0_70m():
    assert bc.breakeven() == pytest.approx(0.70, abs=0.005)


def test_breakeven_gives_zero_npv():
    assert bc.npv(bc.breakeven()) == pytest.approx(0.0, abs=1e-9)


def test_lever_formulas():
    s = bc.levers(0.0075, 0.115, 0.075)
    assert s["sales"] == pytest.approx(200 * 0.0075 * 0.25)
    assert s["waste"] == pytest.approx(200 * 0.02 * 0.115)
    assert s["stock"] == pytest.approx(20 * 0.075 * 0.15)
    assert s["cash_release"] == pytest.approx(1.5)


def test_scenarios_are_ordered_and_low_case_still_clears_the_line():
    low, base, high = (bc.scenario(i)["total"] for i in range(3))
    assert bc.breakeven() < low < base < high
    assert bc.payback(base) == pytest.approx(2.7, abs=0.05)


def test_deck_figures():
    s = bc.scenario(1)
    assert round(s["sales"], 2) == pytest.approx(0.38) or round(s["sales"], 3) == 0.375
    assert round(s["waste"], 2) == 0.46
    assert round(s["stock"], 3) == 0.225
    assert [round(bc.scenario(i)["cash_release"], 1) for i in (0, 2)] == [1.0, 2.0]
    cum = bc.flows(s["total"])[2]
    assert [round(c, 3) for c in cum] == [-0.625, -1.11, -0.565, 0.245, 1.055, 1.865]
    assert sum(bc.INVEST) == pytest.approx(1.225)
    assert bc.payback(bc.scenario(0)["total"]) == pytest.approx(3.93, abs=0.01)
    assert bc.payback(bc.scenario(2)["total"]) == pytest.approx(2.20, abs=0.01)
