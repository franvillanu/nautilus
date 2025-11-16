# Nautilus – Research Task Manager

Nautilus is a simple, free task manager designed for academic and research teams.
It provides Kanban, List, and Calendar views with clean UX.

---

## Features

- 📋 Task creation with priorities, due dates, and rich descriptions
- 🎯 Kanban, List, and Calendar views
- 🔍 Global filters and search
- 📁 Project organization
- 🏷️ Tags and categories
- 📎 File attachments and URL links
- 🌙 Dark mode
- 📱 Responsive design
- ☁️ Cloudflare Workers backend with KV storage
- Research-friendly, no extra complexity

---

## Quick Start

### Run Locally

Open `index.html` in your browser. That's it!

### Development

**Prerequisites:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- For deployment: Cloudflare account + Wrangler CLI

**Getting Started:**
1. Clone this repository
2. Open `index.html` in your browser
3. Start coding!

No build step, no npm install, no bundlers.

---

## Specs-Driven Development (SDD)

Nautilus follows a **Specs-Driven Development** approach. All documentation is comprehensive and up-to-date.

### 📚 Core Documentation

**Start here:**

| Document | Purpose |
|----------|---------|
| [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) | Tech stack, data structures, system architecture |
| [specs/UI_PATTERNS.md](specs/UI_PATTERNS.md) | Reusable UI components with code examples |
| [specs/CODING_CONVENTIONS.md](specs/CODING_CONVENTIONS.md) | Code style, naming conventions, best practices |
| [specs/DEVELOPMENT_GUIDE.md](specs/DEVELOPMENT_GUIDE.md) | Step-by-step guides for common tasks |
| [VISUAL_GUIDELINES.md](VISUAL_GUIDELINES.md) | Design system, colors, typography, accessibility |

### 🤖 AI Assistant Configuration

| File | Purpose |
|------|---------|
| [CLAUDE.md](CLAUDE.md) | Claude AI configuration with token efficiency protocols |
| [CODEX.md](CODEX.md) | ChatGPT/GitHub Copilot configuration |

### 📋 Planning & Templates

| Resource | Purpose |
|----------|---------|
| [plans/README.md](plans/README.md) | Implementation planning framework |
| [plans/example-feature.md](plans/example-feature.md) | Complete feature plan example |
| [templates/page-template.html](templates/page-template.html) | Starter template for new pages |

---

## Documentation Benefits

**For Developers:**
- ✅ Find patterns fast (specs > searching code)
- ✅ Consistent code (follow established conventions)
- ✅ Clear implementation paths (step-by-step guides)
- ✅ Reduced onboarding time

