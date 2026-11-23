{{header}}

# Architecture: {{project.name}}

{{arch.summary}}

## 1. System overview
```mermaid
{{arch.diagram}}
```

{{ports.table}}

## 2. Repository layout
```
{{arch.repo}}
```

## 3. Backend: {{arch.backendTitle}}
### 3.1 Folders
```
{{arch.backendTree}}
```

### 3.2 Layers
{{arch.backendRules}}

### 3.3 Request lifecycle
{{arch.lifecycle}}

### 3.4 Stack notes
{{arch.backendNotes}}

{{arch.frontend}}

## {{arch.n.naming}}. Naming
{{arch.naming}}

## {{arch.n.places}}. Same job, same place
{{arch.places}}

## {{arch.n.helpers}}. `common/` vs `helpers/`
{{arch.helpers}}

## {{arch.n.unverified}}. Unverified
{{arch.unverified}}
