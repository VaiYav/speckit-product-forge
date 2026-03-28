# Product Forge — Phase Reference

Full documentation for each of the 7 Product Forge lifecycle phases.

---

## Phase 1: Research

**Command:** `/product-forge.research`
**Output:** `features/{slug}/research/`
**Gate:** User approves research before Phase 2

### What happens

Three research agents run **in parallel**:
1. **Competitor Research** — finds 5-8 competitors, analyzes their feature implementation, identifies gaps and best practices
2. **UX/UI Patterns** — researches best interactions, flows, empty states, animations, accessibility requirements
3. **Codebase Analysis** — explores your codebase, finds reusable components, identifies integration points

Two additional agents run **if opted-in**:
4. **Tech Stack** — compares libraries and APIs with download stats, license, and bundle size
5. **Metrics/ROI** — estimates business impact, KPIs, measurement plan

### Questions asked

| Question | Mandatory? |
|----------|-----------|
| Feature description | Yes |
| List of competitors (or auto-find?) | Optional |
| Run tech stack research? | Optional |
| Run metrics/ROI analysis? | Optional |
| Additional context (links, constraints) | Optional |

### Output files

| File | Always? | Description |
|------|---------|-------------|
| `research/README.md` | ✅ | Master index + executive summary + open questions |
| `research/competitors.md` | ✅ | Competitor table + patterns + top implementations |
| `research/ux-patterns.md` | ✅ | Flows + states + micro-interactions + anti-patterns |
| `research/codebase-analysis.md` | ✅ | Integration points + reusable components + complexity |
| `research/tech-stack.md` | Optional | Library comparison table + recommendation |
| `research/metrics-roi.md` | Optional | KPI benchmarks + ROI model + measurement plan |

---

## Phase 2: Product Spec

**Command:** `/product-forge.product-spec`
**Output:** `features/{slug}/product-spec/`
**Gate:** User approves document plan before writing, then approves output

### What happens

An interactive spec creation session. The agent asks upfront about desired detail levels,
then conducts a brief interview, then generates all documents.

### Detail Level Configuration (asked before writing)

| Setting | Options | Impact |
|---------|---------|--------|
| Feature size | Small / Medium / Large | Determines auto-decomposition |
| Spec detail | Concise / Standard / Exhaustive | product-spec.md length |
| Journey format | Simple / Standard / Multi-file | user-journey file count |
| Wireframe fidelity | Text / Basic HTML / Detailed HTML | wireframe format |
| Wireframe count | N screens | triggers decomposition if >3 |
| Mockup style | None / Generic / Project-styled | whether mockups.html are created |
| Metrics doc | None / Concise / Detailed | metrics.md detail |

### Interview (7 questions, asked together)

1. Target user(s) — persona specifics
2. Primary goal — the #1 outcome
3. Non-goals — explicit out-of-scope
4. Success criteria — measurable definition of done
5. Hard constraints — technical, legal, time
6. Priority user stories (optional — agent generates if not provided)
7. Open questions — known unknowns

### Output files

| File | Always? |
|------|---------|
| `product-spec/README.md` | ✅ |
| `product-spec/product-spec.md` | ✅ |
| `product-spec/user-journey.md` (or multiple) | ✅ |
| `product-spec/wireframes.md` (or folder) | ✅ |
| `product-spec/metrics.md` | Optional |
| `product-spec/mockups/index.html` + screens | Optional |
| Feature root `README.md` | ✅ |

---

## Phase 3: Revalidation

**Command:** `/product-forge.revalidate`
**Output:** `features/{slug}/review.md`
**Gate:** Explicit "APPROVED" / "LGTM" from user

### What happens

The agent presents a structured summary of all product-spec documents.
The user reviews the actual files and provides corrections in chat.
The agent applies changes and loops until approval.

### Approval keywords

Any of: `APPROVED`, `LGTM`, `все ок`, `approve`, `👍`, `ready`

### What gets logged in review.md

- User's exact words for each correction
- Files modified + type of change (modify/add/remove/restructure)
- Agent notes about edge cases
- Final approval timestamp and document inventory

### Consistency check before lock

Before locking, the agent automatically verifies:
- All cross-links in README files are valid
- All referenced files exist
- User stories in product-spec align with user-journey flows

---

## Phase 4: Bridge → SpecKit

**Command:** `/product-forge.bridge`
**Output:** `features/{slug}/spec.md`
**Gate:** User approves spec.md; then SpecKit mode is selected

### What happens

All research and product-spec artifacts are synthesized into a single `spec.md`.
This spec is richer than a manually written spec: it includes research context,
competitive intelligence, UX recommendations, and technical integration notes.

### SpecKit Mode Selection

| Mode | When to use | Phases triggered |
|------|-------------|-----------------|
| Classic | Well-scoped features, clear requirements | plan → tasks → implement → verify |
| V-Model | Complex features, safety-critical, need full traceability | v-model-requirements → architecture → system-design → module-design → [tests] → implement |

### What goes into spec.md

- Problem statement + research backing (with links to research/)
- User personas
- User stories with acceptance criteria (from product-spec.md)
- Functional + non-functional requirements
- Technical context (from codebase-analysis.md)
- Integration points
- Success metrics
- Risks
- Links to all product-spec and research documents

---

## Phase 5: Plan + Tasks

**Command:** `/product-forge.implement` (handles both plan and tasks sub-phases)
**Output:** `features/{slug}/plan.md` + `features/{slug}/tasks.md`
**Gates:** Two separate human gates — one after plan, one after tasks

### Cross-validation checks (Plan)

| Check | Severity if fails |
|-------|------------------|
| All Must Have stories addressed? | Warning |
| Integration matches codebase analysis? | Warning |
| NFR approach defined? | Warning |

### Cross-validation checks (Tasks)

| Check | Severity if fails |
|-------|------------------|
| Every Must Have US has ≥1 task? | Critical |
| Every FR has ≥1 task? | Warning |
| Test tasks included? | Warning |
| No orphan tasks (untraceable)? | Warning |

---

## Phase 6: Implementation

**Command:** `/product-forge.implement` (continues after tasks approval)
**Output:** Code files (per tasks.md)
**Gate:** All tasks `[x]`

Delegates to SpecKit `implement`. Product Forge adds:
- Context note about product-spec location for implementation agents
- Reference to wireframes for UI implementation
- Reference to acceptance criteria per story

---

## Phase 7: Full Verification

**Command:** `/product-forge.verify-full`
**Output:** `features/{slug}/verify-report.md`
**Gate:** No CRITICAL findings (or user acknowledges)

### 6 Verification Layers

| Layer | What it checks |
|-------|---------------|
| 1: Code ↔ Tasks | Every task has verifiable code |
| 2: Code ↔ Plan | All planned components implemented |
| 3: Stories ↔ Code | Every Must Have story implemented + tested |
| 4: spec.md ↔ product-spec | No spec drift from approved product spec |
| 5: Research alignment | Key research recommendations followed |
| 6: Document integrity | All cross-links valid, no broken references |

### Severity levels

| Severity | Meaning | Blocks completion? |
|----------|---------|-------------------|
| ❌ CRITICAL | Genuine implementation gap or scope violation | Yes |
| ⚠️ WARNING | Deviation that may be intentional | No |
| ✅ PASSED | Check verified successfully | — |
| ⏭️ SKIPPED | Cannot verify (missing context) | No |
