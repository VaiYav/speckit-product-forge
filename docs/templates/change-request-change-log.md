> Template for `change-log.md` — written by `change-request` Step 5.

Create the file with the `# Change Log` heading on the first CR; append one `## CR-{NNN}`
section per change request after that. A DEFERRED or REJECTED CR has no *Artifacts
Modified* or *New Tasks Added* rows.

```markdown
# Change Log: {Feature Name}

## CR-{NNN}: {title} — {date}

| Field | Value |
|-------|-------|
| **Status** | ACCEPTED / DEFERRED / REJECTED |
| **Priority** | Must Have / Should Have / Could Have |
| **Requested at phase** | {current phase when requested} |
| **Rationale** | {why the change was needed} |
| **Impact** | {N} artifacts, +{N} tasks, {effort delta} |
| **Phase rollback** | {yes/no — to which phase} |

### Artifacts Modified
| Artifact | Change Type | Description |
|----------|:----------:|-------------|
| {file} | Added / Modified / Removed | {what changed} |

### New Tasks Added
| Task | Description | Phase |
|------|-------------|-------|
| {task} | {description} | Phase {N} |

### Decision Notes
{User's reasoning for accept/defer/reject}
```
