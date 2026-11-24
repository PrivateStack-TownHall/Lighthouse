{{header}}

# Project Contract: {{project.name}}

The agreement for building {{project.name}}. The bundled specifications define the response contract, implementation responsibilities and verification criteria for the selected stack.

## 1. Project information
{{project.info}}

{{project.description}}

## 2. Technology stack
{{stack.table}}

{{compatibility}}

## 3. Project scope
### Requested outcomes
{{project.features}}

### Outside the agreed scope
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

## 8. Definition of Done
{{dod}}

## 9. Unverified
{{unverified.all}}
