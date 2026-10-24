# Product Forge — Roadmap

Open ideas that are **not scheduled**. Shipped work is in [CHANGELOG.md](./CHANGELOG.md);
design rationale lives in [docs/improvements/](./docs/improvements/). An item moves
into a release only with an executable check (a `doctor`/`lint-docs` rule or a
script `--selftest`) and the human gate preserved.

| ID | Idea | Effort | Origin |
|----|------|--------|--------|
| P1-A | **Issue-tracker bridge** — a `tracker-sync` command that projects the artifact tree to Jira / Linear / GitHub Issues via MCP (feature → Epic, `JRN-*` → Story, `T0NN` → Task, `BUG-NNN` → Bug), keeps a `tracker-mapping.json` carrier, and mirrors task status both ways. Provider-neutral `tracker:` config block. | M | [2026-06 feature roadmap](./docs/improvements/2026-06-feature-roadmap.md#p1-a-issue-tracker-bridge-jira--linear--github-issues--net-new-high-roi) |
| P2-B | **Scheduled lifecycle nudges** — opt-in cron recipes: retrospective reminder ≥14 days after ship, quiet `sync-verify --quick` drift watch that reports only CRITICAL drift, stale-flag sweep. | M | [2026-06 feature roadmap](./docs/improvements/2026-06-feature-roadmap.md#p2-b-proactive--scheduled-lifecycle-nudges-via-cron--net-new) |
| P2-D | **Gate delivery to a messaging channel** — extend `forge --ci` `safe_outputs.writes_as` with a `message` channel so `gate-review.md` reaches a chat channel and a human can approve from a phone. | S | [2026-06 feature roadmap](./docs/improvements/2026-06-feature-roadmap.md#p2-d-messaging-gateway-delivery-of-gatesreports--net-new-small) |
| D13 | **Generic forge transition table** — replace forge.md's per-phase transition blocks with one procedure plus a phase table (deferred from the v1.8.0 docs overhaul to limit behaviour risk). | M | [2026-10 docs overhaul](./docs/improvements/2026-10-docs-overhaul.md) |
