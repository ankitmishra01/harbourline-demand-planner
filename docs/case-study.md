# Harbourline Foods demand planner: a seven-week path from forecast to order

A working prototype of a grocery demand-forecasting pilot: models backtested in dollars, a planner's order screen, an earned autonomy ladder and the business case that decides whether to go on.

## The question

Harbourline Foods is a fictional mid-sized Canadian grocer: 300 stores, about $200M in revenue, and weekly ordering that leans on last year's sales. Too little costs a sale; too much costs waste and cash. Can a better forecast tell each store how much to order, and does the gain clear a go/no-go line of $0.70M a year in profit?

## The approach

**Discovery.** Seven weeks with three checkpoints where the work stops if the numbers do not clear: week 2, can lost demand be told from empty shelves; week 5, does a model beat the baseline; week 7, do the numbers justify going ahead. Six risks each carry a named owner.

**Models.** Five candidates on 104 weeks of sales for 20 pilot stores and 136 products in 8 categories, from same week last year to gradient-boosted trees with a Poisson loss and a hierarchical reconciliation. Each was tested on a rolling 12-week holdout and judged in dollars: lost margin, waste and carrying cost. The selection rule picks the simplest model within 10% of the best.

**Planner.** One screen per store shows next week and the week after, a P10 to P90 range, stock position and a suggested order in whole cases. Seven review rules decide what needs a planner; everything else is approved automatically, so a store reviews 15% to 20% of its lines. Every override carries a reason code.

**Autonomy.** Trust is earned per category and can be lost. L1 approves every line, L2 reviews exceptions only, L3 writes the orders with a planner veto. Eight passing weeks earn promotion, two consecutive misses demote, and fresh stays at L2 through the pilot.

**Business case.** Three levers set at or below the low end of published vendor results: sell more, throw out less, hold less stock. Base case $1.06M a year against a $0.70M break-even, payback 2.7 years, with $0.175M of discovery buying three decisions before the $0.45M pilot and $0.60M rollout.

## The outcome

| Metric | Baseline | Selected model |
|---|---|---|
| Error next week (WAPE) | 39.7% | 28.7% |
| 12-week cost of forecast error | $408K | $319K |
| Saved against baseline | | $89K |
| In-stock across 20 stores | | 93% |
| Spoilage at cost, share of sales | | 1.5% |

Hierarchical reconciliation scored 28.6% and $91K, not enough to justify the extra moving part. Synthetic data is cleaner than real data, so the results are illustrative.

## What we would do next

- Estimate lost demand from stock records, so the baseline is demand, not sales.
- Forecast daily for produce, bakery and meat.
- Connect to the ordering system for real through the EDI loop retailers already run.
- Pilot in 20 to 30 stores, in shadow mode first.

## What this demonstrates

- **Discovery craft.** A value tree, three checkpoints and six owned risks, so a sponsor can say stop as easily as go.
- **Honest evaluation.** Models judged in dollars; the simplest adequate model chosen; the synthetic uplift labelled as such.
- **Adoption designed in.** Review by exception, a reason on every override, and an autonomy ladder that earns and loses trust on evidence.
- **Stage-gated spend.** Discovery, pilot and rollout funded in turn, each unlocked by a number agreed in advance.
- **AI-native build with human ownership.** About two working days of elapsed time with Claude Code and Codex; 30 Python and 7 Node tests, a deterministic pipeline and CI on every push, with the author reviewing every model choice, threshold and sentence.

Live: https://harbourline-demand-planner.vercel.app · Code: https://github.com/ankitmishra01/harbourline-demand-planner · Harbourline Foods is a fictional retailer; all data is synthetic and calibrated to public Statistics Canada series. Not affiliated with any company. Built by Ankit Mishra.
