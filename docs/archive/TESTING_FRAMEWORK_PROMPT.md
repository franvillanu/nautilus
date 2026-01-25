# Testing Framework Implementation Prompt

**Use this prompt to add automated testing to any JavaScript project**

---

## Prompt for AI Assistant

```
I want to add a comprehensive testing framework to my project following these requirements:

### Project Context
- Tech stack: [Describe your stack, e.g., "Vanilla JavaScript, no build tools"]
- Current testing: [Describe current state, e.g., "None" or "Manual only"]
- Code structure: [Describe your architecture, e.g., "Monolithic app.js" or "Modular"]

### Requirements

1. **Testing Documentation** (specs/TESTING_GUIDE.md)
   - Create comprehensive testing guide
   - Include testing philosophy and principles
   - Document 3 testing levels: Automated (30s), Critical Path (5min), Full (20min)
   - Provide manual testing checklists for all features
   - Include common issues and fixes
   - Integration with development workflow

2. **Automated Validators** (tests/ directory)
   Create validators that run in browser console (no external dependencies):

   a. **Event Delegation Validator** (if applicable)
   - Scan all elements with data-action attributes
   - Verify each action has a registered handler
   - Report missing handlers with examples
   - Report unused handlers
   - Clear error messages with fixes

   b. **Data Structure Validator**
   - Validate all data objects have required fields
   - Check data types and formats (dates, enums, etc.)
   - Find orphaned references (e.g., tasks with invalid projectId)
   - Validate relationships between entities
   - Report statistics (valid/invalid counts)

3. **Development Guide Integration**
   - Update DEVELOPMENT_GUIDE.md (or create if missing)
   - Add "Testing Your Changes" section
   - Include step-by-step testing workflow
   - Document how to run automated validators
   - Provide quick validation commands

### Key Principles

- **No External Dependencies**: Validators use vanilla JavaScript
- **Browser-Based**: Run directly in browser console via ES6 imports
- **Fast Feedback**: Automated validation in <30 seconds
- **Clear Messages**: Errors include what's wrong + how to fix
- **Developer-Friendly**: Easy to run, easy to understand
- **Spec-Driven**: Tests validate compliance with specs

### Expected Files

Create these files:
```
/specs/TESTING_GUIDE.md           # Comprehensive testing documentation
/tests/event-delegation-validator.js  # (if using event delegation)
/tests/data-structure-validator.js    # Data integrity checks
/tests/[custom-validator].js          # Any project-specific validators
```

Update:
```
/specs/DEVELOPMENT_GUIDE.md       # Add testing section
```

### Validator Template

Each validator should:
1. Auto-run when imported
2. Print results to console with emojis (✅❌⚠️)
3. Export result object for programmatic use
4. Provide detailed error messages
5. Include usage instructions in comments

### Testing Workflow Integration

Developers should run before committing:
```bash
# 1. Automated validators (30s)
# (in browser console)
await import('./tests/event-delegation-validator.js');
await import('./tests/data-structure-validator.js');

# 2. Syntax check
node --check app.js

# 3. Critical path test (5 min)
# [List of 6-8 core operations to test manually]
```

### Deliverables

Please create:
1. TESTING_GUIDE.md with comprehensive documentation
2. Automated validator scripts for:
   - [List project-specific validators needed]
3. Updated DEVELOPMENT_GUIDE.md with testing section
4. Example of running validators in README.md

Ensure all validators:
- Have clear console output
- Report success/failure status
- Provide actionable error messages
- Include statistics and summaries
```

---

## Example for Different Project Types

### Vanilla JavaScript SPA
```
- Event delegation validator (data-action handlers)
- Data structure validator (tasks, projects, etc.)
- DOM structure validator (required elements exist)
```

### React/Vue App
```
- Component props validator
- State structure validator
- Route configuration validator
```

### Node.js Backend
```
- API endpoint validator
- Database schema validator
- Environment variables validator
```

### Static Site
```
- Link checker (no broken links)
- Image validator (all images exist)
- Metadata validator (SEO tags present)
```

---

## Customization Guide

**Adapt the prompt by:**

1. **Replace "Event Delegation Validator"** with your project's specific needs:
   - React: "Component Registration Validator"
   - Vue: "Component and Route Validator"
   - Backend: "API Endpoint Validator"

2. **Customize "Data Structure Validator"** for your data model:
   - Define your required fields
   - List your enums/constants
   - Specify your relationships
   - Document your date formats

3. **Add project-specific validators**:
   - Configuration validator (check .env vars)
   - Dependencies validator (check package versions)
   - Build validator (check build output)
   - Deployment validator (check deployment config)

4. **Adjust testing levels** based on your app complexity:
   - Small app: 2 levels (Automated, Manual)
   - Medium app: 3 levels (Automated, Critical, Full)
   - Large app: 4+ levels (Unit, Integration, E2E, Manual)

---

## Success Criteria

You'll know it's working when:
- ✅ Developers run validators before committing
- ✅ Validators catch issues in <30 seconds
- ✅ Error messages are clear and actionable
- ✅ No external dependencies required
- ✅ Testing is documented in specs
- ✅ New developers can run tests immediately

---

## Tips for AI Assistant

When implementing:
1. **Analyze existing code first** - Understand data structures and patterns
2. **Start with data validator** - Easier to implement, immediate value
3. **Add event validator second** - More complex, requires pattern analysis
4. **Create comprehensive docs** - Testing guide should be standalone
5. **Include examples** - Show actual output, not just descriptions
6. **Test the validators** - Run them on actual codebase before committing

---

**Version:** 1.0.0
**Created:** 2025-11-17
**For:** Nautilus SDD Framework
**License:** MIT (modify freely for your projects)
