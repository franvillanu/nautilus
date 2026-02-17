# VS Code Keyboard Shortcuts for Nautilus

This guide explains how to set up keyboard shortcuts for common Nautilus development tasks in VS Code.

---

## Quick Setup

The `.vscode/` folder in this project contains pre-configured tasks and keybindings. If you cloned this repo, they should work automatically.

### Available Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Shift+4` | Build Nautilus | Run `npm run build` |
| `Ctrl+Shift+5` | Build Watch | Run `npm run build:watch` |
| `Ctrl+Shift+6` | Wrangler Dev | Run `npm run dev` |
| `Ctrl+Shift+B` | Default Build | VS Code's default build task |

---

## Manual Setup (If Needed)

If the shortcuts aren't working, follow these steps:

### Step 1: Verify Tasks Configuration

Check that `.vscode/tasks.json` exists and contains:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Nautilus",
      "type": "shell",
      "command": "npm run build",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

### Step 2: Add Workspace Keybindings

Create or edit `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+4",
    "command": "workbench.action.tasks.runTask",
    "args": "Build Nautilus"
  }
]
```

### Step 3: Reload VS Code

Press `Ctrl+Shift+P` → Type "Reload Window" → Press Enter

---

## Testing Your Shortcuts

1. Open any file in the Nautilus project
2. Press `Ctrl+Shift+4`
3. You should see the build output in the terminal

---

## Troubleshooting

### Shortcut Not Working

**Problem:** Pressing `Ctrl+Shift+4` does nothing

**Solutions:**
1. Check if another extension is using the same shortcut:
   - Press `Ctrl+K Ctrl+S` to open Keyboard Shortcuts
   - Search for `ctrl+shift+4`
   - Remove conflicting bindings

2. Verify the task exists:
   - Press `Ctrl+Shift+P`
   - Type "Tasks: Run Task"
   - Look for "Build Nautilus" in the list

3. Check workspace settings:
   - Ensure you're in the Nautilus workspace
   - Workspace keybindings only work within the workspace folder

### Task Runs But Fails

**Problem:** Shortcut works but build fails

**Solutions:**
1. Check Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check build script exists in `package.json`

### Want Different Shortcuts?

Edit `.vscode/keybindings.json` and change the `"key"` value:

```json
{
  "key": "ctrl+alt+b",  // Your preferred shortcut
  "command": "workbench.action.tasks.runTask",
  "args": "Build Nautilus"
}
```

---

## Global vs Workspace Keybindings

**Workspace Keybindings** (`.vscode/keybindings.json`):
- ✅ Only apply to this project
- ✅ Don't affect other VS Code projects
- ✅ Can be shared with team via Git
- ❌ Ignored by default in `.gitignore`

**Global Keybindings** (User Settings):
- ✅ Apply to all VS Code projects
- ❌ Affect all workspaces
- ❌ Can't be shared via Git

**Recommendation:** Use workspace keybindings for project-specific shortcuts.

---

## Additional Build Tasks

The tasks configuration includes several build variants:

### Build Nautilus (Default)
```bash
npm run build
```
- Bundles app.js and style.css
- Creates dist/app.bundle.js and dist/style.bundle.css
- Development mode (includes source maps)

### Build Nautilus (Production)
```bash
npm run build:prod
```
- Minified output
- No source maps
- Optimized for deployment

### Build Nautilus (Watch)
```bash
npm run build:watch
```
- Watches for file changes
- Rebuilds automatically
- Useful during development

### Wrangler Dev
```bash
npm run dev
```
- Starts local development server
- Includes live reload
- Runs on http://localhost:8787

---

## Command Palette Alternative

If you prefer not to use keyboard shortcuts, you can always:

1. Press `Ctrl+Shift+P` (Command Palette)
2. Type "Tasks: Run Task"
3. Select "Build Nautilus"

---

## See Also

- [DEVELOPMENT_GUIDE.md](../../specs/DEVELOPMENT_GUIDE.md) - Development workflow
- [ARCHITECTURE.md](../../specs/ARCHITECTURE.md) - Build system architecture
- [package.json](../../package.json) - Available npm scripts

---

**Last Updated:** 2026-02-17  
**Applies to:** VS Code 1.85+
