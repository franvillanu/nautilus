# SDD Roles

This repo uses role profiles to reduce ambiguity and regressions. Roles live in `.sdd/roles/` and tasks live in `.sdd/tasks/`.

## Use (scripts)
- Mac/Linux/WSL: `./.sdd/sdd.sh role <role> .sdd/tasks/<task-name>.md`
- Windows: `powershell -ExecutionPolicy Bypass -File .sdd/sdd.ps1 -Role <role> -TaskFile .sdd/tasks/<task-name>.md`

## Use (manual chat)
Send:
1) "Act as <RoleName>"
2) Paste role file
3) Paste task file
4) "Follow the role instructions and produce output in the role's required format."

## Auto-select rules
If no role is specified, choose:
- Architect: planning, design, interfaces, risks, scope clarification.
- Implementer: code changes, feature work, bug fixes, tests.
- Reviewer: review diffs, find issues, give verdict.
- QA: test strategy, edge cases, fixtures, validation.