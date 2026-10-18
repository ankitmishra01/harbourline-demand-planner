# Harbourline Foods demand planner

Public work sample. Harbourline Foods is a fictional retailer; all data is synthetic. See README.md for what each page shows and how it is built.

## Working rules

- Pipeline: `python pipeline/generate_data.py && python pipeline/train_backtest.py && python pipeline/export.py`, then `pytest -q`. App: `cd app && npm ci && npm run typecheck && npm test && npm run build`.
- Order, offer and autonomy rules live in `app/src/lib/logic.ts` and are covered by `app/tests/logic.test.ts`. Change the rule and the test together.
- Design tokens are CSS variables at the top of `app/src/app/globals.css`. Keep hairlines, 4px radius, violet for selection and the next action, green for verified, red for rejection. No shadows, gradients or icon circles.
- Screenshots: `BASE=http://localhost:3000 app/scripts/screenshots.sh` against a running app; planner sub-states are captured by hand.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
