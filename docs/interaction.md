# Product Forge — Interactive Elicitation Convention

> **Status:** normative
> **Consumers:** `commands/forge.md` and every sub-skill.
> **Companions:** [policy.md](./policy.md), [runtime.md](./runtime.md),
> [templates/interaction-prompts.md](./templates/interaction-prompts.md).

Every phase, gate, and decision point in Product Forge MUST query the user through
a **structured interactive prompt** rather than free-form "ask the user…" prose, so
the lifecycle stays navigable, choices are auditable, and no decision is silently
skipped.

The convention is modeled on Claude Code's `AskUserQuestion` tool but is
**tool-agnostic**: commands describe *what* to ask in the shape below; the host
decides *how* to render it (Claude Code renders `AskUserQuestion`; other runners an
equivalent numbered list).

---

## 1. The structured question shape

Every interactive prompt has:

- **Header** — a short chip/label (≤12 chars) naming the decision, e.g.
  `Mode`, `Gate`, `Detail`, `Next step`.
- **Question** — one clear sentence ending in `?`.
- **Options** — 2–4 mutually-exclusive choices (or non-exclusive when
  `multiSelect`). Each option has a **label** (1–5 words) and a **description**
  (the trade-off / what happens if chosen).
- **Recommended option first** — when there is a recommendation, it is option 1
  and its label ends with `(recommended)`.
- **Free-text fallback** — the user can always answer "Other" with free text; a
  closed list never traps the user.
- **multiSelect** — set when choices are not mutually exclusive (e.g. "which
  research dimensions to run?").

### Canonical render (numbered-list fallback)

```
[Header] Question?

  1. Label one (recommended) — description / trade-off
  2. Label two — description / trade-off
  3. Label three — description / trade-off
  (or type your own answer)
```

Where the host supports `AskUserQuestion`, emit the equivalent structured call
instead (identical semantics).

---

## 2. Where structured prompts are MANDATORY

| Decision point | Header | Options (typical) |
|----------------|--------|-------------------|
| Triage / mode & track selection | `Track` | express / lite / standard / v-model |
| Every phase **gate** (see policy §2) | `Gate` | Approve / Revise / Skip / Abort / Rollback |
| Skip-reason capture (policy §3) | `Skip why` | free-text required (no closed list) |
| Clarification rounds (product-spec, revalidate) | `Clarify` | the concrete alternatives in question |
| Optional-phase offer | `Run <phase>?` | Run (recommended) / Skip |
| **Next action at phase handoff** | `Next step` | proceed to Phase N / run optional X / pause |
| Per-step opt-ins inside long phases | varies | the concrete choices for that step |

A phase MUST NOT advance past a mandatory decision point without a structured prompt
and a recorded answer. Gate answers map to the `gates[]` audit trail
([policy §2](./policy.md#2-gate-decisions)); skip reasons follow
[policy §3](./policy.md#3-skip-reason-policy-e2).

---

## 3. Per-step questioning inside long phases

Long phases break the interaction into discrete structured questions instead of
one open question after a wall of text:

- **research** — scope opt-ins (run tech-stack research? metrics/ROI? extra
  competitors?) as a single `multiSelect` question.
- **product-spec** — detail level (concise / standard / exhaustive), wireframe
  style, mockup style — each a structured question; journey edge-case
  confirmation per `JRN`.
- **plan / tasks** — vertical-slice split offer; extension-point insertion.
- **design-system-harvest** — component-choice confirmations.
- **gates everywhere** — Approve / Revise / Skip / Abort / Rollback.

Prefer several small, answerable questions; group naturally-related toggles into
one `multiSelect` question to limit round-trips.

---

## 4. Rules

1. **No bare "ask the user".** Command files reference this convention and
   specify the header + question + options for each decision.
2. **Always offer free text.** Every prompt allows an "Other" answer.
3. **Recommend, don't decide.** Put the recommended option first and label it;
   never auto-select on the user's behalf at a mandatory gate.
4. **One decision per prompt** (except deliberately grouped `multiSelect` toggles).
5. **Record the answer.** Gate decisions → `gates[]`; mode/track choice →
   `feature_mode` (express is a mode value); skip reasons → `skip_reason`.
6. **Keep labels stable.** Reuse the standard headers (`Gate`, `Track`,
   `Next step`) so the experience is predictable across phases.
7. **Status markers.** Reports and summaries use one legend: ✅ done / pass ·
   ⚠️ warning / partial · ❌ failed / blocked · ⏳ pending / in progress ·
   ⏭ skipped / not applicable. Plain Markdown headings and tables carry the
   rest of the structure.

See [templates/interaction-prompts.md](./templates/interaction-prompts.md) for
ready-to-use prompt snippets.
