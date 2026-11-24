{{header}}

# System Design: {{project.name}}

{{project.description}}

## 1. System overview and data flow
{{design.overview}}

## 2. Conceptual data model
```mermaid
{{design.entities}}
```

The users entity follows the documented authentication contract. Optional feature entities contain only shared identity and timestamp fields. Define business fields and relationships from the agreed requirements before writing migrations; no foreign keys or relationships are assumed here. For document databases, these are conceptual entities rather than SQL tables.

{{design.data}}

## 3. API design
{{design.api}}

## 4. Modules and dependencies
{{design.modules}}

### Request lifecycle
{{design.lifecycle}}

## 5. Compatibility and unverified decisions
{{compatibility}}

{{unverified.all}}
