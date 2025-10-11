# Copilot Instructions for Nautilus

## Critical Rules - NEVER BREAK THESE:

1. **NEVER run git clean -fd or git reset --hard** - These destroy local data
2. **NEVER touch .wrangler folder** - Contains local database
3. **NEVER touch production** (nautilus-dky.pages.dev) without explicit permission
4. **Data files are sacred:** tasks, projects, .wrangler - NEVER delete

## Workflow:

### Creating branches:
git checkout main
git pull origin main
git checkout -b [feature/bugfix]/[name]

### If branch gets broken:
git checkout main
git branch -D [broken-branch]

### Merging to main:
git checkout main
git pull origin main
git merge [branch] --no-ff
# DO NOT PUSH - wait for user confirmation
git branch -d [branch]

## Automatic Behavior:

- When I say create feature/bugfix branch - create it automatically, don't ask
- When I say merge this - merge it, don't ask
- When task is done - report in 2 sentences, then STOP
- Never ask what do you want next
- Only ask questions if genuinely unclear or destructive operation

## Response Format:

Done: [Task]
Changes: [list]
Test: [how]
Say merge this when ready.

Then STOP. No follow-up questions.

