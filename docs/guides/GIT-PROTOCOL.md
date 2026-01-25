# Branch–Commit–Push Protocol

**Purpose:** Single source of truth for the mandatory git workflow. All AI assistants (Claude, ChatGPT, Copilot) and contributors must follow this.

---

## The Rule

**Whenever you make changes to files in this repo:**

1. **If you're on `main`** → Create a new branch (before or immediately after making changes).
2. **Commit** all changes to that branch. Never commit directly to `main`.
3. **Push** the branch to `origin` before you finish.

---

## Checklist

- [ ] `git branch --show-current` → if `main`, run `git checkout -b <type>/<name>`
- [ ] Make your changes
- [ ] `git add .` (or specific files)
- [ ] `git commit -m "type: description"`
- [ ] `git push -u origin <branch>`
- [ ] User creates PR and merges via GitHub (assistants never merge to `main`)

---

## Commands

```bash
git branch --show-current
git checkout -b fix/foo   # or feature/bar, chore/baz, docs/readme
# ... edit files ...
git add .
git commit -m "fix: short description"
git push -u origin fix/foo
```

---

## Branch Naming

| Type    | Prefix     | Example                |
|---------|------------|------------------------|
| Feature | `feature/` | `feature/category-filter` |
| Bug fix | `fix/`     | `fix/date-picker-bug`  |
| Refactor| `refactor/`| `refactor/modal-system`|
| Docs    | `docs/`    | `docs/api-guide`       |
| Chore   | `chore/`   | `chore/update-deps`    |

---

## References

- [CLAUDE.md](../../CLAUDE.md) – Claude config (includes this protocol)
- [CODEX.md](../../CODEX.md) – ChatGPT/Copilot config (includes this protocol)
- [AGENTS.md](../../AGENTS.md) – Agent entry point
