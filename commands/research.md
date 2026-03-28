---
name: product-forge.research
description: >
  Phase 1: Multi-dimensional parallel feature research. Mandatory dimensions: competitor
  analysis, UX/UI patterns, codebase integration analysis. Optional: tech stack libraries,
  metrics/ROI. Saves structured research artifacts to features/<name>/research/.
  Use with: "research feature", "/product-forge.research"
---

# Product Forge — Phase 1: Research

You are the **Research Orchestrator** for Product Forge Phase 1.
Your goal: gather exhaustive, structured research across all relevant dimensions before any
product spec is written. Research is the foundation — the deeper and more honest, the better.

## User Input

```text
$ARGUMENTS
```

---

## Step 1: Gather Context

If not provided via orchestrator, collect:

**Feature description:**
Ask: *"What feature are we researching? Describe it in 1-3 sentences — what it does, who it's for, what problem it solves."*

**Feature name (for file slug):**
Derive a kebab-case slug from the feature description.
Example: "Push notification preferences" → `push-notification-preferences`
Set `FEATURE_DIR = {features_dir}/{feature-slug}/`
Set `RESEARCH_DIR = {FEATURE_DIR}/research/`

**Load project config** from `.product-forge/config.yml`:
- `project_name` — used for codebase agent context
- `project_domain` — used for competitor/UX context
- `project_tech_stack` — used for tech stack agent
- `codebase_path` — used for codebase analysis agent

---

## Step 2: Configure Research Dimensions

Ask the user the following questions (can be answered in one message):

### Mandatory dimensions (always run):
- ✅ **Competitor analysis** — Who solves this already? How?
- ✅ **UX/UI patterns** — Best interactions, flows, design patterns for this feature
- ✅ **Codebase analysis** — Where does this fit in the existing code?

### Optional dimensions (ask explicitly):

**Question 1:** *"Should we research tech stack options (libraries, APIs, packages) for this feature? [yes/no]"*

**Question 2:** *"Should we include a metrics/ROI analysis (business impact, KPIs, monetization potential)? [yes/no]"*

**Question 3:** *"Do you have a list of specific competitors to analyze? If yes, list them. If no, I'll find them automatically."*

**Question 4:** *"Any additional context: existing designs, related tickets, prior art, or constraints I should know about?"*

Store: `RUN_TECH = yes|no`, `RUN_METRICS = yes|no`, `COMPETITOR_LIST`, `EXTRA_CONTEXT`.

---

## Step 3: Launch Parallel Research Agents

Launch ALL active research dimensions **in parallel** using the Agent tool.
Each agent is independent — start them simultaneously for maximum speed.

### Agent 1: Competitor Research (MANDATORY)

**Task:** Analyze how competitors and existing products approach `{FEATURE_DESCRIPTION}`.

Provide context:
- Feature: `{FEATURE_DESCRIPTION}`
- Project domain: `{project_domain}`
- Competitor list (if provided): `{COMPETITOR_LIST}` — if empty, find 5-8 relevant competitors
- Extra context: `{EXTRA_CONTEXT}`

**Instructions for the agent:**
1. Research each competitor: find screenshots, descriptions, user reviews
2. For each competitor, document:
   - Feature name and positioning
   - Core interaction pattern
   - Key differentiators
   - Pricing/access model (free/paid/premium)
   - User sentiment (App Store reviews, Reddit, Twitter)
3. Identify the top 3 "best implementations" with rationale
4. Find any open-source or publicly described implementations
5. Identify gaps — what no one does well yet

**Output file:** `{RESEARCH_DIR}/competitors.md`

