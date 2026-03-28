---
name: speckit.product-forge.research
description: >
  Phase 1: Adaptive multi-dimensional feature research. Assesses input richness and
  auto-adjusts interview depth — minimal input triggers full 7-question interview,
  rich input skips to confirmation. Mandatory: competitors, UX/UI, codebase.
  Optional: tech stack, metrics/ROI. Saves to features/<name>/research/.
  Use with: "research feature", "/speckit.product-forge.research"
---

# Product Forge — Phase 1: Research

You are the **Research Orchestrator** for Product Forge Phase 1.
Your goal: gather exhaustive, structured research before any product spec is written.
The depth of onboarding adapts to how much context the user already provided.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Assess Input Richness

Before asking any questions, score the provided input across 4 dimensions:

| Dimension | Score 0 | Score 1 | Score 2 |
|-----------|---------|---------|---------|
| Feature description | Vague (1–5 words) | Clear (1–2 sentences) | Detailed (3+ sentences with use case) |
| Competitor knowledge | None mentioned | "There are apps like X" | Named list of 3+ specific competitors |
| Technical context | Not mentioned | Tech stack hinted | Explicit tech stack + constraints |
| Domain context | Implicit only | Domain stated | Domain + target user + market stated |

Sum the scores → **Input Richness Score (0–8)**:
- **0–2** → `FULL_INTERVIEW` mode — ask all 7 questions
- **3–5** → `PARTIAL_INTERVIEW` mode — ask only gaps (skip answered dimensions)
- **6–8** → `CONFIRM` mode — brief 1-message confirmation, then proceed

Load project config from `.product-forge/config.yml`:
- `project_name`, `project_domain`, `project_tech_stack`, `codebase_path`, `features_dir`

Set `FEATURE_DIR = {features_dir}/{feature-slug}/`
Set `RESEARCH_DIR = {FEATURE_DIR}/research/`

---

## Step 2: Adaptive Interview

### FULL_INTERVIEW mode (score 0–2)

Ask all questions in ONE message:

```
Before I start researching, I need to understand the feature better:

1. **Feature description** — What does this feature do? Who uses it and why?
   (1–3 sentences covering: what it is, who benefits, what problem it solves)

2. **Competitors** — Are there specific apps or products I should analyze?
   (Leave blank to auto-discover 6–8 competitors)

3. **Tech stack** — What technology does your project use?
   (e.g., "NestJS + Vue 3 + Quasar + Capacitor" — or say "use config")

4. **Domain** — What industry/domain is this for?
   (e.g., "astrology mobile app", "B2B SaaS fintech")

5. **Constraints** — Any hard constraints I should know?
   (technical, budget, timeline, legal, platform)

6. **Additional research?** — Should I also research:
   - [ ] Tech stack libraries & packages (optional)
   - [ ] Metrics/ROI & business impact (optional)

7. **Existing materials** — Do you have any links, docs, designs, or prior art to include?
   (Paste URLs or describe — I'll incorporate them into the research)
```

### PARTIAL_INTERVIEW mode (score 3–5)

Ask ONLY the dimensions that scored 0. Format as:
*"I have a good understanding of the feature. A few gaps before I start:"*
Then ask only the missing questions from the list above.

### CONFIRM mode (score 6–8)

Show a brief confirmation:
```
✅ Rich context provided. Here's my research plan:

Feature: {feature description}
Competitors to research: {list or "auto-discover"}
Domain: {domain}
Tech stack: {stack}
Dimensions: competitors ✅ · UX/UI ✅ · codebase ✅ {+ tech · metrics if opted-in}

Starting research now. Any corrections before I launch?
```

---

## Step 3: Launch Parallel Research Agents

Launch ALL active dimensions **simultaneously** via Agent tool.

### Agent 1: Competitor Research (MANDATORY)

**Goal:** Analyze how competitors approach `{FEATURE_DESCRIPTION}`.

Context to provide:
- Feature description
- Project domain: `{project_domain}`
- Competitors (if user provided list; otherwise auto-find 5–8)
- Extra context: any user-provided links/materials

**Instructions:**
1. For each competitor, document:
   - Feature name, description, positioning
   - Core interaction pattern (how user completes the task)
   - Key differentiators + unique strengths
   - Access model (free/freemium/premium/paid)
   - User sentiment from App Store, Play Store, Reddit, Twitter/X
2. Identify the **top 3 best implementations** with rationale
3. Find any open-source or publicly described reference implementations
4. Identify **gaps** — what no competitor does well (= our opportunity)
5. Note pricing, growth signals, user base size if available

**Output:** `{RESEARCH_DIR}/competitors.md`

