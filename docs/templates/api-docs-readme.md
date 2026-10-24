> Template for `api-docs/README.md` — written by `api-docs` Step 7.

List `asyncapi.yml` only for event-driven features.

````markdown
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
```bash
npx @stoplight/prism-cli mock api-docs/openapi.yml
# Open: http://localhost:4010
```

### Import into Postman
1. Postman → Import → File → select `postman-collection.json`
2. Set collection variable `baseUrl` to your dev server
3. Run "Login" request first → token saved automatically
4. All other requests use the token from login

### Publish to project docs
If project has Swagger/Redoc integration, copy `openapi.yml` to the expected location:
```bash
cp api-docs/openapi.yml {project swagger path}
```

## Consistency Report

{summary from consistency-report.md}
````