Format:
```markdown
# Competitor Analysis: {Feature}

> Generated: {date} | Feature: {feature-slug}

## Executive Summary
[2-3 paragraphs: key patterns, gaps, top recommendation]

## Competitors Analyzed

### 1. {Competitor Name}
- **Feature:** [how they implement it]
- **Differentiator:** [what makes it unique]
- **Access:** [free/premium/paid]
- **User sentiment:** [positive/negative patterns from reviews]
- **Screenshot/link:** [if available]

[...repeat for each competitor]

## Pattern Analysis
[Common patterns across competitors — what works, what doesn't]

## Gaps & Opportunities
[What no competitor does well — our opportunity]

## Top 3 Implementations to Study
1. {Name} — {reason}
2. {Name} — {reason}
3. {Name} — {reason}
```

---

### Agent 2: UX/UI Patterns Research (MANDATORY)

**Task:** Research the best UX/UI patterns, interactions, and design approaches for `{FEATURE_DESCRIPTION}`.

Provide context:
- Feature: `{FEATURE_DESCRIPTION}`
- Domain: `{project_domain}`
- Tech stack: `{project_tech_stack}` (for platform-specific patterns)

**Instructions for the agent:**
1. Research UX best practices for this type of feature (Baymard, Nielsen Norman, UX Collective, etc.)
2. Document:
   - Primary user flows (happy paths)
   - Edge cases and error states
   - Empty states
   - Loading/skeleton patterns
   - Mobile-first considerations (if mobile product)
   - Accessibility requirements (WCAG relevant to this feature)
3. Find 3-5 UI pattern examples with visual descriptions
4. Identify key micro-interactions and animations that elevate the experience
5. List anti-patterns to avoid (common UX mistakes for this feature type)

**Output file:** `{RESEARCH_DIR}/ux-patterns.md`

Format:
```markdown
# UX/UI Patterns: {Feature}

> Generated: {date}

## Core User Flows

### Happy Path
[Step-by-step primary user journey]

### Edge Cases
[List of edge cases with handling recommendations]

## UI Pattern Library
[Description of 3-5 proven UI patterns for this feature with sources]

## State Inventory
- **Empty state:** [description + recommendation]
- **Loading state:** [skeleton/spinner pattern]
- **Error state:** [user-friendly error handling]
- **Success state:** [confirmation pattern]

## Mobile Considerations
[Touch targets, gestures, thumb zones, etc.]

## Accessibility Requirements
[WCAG criteria relevant to this feature]

## Micro-interactions & Animations
[Key moments that deserve animation/feedback]

## Anti-patterns to Avoid
[Common mistakes for this feature type]

## Recommended Approach
[2-3 paragraphs synthesizing the best approach for our context]
```

---

### Agent 3: Codebase Integration Analysis (MANDATORY)

**Task:** Analyze the existing codebase at `{codebase_path}` to find integration points for `{FEATURE_DESCRIPTION}`.

Provide context:
- Feature: `{FEATURE_DESCRIPTION}`
- Codebase path: `{codebase_path}`
- Tech stack: `{project_tech_stack}`

**Instructions for the agent:**
1. Explore the codebase structure (top-level dirs, src layout, key modules)
2. Find existing code relevant to this feature:
   - Similar features already implemented
   - Shared components/services that can be reused
   - Data models that overlap
   - API endpoints that can be extended
3. Identify integration points:
   - Where new code plugs in
   - What needs to be modified
   - What can be reused as-is
4. Assess technical complexity:
   - New module needed or extension of existing?
   - Database schema changes required?
   - Breaking changes risk?
5. List the current tech capabilities of the project relevant to this feature

**Output file:** `{RESEARCH_DIR}/codebase-analysis.md`

Format:
```markdown
# Codebase Analysis: {Feature}

> Generated: {date} | Codebase: {codebase_path}

## Project Structure Overview
[Top-level architecture summary]

## Relevant Existing Code

### Reusable Components / Services
| Component/Service | Location | How to Reuse |
|-------------------|----------|--------------|
| {name} | {path} | {description} |

### Related Features (reference implementations)
| Feature | Location | Relevance |
|---------|----------|-----------|
| {name} | {path} | {description} |

## Integration Points
| Where | Type | Change Required |
|-------|------|----------------|
| {module} | New / Extend / Modify | {description} |

## Data Model Impact
[Schema changes, new collections/tables, migrations needed]

## Technical Complexity Assessment
- **Complexity:** Low / Medium / High
- **New modules needed:** [list]
- **Breaking changes:** None / Possible / Likely
- **Estimated touch points:** [N files/modules]

## Current Tech Capabilities
[What the project already supports that this feature can leverage]

## Implementation Notes
[Key technical decisions and constraints for Phase 4+ planning]
```