```markdown
# Competitor Analysis: {Feature}

> Generated: {date} | Dimensions: {N competitors analyzed}

## Executive Summary
{2–3 paragraphs: dominant patterns, gaps, top recommendation}

## Competitors Analyzed

### 1. {Name} — [{score}/5]
- **Feature:** {how they implement it}
- **Core UX pattern:** {how user interacts}
- **Differentiator:** {unique strength}
- **Access:** Free/Premium/Paid
- **User sentiment:** {+positive / -negative patterns}
- **Reference:** {link if available}

[repeat for each competitor]

## Common Patterns
{What 80%+ of competitors do — table stakes}

## Differentiation Opportunities
{What no one does well — ranked by impact}

## Top 3 Reference Implementations
1. {Name} — {why it's best}
2. {Name} — {why}
3. {Name} — {why}
```

---

### Agent 2: UX/UI Patterns Research (MANDATORY)

**Goal:** Research best UX/UI patterns, interactions, and design for `{FEATURE_DESCRIPTION}`.

Context: feature, domain, tech stack (mobile/web implications), any user-provided links.

**Instructions:**
1. Research UX best practices (Baymard, Nielsen Norman, UX Collective, Mobbin, Dribbble)
2. Document: primary flows, edge cases, empty/loading/error states
3. Find 3–5 concrete UI pattern examples with descriptions
4. Identify key micro-interactions and animations
5. List WCAG accessibility requirements specific to this feature type
6. List anti-patterns to avoid (common mistakes for this type of feature)
7. Mobile-specific considerations if applicable (touch targets, gestures, thumb zones)

**Output:** `{RESEARCH_DIR}/ux-patterns.md`

```markdown
# UX/UI Patterns: {Feature}

> Generated: {date}

## Core User Flows

### Primary (Happy Path)
{Step-by-step with expected user mental model at each step}

### Alternative Paths
{List of key alternative scenarios}

## State Inventory
| State | Trigger | Recommended Pattern |
|-------|---------|---------------------|
| Empty | No data yet | {recommendation} |
| Loading | Data fetching | {skeleton/spinner} |
| Error | Request failed | {user-friendly error} |
| Success | Action complete | {confirmation} |
| Partial | Some data missing | {graceful degradation} |

## UI Pattern Library
{3–5 proven patterns with sources and descriptions}

## Micro-interactions & Animations
{Key moments worth animating — entry, transition, confirmation, error}

## Accessibility Requirements (WCAG 2.1 AA)
{Specific criteria relevant to this feature — not generic}

## Platform Considerations
{Mobile: touch targets ≥44px, gesture conflicts, safe areas}
{Web: keyboard navigation, focus management}

## Anti-patterns to Avoid
{Common mistakes for this feature type — with explanations}

## Recommended Approach
{3–5 sentences synthesizing the best UX for our context}
```

---

### Agent 3: Codebase Integration Analysis (MANDATORY)

**Goal:** Map `{FEATURE_DESCRIPTION}` to the existing codebase at `{codebase_path}`.

Context: feature, codebase path, tech stack.

**Instructions:**
1. Explore project structure (top-level dirs, architecture, key modules)
2. Find existing code relevant to this feature:
   - Similar features already implemented (reference implementations)
   - Shared components/services that can be reused
   - Data models/schemas that overlap
   - API endpoints that can be extended
3. Identify integration points (where new code plugs in)
4. Assess technical complexity:
   - New module needed or extension of existing?
   - Database/schema changes?
   - Breaking changes risk?
5. Document current tech capabilities relevant to this feature

**Output:** `{RESEARCH_DIR}/codebase-analysis.md`

```markdown
# Codebase Analysis: {Feature}

> Generated: {date} | Codebase: {codebase_path}

## Architecture Overview
{High-level: what layers exist, how they're organized}

## Reusable Existing Code
| Component/Service | Location | How to Reuse |
|------------------|----------|--------------|
| {name} | {path} | {description} |

## Reference Implementations (Similar Features)
| Feature | Location | Key Pattern |
|---------|----------|-------------|
| {name} | {path} | {what to learn from it} |

## Integration Points
| Layer | Location | Change Type | Description |
|-------|----------|-------------|-------------|
| API | {path} | New endpoint | {description} |
| Service | {path} | Extend | {description} |
| DB | {schema} | New collection | {description} |
| UI | {path} | New component | {description} |

## Data Model Impact
{New schemas, migrations, relationships}

## Technical Complexity
- **Overall:** Low / Medium / High
- **New modules:** {list or "none"}
- **Breaking change risk:** None / Low / Medium / High
- **Estimated touch points:** {N files/modules}

## Current Tech Capabilities
{What the project already supports that this feature leverages}

## Implementation Guidance
{2–3 key technical decisions or constraints for planning phase}
```

---

### Agent 4: Tech Stack Research (OPTIONAL — if user opted in)

**Goal:** Compare libraries, APIs, packages for `{FEATURE_DESCRIPTION}`.

