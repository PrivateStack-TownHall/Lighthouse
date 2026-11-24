# Definition of Done

Completion is measured against the project purpose, agreed scope and evidence below. A feature list is optional; there is no required feature count or release-stage freeze.

## Before implementation
- Record the purpose, intended users, scope and exclusions from the project description and custom rules.
- Turn the requested outcomes into observable acceptance criteria. Ask only when an unresolved decision changes behavior, data, access or scope.
- Record applicable integration contracts, environment requirements and local ports.

## Done checklist
- [ ] The agreed outcomes work end to end; each acceptance criterion has a recorded result.
- [ ] Applicable input validation, error handling and access restrictions work, including negative paths.
- [ ] Changes have appropriate regression coverage; no fake responses or unfinished placeholders are presented as complete.
- [ ] Applicable build, typecheck, lint and test commands pass; exact commands and results are recorded.
- [ ] Setup, configuration and relevant implementation decisions are documented and reproducible.
- [ ] Unverified assumptions, skipped checks and remaining blockers are disclosed.

## Evidence and scope changes
Record each criterion, its verification command or manual procedure, the result and any remaining blocker. Start every checkbox unchecked; generated documentation is not evidence of implementation. Mark a criterion not applicable only with a reason. Document scope changes and update affected acceptance criteria before implementing them; no mandatory release labels or future-version buckets apply.