**For AI Assistants:**
- ✅ 10x token efficiency (25,500 → 2,550 tokens per 10 operations)
- ✅ Consistent output (follows specs, not guesses)
- ✅ Faster development (reference specs, don't re-read code)
- ✅ Better quality (comprehensive guidelines)

---

## Project Structure

```
Nautilus/
├── index.html                    # Main SPA entry point
├── app.js                        # Core application logic (7,864 lines)
├── style.css                     # All styling (responsive, dark mode)
├── storage-client.js             # KV storage abstraction
├── lock/                         # Password protection system
├── functions/api/                # Cloudflare Workers endpoints
├── specs/                        # 📚 Comprehensive specifications
│   ├── ARCHITECTURE.md
│   ├── UI_PATTERNS.md
│   ├── CODING_CONVENTIONS.md
│   └── DEVELOPMENT_GUIDE.md
├── plans/                        # Implementation plans
├── templates/                    # Code templates
├── CLAUDE.md                     # Claude AI configuration
├── CODEX.md                      # ChatGPT/Copilot configuration
├── VISUAL_GUIDELINES.md          # Design system
└── README.md                     # This file
```

---

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Cloudflare Workers + KV Storage
- **Libraries:** flatpickr (date picker, CDN)
- **No frameworks, no build step** – pure web standards

**Why vanilla JS?**
- ✅ Zero dependencies
- ✅ Fast load times
- ✅ Full control
- ✅ Long-term maintainability
- ✅ Easy to understand

---

## Development Workflow

### Git Workflow

**Branch-based development:**

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Push branch immediately
git push -u origin feature/your-feature-name

# 3. Make changes and commit
git add .
git commit -m "Your changes"
git push

# 4. Create PR on GitHub
# 5. Review and merge
```

**Protected main branch:**
- Pre-commit hook prevents direct commits to main
- All changes require pull requests
- See [CLAUDE.md#git-workflow](CLAUDE.md#git-workflow) for details

### Implementation Process

**Follow SDD approach:**

1. **Plan** – Create implementation plan (see [plans/README.md](plans/README.md))
2. **Reference** – Check specs for patterns and conventions
3. **Implement** – Follow step-by-step guides
4. **Test** – Verify in light/dark mode, test responsiveness
5. **Document** – Update specs if new patterns added
6. **Review** – Code review against conventions
7. **Merge** – Via pull request

---

## Common Tasks

| Task | Guide |
|------|-------|
| **Add new page** | [specs/DEVELOPMENT_GUIDE.md#adding-a-new-page](specs/DEVELOPMENT_GUIDE.md#adding-a-new-page) |
| **Create modal** | [specs/DEVELOPMENT_GUIDE.md#creating-a-new-modal](specs/DEVELOPMENT_GUIDE.md#creating-a-new-modal) |
| **Add filter** | [specs/DEVELOPMENT_GUIDE.md#implementing-a-new-filter](specs/DEVELOPMENT_GUIDE.md#implementing-a-new-filter) |
| **Add data field** | [specs/DEVELOPMENT_GUIDE.md#adding-a-new-data-field](specs/DEVELOPMENT_GUIDE.md#adding-a-new-data-field) |
| **UI components** | [specs/UI_PATTERNS.md](specs/UI_PATTERNS.md) |
| **Code style** | [specs/CODING_CONVENTIONS.md](specs/CODING_CONVENTIONS.md) |

---

## Deployment

**Cloudflare Workers:**

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler publish
```

**Configuration:**
- Edit `wrangler.toml` for your Cloudflare account
- Create KV namespaces: `NAUTILUS_DATA`, `NAUTILUS_FILES`
- Bind namespaces in wrangler.toml

See [specs/ARCHITECTURE.md#deployment-architecture](specs/ARCHITECTURE.md#deployment-architecture) for details.

---

## Contributing

**Before contributing:**

1. Read [specs/CODING_CONVENTIONS.md](specs/CODING_CONVENTIONS.md)
2. Review [VISUAL_GUIDELINES.md](VISUAL_GUIDELINES.md)
3. Follow [specs/DEVELOPMENT_GUIDE.md](specs/DEVELOPMENT_GUIDE.md)
4. Use branch-based workflow (see [CLAUDE.md#git-workflow](CLAUDE.md#git-workflow))

**For AI-assisted development:**
- Use [CLAUDE.md](CLAUDE.md) for Claude AI
- Use [CODEX.md](CODEX.md) for ChatGPT/Copilot

---

## Documentation Stats

- **Total Documentation:** ~5,000+ lines
- **Specs:** 4 comprehensive files
- **Guides:** 15+ step-by-step implementation guides
- **Examples:** 50+ code examples with explanations
- **Coverage:** Architecture, UI patterns, conventions, visual design, workflows

---

## License

MIT

This project is provided as a free and open-source tool for academic and research use. It is not a commercial project.

---

## Support

**Questions?**
- Check the [specs/](specs/) directory first
- Review [specs/DEVELOPMENT_GUIDE.md](specs/DEVELOPMENT_GUIDE.md) for how-tos
- See [VISUAL_GUIDELINES.md](VISUAL_GUIDELINES.md) for design questions

**Found a bug?**
- Check [plans/](plans/) for known issues
- Follow the implementation plan framework to document the fix

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0 (SDD Framework Complete)
