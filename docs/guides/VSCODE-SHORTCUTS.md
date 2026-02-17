# VS Code Keyboard Shortcuts for Nautilus

This guide explains how to set up keyboard shortcuts for common Nautilus development tasks in VS Code.

---

## Quick Start: Use Default Build Shortcut

**Press `Ctrl+Shift+B`** - This runs the default build task (already configured!)

The `.vscode/tasks.json` file marks "Build Nautilus" as the default build task, so this works immediately without any setup.

---

## Custom Shortcuts (Optional)

If you want `Ctrl+Shift+4` specifically, you need to add it to your **User** keybindings:

### Step 1: Open Keyboard Shortcuts JSON
1. Press `Ctrl+K Ctrl+S` to open Keyboard Shortcuts
2. Click the file icon in the top-right: "Open Keyboard Shortcuts (JSON)"

### Step 2: Add This Keybinding

```json
{
  "key": "ctrl+shift+4",
  "command": "workbench.action.tasks.runTask",
  "args": "Build Nautilus",
  "when": "resourcePath =~ /Nautilus/"
}
```

**Important:** The `"when": "resourcePath =~ /Nautilus/"` condition makes this shortcut **only work in the Nautilus project**, so it won't affect other projects!

### Step 3: Save and Test
- Save the file
- Press `Ctrl+Shift+4` in any Nautilus file
- Build should run!

---

## Available Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+Shift+B` | Default Build | ✅ Works immediately (no setup) |
| `Ctrl+Shift+4` | Build Nautilus | Requires manual setup (see above) |
| `Ctrl+Shift+P` → "Tasks: Run Task" | Task Menu | Always available |

---

## Available Build Tasks

The `.vscode/tasks.json` includes these tasks:

### 1. Build Nautilus (Default)
```bash
npm run build
```
- Bundles app.js and style.css
- Creates dist/app.bundle.js and dist/style.bundle.css
- Development mode (includes source maps)
- **Shortcut:** `Ctrl+Shift+B`

### 2. Build Nautilus (Production)
```bash
npm run build:prod
```
- Minified output
- No source maps
- Optimized for deployment

### 3. Build Nautilus (Watch)
```bash
npm run build:watch
```
- Watches for file changes
- Rebuilds automatically
- Useful during development

### 4. Wrangler Dev
```bash
npm run dev
```
- Starts local development server
- Includes live reload
- Runs on http://localhost:8787

---

## Why Can't I Use `.vscode/keybindings.json`?

VS Code doesn't support workspace-level keybindings files. Keybindings must be in:
- **User settings** (`%APPDATA%\Code\User\keybindings.json`) - Global
- **Workspace settings** - Not supported for keybindings

However, you can make user keybindings **conditional** using the `"when"` clause to only apply in specific projects.

---

## Troubleshooting

### `Ctrl+Shift+B` Not Working

**Problem:** Default build shortcut doesn't work

**Solutions:**
1. Verify tasks.json exists: `.vscode/tasks.json`
2. Check the task is marked as default:
   ```json
   "group": {
     "kind": "build",
     "isDefault": true
   }
   ```
3. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"

### Custom Shortcut Conflicts

**Problem:** `Ctrl+Shift+4` is already used by another extension

**Solutions:**
1. Open Keyboard Shortcuts: `Ctrl+K Ctrl+S`
2. Search for `ctrl+shift+4`
3. Remove conflicting bindings
4. Or choose a different key combination

### Task Runs But Fails

**Problem:** Shortcut works but build fails

**Solutions:**
1. Check Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check build script exists in `package.json`
4. Run manually to see error: `npm run build`

---

## Command Palette Alternative

If you prefer not to use keyboard shortcuts:

1. Press `Ctrl+Shift+P` (Command Palette)
2. Type "Tasks: Run Task"
3. Select "Build Nautilus"

---

## Recommended Setup

For the best experience:

1. **Use `Ctrl+Shift+B`** for quick builds (works immediately)
2. **Add custom shortcuts** for other tasks if needed
3. **Use Command Palette** for occasional tasks

---

## Example: Full Keybindings Setup

If you want shortcuts for all build tasks, add this to your user `keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+4",
    "command": "workbench.action.tasks.runTask",
    "args": "Build Nautilus",
    "when": "resourcePath =~ /Nautilus/"
  },
  {
    "key": "ctrl+shift+5",
    "command": "workbench.action.tasks.runTask",
    "args": "Build Nautilus (Watch)",
    "when": "resourcePath =~ /Nautilus/"
  },
  {
    "key": "ctrl+shift+6",
    "command": "workbench.action.tasks.runTask",
    "args": "Wrangler Dev",
    "when": "resourcePath =~ /Nautilus/"
  }
]
```

---

## See Also

- [DEVELOPMENT_GUIDE.md](../../specs/DEVELOPMENT_GUIDE.md) - Development workflow
- [ARCHITECTURE.md](../../specs/ARCHITECTURE.md) - Build system architecture
- [package.json](../../package.json) - Available npm scripts

---

**Last Updated:** 2026-02-17  
**Applies to:** VS Code 1.85+
