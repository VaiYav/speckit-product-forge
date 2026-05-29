---
name: speckit.product-forge.api-docs
description: >
  Generates OpenAPI 3.1 spec and Postman collection from plan.md API contracts.
  Auto-detects existing API framework (NestJS, Express, FastAPI, etc.), validates
  consistency between spec and implementation, and outputs ready-to-publish docs.
  Use after implement: "generate API docs", "/speckit.product-forge.api-docs"
---

# Product Forge — API Docs Generation

You are the **API Documentation Generator** for Product Forge.
Your goal: extract API contracts from feature artifacts and generate production-ready
OpenAPI 3.1 spec and a Postman collection — automatically, with no manual writing.

## User Input

```text
$ARGUMENTS
```

---

> **Contract-first (v1.6, Theme F):** when `contracts/openapi.yaml` /
> `contracts/asyncapi.yaml` already exist (authored in `bridge`/`plan`), this command
> **validates and regenerates against them and the implementation** rather than
> authoring contracts from scratch. Report drift between the contract, the FE client
> calls, and the BE handlers as findings (feeds `verify-full` Layer 9).

## Step 1: Validate Prerequisites

1. Read `.forge-status.yml` — `implement` must be `completed` (Phase 6 done)
2. Verify `plan.md` exists and contains API endpoint definitions
3. Verify `spec.md` exists; load `contracts/openapi.yaml` + `contracts/asyncapi.yaml` if present

If no API endpoints found in plan.md:
> ℹ️ No API endpoints detected in plan.md. This command generates docs for backend APIs.
> If this is a frontend-only feature, api-docs is not needed.

---

## Step 2: Auto-detect API Framework

Scan the codebase to understand the API framework:

```
🔍 Detecting API framework...
```

Detect:
1. **Authoritative contracts (check first):**
   - Look for: `{FEATURE_DIR}/contracts/openapi.yaml` (HTTP) and
     `{FEATURE_DIR}/contracts/asyncapi.yaml` (events), authored in `bridge`/`plan`.
   - **If present, these are the authoritative input** — this command validates and
     regenerates against them + the implementation, it does **not** re-author from scratch.
2. **Framework:** NestJS / Express / FastAPI / Django REST / Rails / other
   - Look for: `nest-cli.json`, `@nestjs/swagger`, `express`, `fastapi`, `rest_framework`
3. **Existing OpenAPI setup:**
   - Look for: `swagger.json`, `openapi.yml`, `@ApiProperty` decorators (NestJS)
4. **Base path / versioning:**
   - Look for: app prefix in `main.ts`, `globalPrefix`, version in URL patterns
5. **Auth scheme:**
   - Look for: JWT guards, API key headers, OAuth2 config, `@ApiBearerAuth()`
6. **Existing DTO/schema files:**
   - Look for: `*.dto.ts`, `*.schema.ts`, Zod schemas, Pydantic models

Report (contracts present — the common path after `bridge`/`plan`):
```
🔍 Auto-detected:
  Framework:       NestJS (@nestjs/swagger found)
  Base URL:        /api/v1 (main.ts globalPrefix)
  Auth:            Bearer JWT (JwtAuthGuard)
  DTOs:            12 DTO files found
  Existing spec:   contracts/openapi.yaml detected (authoritative — validate + regenerate)
                   contracts/asyncapi.yaml detected (authoritative — validate + regenerate)
```

Report (no contracts — fallback, author from scratch):
```
🔍 Auto-detected:
  ...
  Existing spec:   None (no contracts/*; will generate from scratch)
```

---

## Step 3: Extract API Contracts from Artifacts

Read in order of priority:
1. **`contracts/openapi.yaml` + `contracts/asyncapi.yaml` (authoritative when present)** —
   the FE↔BE contract authored in `bridge`/`plan`, keyed by `API-*` ids. When these exist
   they are the source of truth for the API surface; the steps below validate/regenerate
   against them rather than re-deriving the contract.
2. Implementation files (DTOs, controllers, route handlers) — source of truth for the
   *actual* behavior; drift between contract and implementation is reported in Step 6.
3. `plan.md` → API endpoints section (method, path, request, response schemas)
4. `spec.md` → acceptance criteria referencing API behavior
5. `product-spec/product-spec.md` → API requirements from Must Have stories

> If `contracts/*` are **absent** (no `bridge`/`plan` contract step ran), fall back to
> deriving the surface from `plan.md` + `spec.md` + implementation (the from-scratch path).

For each endpoint found, extract:
- HTTP method + path
- Request: headers, path params, query params, body schema
- Response: success schema (200/201), error schemas (400/401/403/404/422/500)
- Auth required: yes/no + scheme
- Description: from plan.md or inline comments
- Examples: from test cases or plan.md

---

## Step 4: Reconcile & Publish the OpenAPI/AsyncAPI Specs

### 4A — When `contracts/*` exist (authoritative path — the common case after `bridge`/`plan`)

Do **not** re-author a divergent spec. Instead:

1. **Validate** `contracts/openapi.yaml` against the implementation (Step 6 drift check) and
   against the OpenAPI 3.1 schema.
2. **Regenerate / update the SAME `contracts/openapi.yaml`** in place when the implementation
   has added/changed endpoints, params, or response shapes that the contract is missing —
   preserving its stable `API-*` operation ids. This keeps `contracts/openapi.yaml` the single
   source the FE↔BE tasks share.
3. **Publish** `{FEATURE_DIR}/api-docs/openapi.yml` as a **reconciled copy OF**
   `contracts/openapi.yaml` (the human-/tool-facing published artifact for Swagger UI, Redoc,
   Stoplight, Postman import). It is a copy with examples/descriptions enriched from test cases —
   **never** a separately re-authored file. If it already exists, overwrite it from
   `contracts/openapi.yaml` (reconcile, do not fork).

**AsyncAPI branch** — if `contracts/asyncapi.yaml` exists (event-driven feature):
1. **Validate** it against the AsyncAPI schema and against the emitted/consumed events in the
   implementation (publishers/subscribers, channel names, message payloads).
2. **Regenerate / update the SAME `contracts/asyncapi.yaml`** in place for any drift, preserving
   `API-*` ids.
3. **Publish** `{FEATURE_DIR}/api-docs/asyncapi.yml` as a reconciled copy of
   `contracts/asyncapi.yaml`. (No Postman collection for events.)

Record contract↔implementation drift in Step 6.

### 4B — Fallback: no `contracts/*` present (author from scratch)

Only when `bridge`/`plan` produced no contracts. Author `{FEATURE_DIR}/api-docs/openapi.yml`
directly from `plan.md` + `spec.md` + implementation, using the skeleton below:

```yaml
openapi: "3.1.0"

info:
  title: "{Feature Name} API"
  version: "{feature version from plan.md or 1.0.0}"
  description: |
    {Feature description from product-spec.md}

    Generated by Product Forge from feature: `{feature-slug}`
    Source: plan.md + spec.md + implementation analysis
  contact:
    name: "{project_name} Team"

servers:
  - url: "{BASE_URL}"
    description: "Development"
  - url: "{STAGING_URL}"
    description: "Staging"

security:
  - BearerAuth: []      # if JWT detected

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # — Per-endpoint request/response schemas —

    {FeatureName}CreateRequest:
      type: object
      required: [{required fields}]
      properties:
        {field}:
          type: {type}
          description: "{description}"
          example: {example}
      example:
        {full request example}

    {FeatureName}Response:
      type: object
      properties:
        {field}:
          type: {type}
          description: "{description}"
          example: {example}

    ErrorResponse:
      type: object
      properties:
        statusCode:
          type: integer
          example: 400
        message:
          type: string
          example: "Validation failed"
        errors:
          type: array
          items:
            type: string

paths:
  {/api/v1/feature-path}:
    get:
      tags: ["{Feature Name}"]
      summary: "{Short description}"
      description: |
        {Longer description}

        **User Story:** {US-NNN}
        **AC:** {AC reference}
      operationId: "{camelCase operation name}"
      security:
        - BearerAuth: []
      parameters:
        - name: {param}
          in: query   # or path, header
          required: false
          schema:
            type: string
          description: "{description}"
          example: "{example}"
      responses:
        "200":
          description: "Success"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/{FeatureName}Response"
              example:
                {full response example from test cases}
        "401":
          description: "Unauthorized — missing or invalid token"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "404":
          description: "Not found"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

    post:
      tags: ["{Feature Name}"]
      summary: "{Short description}"
      operationId: "{camelCase operation name}"
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/{FeatureName}CreateRequest"
            example:
              {full request example}
      responses:
        "201":
          description: "Created"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/{FeatureName}Response"
        "400":
          description: "Validation error"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "401":
          description: "Unauthorized"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  # ... all other endpoints ...
```

---

## Step 5: Generate Postman Collection

Create `{FEATURE_DIR}/api-docs/postman-collection.json`:

```json
{
  "info": {
    "name": "{Feature Name} — {project_name}",
    "_postman_id": "{generated UUID}",
    "description": "Generated by Product Forge from feature: {feature-slug}",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "{BASE_URL}", "type": "string" },
    { "key": "token", "value": "", "type": "string", "description": "Set after login" }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [{ "key": "token", "value": "{{token}}", "type": "string" }]
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login (get token)",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "const res = pm.response.json();",
                  "pm.collectionVariables.set('token', res.accessToken);"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\"email\": \"{{testEmail}}\", \"password\": \"{{testPassword}}\"}"
            }
          }
        }
      ]
    },
    {
      "name": "{Feature Name}",
      "item": [
        {
          "name": "{Endpoint name} — {HTTP method} {path}",
          "request": {
            "method": "{METHOD}",
            "url": {
              "raw": "{{baseUrl}}{path}",
              "host": ["{{baseUrl}}"],
              "path": ["{path segments}"],
              "query": [
                { "key": "{param}", "value": "{example}", "description": "{description}" }
              ]
            },
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{request body JSON example}"
            },
            "description": "{description from plan.md}\n\nUser Story: {US-NNN}"
          },
          "response": [
            {
              "name": "200 OK — Success",
              "status": "OK",
              "code": 200,
              "body": "{response example JSON}"
            },
            {
              "name": "400 — Validation error",
              "status": "Bad Request",
              "code": 400,
              "body": "{error response example}"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Step 6: Consistency Check — Contract vs Implementation

Compare the authoritative contract against the actual implementation files. When
`contracts/*` exist, the contract (`contracts/openapi.yaml` / `contracts/asyncapi.yaml`,
keyed by `API-*`) is the baseline; otherwise fall back to the endpoints derived from
`plan.md`. Reported drift also feeds `verify-full` Layer 9 (FE↔contract↔BE).

For each endpoint/operation in the contract (fall back to `plan.md` if no `contracts/*`), verify:
- [ ] Route path matches controller decorator
- [ ] HTTP method matches
- [ ] Request DTO fields match the contract schema
- [ ] Response shape matches the contract response
- [ ] Auth guard is applied (if the contract requires auth)
- [ ] Validation decorators exist on required fields
- [ ] **[if `contracts/asyncapi.yaml`]** each channel's publisher/subscriber + message payload
      matches the emitted/consumed events in the implementation

Report any drift:

```
⚠️ Consistency Issues Found:

DRIFT-001: POST /api/v1/features (API-012)
  Contract:       body requires `priority` field (string, required)
  Implementation: `priority` is optional in CreateFeatureDto
  → Update DTO or update contracts/openapi.yaml

DRIFT-002: GET /api/v1/features/:id (API-013)
  Contract:       returns full feature object
  Implementation: returns only {id, name, status} (projection)
  → Update contracts/openapi.yaml response schema to match actual response

No drift found: {N} operations ✅
```

Save drift report to `{FEATURE_DIR}/api-docs/consistency-report.md`.

---

## Step 7: Generate README for API Docs

Create `{FEATURE_DIR}/api-docs/README.md`:

```markdown
# API Documentation: {Feature Name}

Generated: {date} | Feature: `{feature-slug}`

## Endpoints

| Method | Path | Auth | Description | Story |
|--------|------|------|-------------|-------|
| GET | {path} | Bearer | {description} | {US-NNN} |
| POST | {path} | Bearer | {description} | {US-NNN} |
| PATCH | {path} | Bearer | {description} | {US-NNN} |
| DELETE | {path} | Bearer | {description} | {US-NNN} |

## Files

- `openapi.yml` — OpenAPI 3.1 spec, **published copy of `contracts/openapi.yaml`** (import into Swagger UI, Redoc, Stoplight)
- `asyncapi.yml` — **[event-driven features]** published copy of `contracts/asyncapi.yaml`
- `postman-collection.json` — Import directly into Postman

## How to use

### Swagger UI (local)
\`\`\`bash
npx @stoplight/prism-cli mock api-docs/openapi.yml
# Open: http://localhost:4010
\`\`\`

### Import into Postman
1. Postman → Import → File → select `postman-collection.json`
2. Set collection variable `baseUrl` to your dev server
3. Run "Login" request first → token saved automatically
4. All other requests use the token from login

### Publish to project docs
If project has Swagger/Redoc integration, copy `openapi.yml` to the expected location:
\`\`\`bash
cp api-docs/openapi.yml {project swagger path}
\`\`\`

## Consistency Report

{summary from consistency-report.md}
```

---

## Step 8: Update Status & Present Results

Update `.forge-status.yml`:

```yaml
phases:
  api_docs: completed
# Top-level instrumentation block. Named `api_docs_report` (not `api_docs`) to avoid
# the sibling collision with the `phases.api_docs` status entry — same rename pattern
# the v3 schema applied to tasks → task_log.
api_docs_report:
  endpoints: {N}
  source: contracts            # "contracts" (reconciled) | "scratch" (no contracts/*)
  openapi_file: "api-docs/openapi.yml"
  asyncapi_file: "api-docs/asyncapi.yml"   # omit if no contracts/asyncapi.yaml
  postman_file: "api-docs/postman-collection.json"
  drift_issues: {N}
last_updated: "{ISO timestamp}"
```

```
📄 API Docs Generated: {Feature Name}

Source: contracts/openapi.yaml (+ contracts/asyncapi.yaml) — reconciled & published

Endpoints documented: {N}
  GET   {path} — {description}
  POST  {path} — {description}
  PATCH {path} — {description}

Files created:
  api-docs/openapi.yml              ← published copy of contracts/openapi.yaml
  api-docs/asyncapi.yml             ← published copy of contracts/asyncapi.yaml (if events)
  api-docs/postman-collection.json  ← Postman collection
  api-docs/consistency-report.md    ← contract vs implementation drift

Consistency: {N} operations clean ✅  {N} drift issues ⚠️

To preview:
  npx @stoplight/prism-cli mock features/{slug}/api-docs/openapi.yml
```