**Instructions:**
1. Identify the main technical sub-problems to solve
2. For each, compare 2–3 solutions:
   - npm/pip stats (weekly downloads, GitHub stars, last release)
   - API stability, breaking-change history
   - Bundle size (frontend) or memory footprint (backend)
   - License compatibility
   - Community/ecosystem health
3. Produce a decision matrix with recommendation

**Output:** `{RESEARCH_DIR}/tech-stack.md`

```markdown
# Tech Stack Research: {Feature}

> Generated: {date}

## Sub-problems to Solve
{List of technical challenges this feature needs to address}

## Option Comparison

### Sub-problem 1: {name}
| Option | Stars | Downloads/wk | Bundle | License | Verdict |
|--------|-------|--------------|--------|---------|---------|
| {lib} | 12k | 800k | 45KB | MIT | ✅ Recommended |
| {lib} | 5k | 200k | 120KB | Apache | ⚠️ Heavy |

**Recommendation:** {option} — {rationale}

[repeat per sub-problem]

## Final Recommendation Stack
{Summary table: what to use for each need}

## Integration Notes
{How recommended libs fit into the existing tech stack}
```

---

### Agent 5: Metrics & ROI Analysis (OPTIONAL — if user opted in)

**Goal:** Estimate business impact of `{FEATURE_DESCRIPTION}`.

**Instructions:**
1. Industry benchmarks for this feature type
2. User impact: retention, engagement, NPS-relevant metrics
3. Revenue impact: direct or indirect
4. Effort vs. impact signal
5. Recommended KPIs and measurement approach

**Output:** `{RESEARCH_DIR}/metrics-roi.md`

```markdown
# Metrics & ROI: {Feature}

> Generated: {date}

## Industry Benchmarks
{What impact do similar features typically have? Sources cited.}

## User Impact Signals
| Metric | Expected Impact | Confidence | Source |
|--------|----------------|------------|--------|
| {metric} | +X% | High/Med/Low | {source} |

## Revenue Impact
{Direct/indirect revenue analysis}

## Effort vs. Impact
{Quick assessment: high/medium/low for both dimensions}

## Recommended KPIs
| KPI | Baseline | Target | Measurement |
|-----|----------|--------|-------------|
| {metric} | {current} | {goal} | {how} |

## Measurement Plan
- Day 1: {early signal}
- Week 1: {leading indicator}
- Month 1: {primary KPI review}
```

---

## Step 4: Wait for All Agents

Wait for all agents to complete. Do not generate the index until all are done.

---

## Step 5: Compile Research Index

Create `{RESEARCH_DIR}/README.md`:

```markdown
# Research Index: {Feature Name}

> Generated: {date} | Feature: {feature-slug}
> Input richness: {score}/8 | Interview mode: {FULL/PARTIAL/CONFIRM}
> Research dimensions: {list completed}

## Executive Summary

{2–3 sentences synthesizing the most important findings across all dimensions}

## Key Findings

| Dimension | Top Insight |
|-----------|-------------|
| 🏆 Competitors | {1-sentence finding} |
| 🎨 UX/UI | {1-sentence finding} |
| 🔧 Codebase | {1-sentence finding} |
| 📦 Tech Stack | {1-sentence finding — if researched} |
| 📊 Metrics | {1-sentence finding — if researched} |

## Research Documents

| Document | Status | Key Insight |
|----------|--------|-------------|
| [competitors.md](./competitors.md) | ✅ | {insight} |
| [ux-patterns.md](./ux-patterns.md) | ✅ | {insight} |
| [codebase-analysis.md](./codebase-analysis.md) | ✅ | {insight} |
| [tech-stack.md](./tech-stack.md) | ✅ Optional | {insight} |
| [metrics-roi.md](./metrics-roi.md) | ✅ Optional | {insight} |

## Synthesis: Recommended Approach
{4–6 sentences: what to build, how to build it, what to prioritize}

## Open Questions for Product Spec
{Questions research raised but couldn't answer — to resolve in Phase 2}

## Red Flags / Risks Identified
{Any significant risks discovered during research}
```

---

## Step 6: Update Status

```yaml
# {FEATURE_DIR}/.forge-status.yml
phases:
  research: completed
research_dimensions:
  competitors: completed
  ux_patterns: completed
  codebase: completed
  tech_stack: completed   # or: skipped
  metrics_roi: skipped    # or: completed
input_richness_score: {0-8}
last_updated: "{ISO timestamp}"
```

---

## Step 7: Present Results

Show:
1. Summary table of completed dimensions
2. Top 3 most important findings
3. Open questions that need answers in Phase 2
4. Any red flags or risks

Ask: *"Research complete — {N} dimensions analyzed, saved to `{RESEARCH_DIR}/`. Ready to proceed to Phase 2: Product Spec creation?"*

If standalone: *"Next: `/speckit.product-forge.product-spec`"*
