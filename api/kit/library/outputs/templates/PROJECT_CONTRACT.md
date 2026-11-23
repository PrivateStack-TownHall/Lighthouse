{{header}}

# Project Contract: {{project.name}}

The agreement for building {{project.name}}. Sections 3-6 are the shared standard of every A1/A2/A3 app (from `contract-kit/docs/CONVENTIONS.md`): they read the same whatever the stack. Section 7 says where each part lives in **this** stack.

## 1. Project information
{{project.info}}

{{project.description}}

## 2. Technology stack
{{stack.table}}

{{compatibility}}

## 3. Scope of v1
### Must-have features
{{project.features}}

### Not in v1 (parking lot)
{{project.parkingLot}}

## 4. API contract
Base URL: `{{api.baseUrl}}` · Swagger UI: `{{api.baseUrl}}/docs` · no version segment.

### 4.1 Response envelope
{{conv.envelope}}

### 4.2 Endpoints
{{api.endpoints}}

{{api.endpointNotes}}

### 4.3 Query parameters (every list)
{{conv.query}}

### 4.4 Authentication
{{conv.auth}}

### 4.5 Observability responses
{{obs.shapes}}

## 5. Data conventions
{{conv.data}}

{{data.tables}}

## 6. Rules
### Fixed Rules (system, the same for every project)
{{rules.fixed}}

### Custom rules (this project)
{{rules.custom}}

## 7. Where the contract lives in this stack
{{impl.table}}

## 8. Definition of Done (v1)
{{dod}}

## 9. Unverified
{{unverified.all}}
