"""Business case for a fictional mid-sized Canadian grocer (300 stores, $200M revenue).

Planning assumptions and formulas (CAD, $M). The base case gives a $1.06M a year
run-rate benefit and a $0.70M break-even, which is the go/no-go line.
"""
REVENUE = 200.0          # $M, given
STORES = 300             # given
DISC = 0.10              # discount rate (assumption)
MARGIN = 0.25            # contribution margin on recovered sales (assumption)
WASTE_PCT = 0.02         # waste + markdowns as % of revenue (assumption)
INVENTORY = 20.0         # $M average inventory (assumption)
CARRY = 0.15             # annual carrying rate (assumption)

# (low, base, high) improvement assumptions
SALES_UPLIFT = (0.005, 0.0075, 0.010)   # share of revenue recovered
WASTE_CUT = (0.08, 0.115, 0.15)         # reduction in waste and markdowns
INV_CUT = (0.05, 0.075, 0.10)           # reduction in average inventory

BLUEPRINT, POC, SCALE_BUILD = 0.175, 0.450, 0.600
INVEST = [BLUEPRINT + POC, SCALE_BUILD, 0, 0, 0, 0]
RUN_COST = [0, 0.15, 0.25, 0.25, 0.25, 0.25]
RAMP = [0, 0.25, 0.75, 1, 1, 1]


def levers(sales_uplift, waste_cut, inv_cut):
    """Annual benefit ($M) from the three profit levers."""
    sales = REVENUE * sales_uplift * MARGIN
    waste = REVENUE * WASTE_PCT * waste_cut
    carry = INVENTORY * inv_cut * CARRY
    return {"sales": sales, "waste": waste, "stock": carry, "total": sales + waste + carry,
            "cash_release": INVENTORY * inv_cut}


def scenario(i):
    return levers(SALES_UPLIFT[i], WASTE_CUT[i], INV_CUT[i])


def flows(benefit):
    ben = [benefit * r for r in RAMP]
    net = [ben[t] - RUN_COST[t] - INVEST[t] for t in range(6)]
    cum, c = [], 0.0
    for n in net:
        c += n
        cum.append(c)
    return ben, net, cum


def npv(benefit):
    _, net, _ = flows(benefit)
    return sum(n / (1 + DISC) ** t for t, n in enumerate(net))


def payback(benefit):
    _, net, cum = flows(benefit)
    for t in range(1, 6):
        if cum[t] >= 0 > cum[t - 1]:
            return (t - 1) + (-cum[t - 1]) / net[t]
    return None


def breakeven():
    """Annual run-rate benefit at which five-year NPV is zero (the go/no-go line)."""
    k = sum(RAMP[t] / (1 + DISC) ** t for t in range(6))
    return -npv(0) / k