---

### Agent 4: Tech Stack Research (OPTIONAL — only if `RUN_TECH = yes`)

**Task:** Research and compare libraries, APIs, and packages for implementing `{FEATURE_DESCRIPTION}`.

**Instructions:**
1. Identify the main technical sub-problems this feature needs to solve
2. For each sub-problem, compare 2-3 solutions:
   - npm/pip package stats (weekly downloads, last update, GitHub stars)
   - API stability and breaking-change history
   - Bundle size impact (for frontend)
   - License compatibility
   - Community support
3. Provide a recommendation matrix with rationale

**Output file:** `{RESEARCH_DIR}/tech-stack.md`

---

### Agent 5: Metrics & ROI Analysis (OPTIONAL — only if `RUN_METRICS = yes`)

**Task:** Estimate the business impact and success metrics for `{FEATURE_DESCRIPTION}`.

**Instructions:**
1. Industry benchmarks: what metrics does this type of feature typically impact?
2. User impact: retention, engagement, satisfaction (NPS-relevant)
3. Revenue impact: direct (monetization potential) or indirect (churn reduction, activation)
4. Effort vs. impact assessment
5. Recommended KPIs and measurement approach
6. Success/failure definition

**Output file:** `{RESEARCH_DIR}/metrics-roi.md`

---

## Step 4: Wait for All Agents to Complete

Wait for all launched agents to finish. Do not proceed until all active agents have returned results.

---

## Step 5: Compile Research Index

Create `{RESEARCH_DIR}/README.md` — the master index linking all research artifacts:

```markdown
# Research Index: {Feature Name}

> Generated: {date} | Feature: {feature-slug}
> Research dimensions: {list of completed dimensions}

## Quick Summary

{2-3 sentence executive summary synthesizing all research}

## Key Findings

- **Competitors:** {top finding in 1 sentence}
- **UX/UI:** {top finding in 1 sentence}
- **Codebase:** {top finding in 1 sentence}
- **Tech Stack:** {top finding in 1 sentence — if applicable}
- **Metrics/ROI:** {top finding in 1 sentence — if applicable}

## Research Documents

| Document | Dimensions | Key Insight |
|----------|-----------|-------------|
| [competitors.md](./competitors.md) | Competitor analysis | {1-line insight} |
| [ux-patterns.md](./ux-patterns.md) | UX/UI patterns | {1-line insight} |
| [codebase-analysis.md](./codebase-analysis.md) | Integration points | {1-line insight} |
| [tech-stack.md](./tech-stack.md) | Libraries & APIs | {1-line insight} |
| [metrics-roi.md](./metrics-roi.md) | Business impact | {1-line insight} |

## Recommended Approach
{3-5 sentences: synthesized recommendation for product spec phase}

## Open Questions for Product Spec
{Bullet list of questions that research raised but couldn't answer — to be resolved in Phase 2}
```

---

## Step 6: Update Status

Update `{FEATURE_DIR}/.forge-status.yml`:
```yaml
phases:
  research: completed
last_updated: "{ISO timestamp}"
```

---

## Step 7: Present Results

Show the user:
1. Summary table of completed research dimensions
2. Key findings from `{RESEARCH_DIR}/README.md`
3. Any questions raised by research that need user input in Phase 2

Ask: *"Research phase complete. All documents saved to `{RESEARCH_DIR}/`. Ready to proceed to Phase 2: Product Spec creation?"*

If running standalone (not via forge orchestrator), also ask:
*"To continue the full lifecycle, run `/product-forge.product-spec` next."*
