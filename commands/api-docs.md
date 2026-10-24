---
name: speckit.product-forge.api-docs
description: >
  Publish API docs after implement: reconcile the OpenAPI/AsyncAPI contracts with the
  implementation (or author OpenAPI 3.1 when no contracts exist), generate a Postman
  collection, and report contract↔implementation drift.
---

# Product Forge — API Docs

You are the **API Documentation Generator**. Publish an OpenAPI 3.1 spec (plus AsyncAPI
for events) and a Postman collection for the feature, and report drift between the
contract, the FE client calls and the BE handlers. When `contracts/openapi.yaml` /
`contracts/asyncapi.yaml` exist (authored in `bridge` / `plan`), they are the
authoritative input: validate and regenerate against them and the implementation; author
from scratch only when they are absent. Drift findings feed `verify-full` Layer 9.

## Input

```text
$ARGUMENTS
```

Follow the [command contract](../docs/runtime.md#0-command-contract).

- **Phase key:** `api_docs` (optional, outside the phase map)
- **Config keys:** `codebase_path` (or monorepo `codebase.paths`)
- **Writes:** `contracts/openapi.yaml` / `contracts/asyncapi.yaml` (in place),
  `api-docs/openapi.yml`, `api-docs/asyncapi.yml`, `api-docs/postman-collection.json`,
  `api-docs/consistency-report.md`, `api-docs/README.md`, `phases.api_docs.status`,
  top-level `api_docs_report`
- **Contract deltas:** no gate — the command sets `phases.api_docs.status` itself and
  writes no digest.

## Step 1: Check inputs

1. `phases.implement.status` is `completed`.
2. `plan.md` and `spec.md` exist. Load
   `contracts/openapi.yaml` and `contracts/asyncapi.yaml` when present.

Stop only when `plan.md` has no API endpoints **and** neither `contracts/openapi.yaml`
nor `contracts/asyncapi.yaml` exists: *"No API endpoints detected in plan.md. This
command generates docs for backend APIs; a frontend-only feature does not need
api-docs."* A feature with only contracts (or only an AsyncAPI contract) still gets docs.

## Step 2: Detect the API setup

Scan the feature and codebase for:

1. **Authoritative contracts** (check first): `{FEATURE_DIR}/contracts/openapi.yaml`
   (HTTP) and `{FEATURE_DIR}/contracts/asyncapi.yaml` (events).
2. **Framework** — NestJS / Express / FastAPI / Django REST / Rails / other, from
   `nest-cli.json`, `@nestjs/swagger`, `express`, `fastapi`, `rest_framework`.
3. **Existing OpenAPI setup** — `swagger.json`, `openapi.yml`, `@ApiProperty` decorators.
4. **Base path / versioning** — app prefix in `main.ts`, `globalPrefix`, version in URLs.
5. **Auth scheme** — JWT guards, API-key headers, OAuth2 config, `@ApiBearerAuth()`.
6. **DTO / schema files** — `*.dto.ts`, `*.schema.ts`, Zod schemas, Pydantic models.

Report as a short list: framework (and marker found), base URL, auth, DTO count, and the
existing spec — `contracts/openapi.yaml` / `contracts/asyncapi.yaml` detected
(authoritative — validate + regenerate), or none (generate from scratch).

## Step 3: Extract the API surface

Read in priority order:

1. `contracts/openapi.yaml` + `contracts/asyncapi.yaml`, keyed by `API-*` ids — the
   source of truth for the API surface when present.
2. Implementation files (DTOs, controllers, route handlers) — the source of truth for
   actual behaviour; drift against the contract is reported in Step 6.
3. `plan.md` → API endpoints section (method, path, request, response schemas).
4. `spec.md` → acceptance criteria that reference API behaviour.
5. `product-spec/product-spec.md` → API requirements from Must Have stories.

Without `contracts/*`, derive the surface from `plan.md` + `spec.md` + implementation.

For each endpoint record: HTTP method + path; request headers, path params, query params
and body schema; success schema (200/201) and error schemas (400/401/403/404/422/500);
whether auth is required and its scheme; description (from `plan.md` or inline
comments); examples (from test cases or `plan.md`).

## Step 4: Reconcile and publish the specs

### 4A — `contracts/*` exist

When `contracts/openapi.yaml` exists:

1. **Validate** `contracts/openapi.yaml` against the OpenAPI 3.1 schema and against the
   implementation (Step 6).
2. **Regenerate the same `contracts/openapi.yaml` in place** for endpoints, params or
   response shapes the implementation added or changed, keeping every `API-*` operation
   id. It stays the single source the FE and BE tasks share.
3. **Publish** `{FEATURE_DIR}/api-docs/openapi.yml` as a reconciled copy of
   `contracts/openapi.yaml`, with examples and descriptions enriched from test cases —
   for Swagger UI, Redoc, Stoplight and Postman import. Overwrite an existing copy from
   the contract; the published file is always a copy, never a separately authored spec.

When `contracts/asyncapi.yaml` exists (event-driven feature):

1. Validate it against the AsyncAPI schema and the implementation's publishers,
   subscribers, channel names and message payloads.
2. Regenerate the same `contracts/asyncapi.yaml` in place for any drift, keeping `API-*` ids.
3. Publish `{FEATURE_DIR}/api-docs/asyncapi.yml` as its reconciled copy. Events get no
   Postman collection.

### 4B — no `contracts/openapi.yaml`, but HTTP endpoints exist

Author `{FEATURE_DIR}/api-docs/openapi.yml` from `plan.md` + `spec.md` + implementation,
using [api-docs-openapi.md](../docs/templates/api-docs-openapi.md).

Result: `api-docs/openapi.yml` exists when the feature has HTTP endpoints, and
`api-docs/asyncapi.yml` when it has an AsyncAPI contract.

## Step 5: Postman collection

When the feature has HTTP endpoints, write `{FEATURE_DIR}/api-docs/postman-collection.json` from
[api-docs-postman-collection.md](../docs/templates/api-docs-postman-collection.md) —
one request per HTTP endpoint, each with success and validation-error examples.

## Step 6: Consistency check — contract vs implementation

The baseline is the contract (`contracts/openapi.yaml` / `contracts/asyncapi.yaml`, keyed
by `API-*`); without `contracts/*`, the endpoints derived from `plan.md`. For each
operation, check:

- [ ] Route path matches the controller decorator
- [ ] HTTP method matches
- [ ] Request DTO fields match the contract schema
- [ ] Response shape matches the contract response
- [ ] Auth guard is applied when the contract requires auth
- [ ] Validation decorators exist on required fields
- [ ] With `contracts/asyncapi.yaml`: each channel's publisher/subscriber and message
      payload match the events the implementation emits/consumes

Report each mismatch as a numbered `DRIFT-NNN` with the operation and its `API-*` id,
the contract's statement, the implementation's statement, and the fix direction:

```
DRIFT-001: POST /api/v1/features (API-012)
  Contract:       body requires `priority` field (string, required)
  Implementation: `priority` is optional in CreateFeatureDto
  → Update DTO or update contracts/openapi.yaml
```

End with `No drift found: {N} operations ✅`. Save the report to
`{FEATURE_DIR}/api-docs/consistency-report.md`.

## Step 7: API docs README

Write `{FEATURE_DIR}/api-docs/README.md` from
[api-docs-readme.md](../docs/templates/api-docs-readme.md).

## Step 8: Update status and report

`api_docs_report` is a top-level block (named so it does not collide with
`phases.api_docs`):

```yaml
phases:
  api_docs:
    status: completed
api_docs_report:
  endpoints: {N}
  source: contracts            # "contracts" (reconciled) | "scratch" (no contracts/*)
  openapi_file: "api-docs/openapi.yml"     # omit if no HTTP endpoints
  asyncapi_file: "api-docs/asyncapi.yml"   # omit if no contracts/asyncapi.yaml
  postman_file: "api-docs/postman-collection.json"   # omit if no HTTP endpoints
  drift_issues: {N}
```

Show `API Docs Generated: {Feature Name}`: the source (`contracts/openapi.yaml`
(+ `contracts/asyncapi.yaml`) — reconciled & published, or scratch); endpoints documented
(`{METHOD} {path} — {description}` each); files created (`api-docs/openapi.yml`,
`api-docs/asyncapi.yml` if events, `api-docs/postman-collection.json`,
`api-docs/consistency-report.md`); consistency `{N} operations clean ✅ {N} drift
issues ⚠️`; preview command `npx @stoplight/prism-cli mock {FEATURE_DIR}/api-docs/openapi.yml`.

## Done when

- Each existing contract is validated and regenerated in place with every existing
  `API-*` id kept, and `api-docs/openapi.yml` / `api-docs/asyncapi.yml` is its reconciled
  copy. HTTP endpoints without `contracts/openapi.yaml`: `api-docs/openapi.yml` is
  authored from the template.
- Every HTTP endpoint from Step 3 appears in `openapi.yml` and in `postman-collection.json`.
- Every contract operation was checked against the implementation, and
  `consistency-report.md` lists each `DRIFT-NNN` (or reports no drift).
- `api-docs/README.md` exists; `phases.api_docs.status` is `completed` and
  `api_docs_report` carries every field, with `drift_issues` equal to the reported count.
