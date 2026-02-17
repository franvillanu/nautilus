# Kiro Keyboard Shortcuts Configuration

## CRITICAL: Correct Keybindings Location

Kiro keybindings MUST be placed in:
```
%APPDATA%\Kiro\User\keybindings.json
```

**NOT** in:
- `.kiro/settings/keybindings.json` (workspace - doesn't work)
- `%APPDATA%\Code\User\keybindings.json` (VS Code - wrong application)

## Current Configured Shortcuts

| Shortcut | Command | Task |
|----------|---------|------|
| Ctrl+Shift+1 | Run Task | Git Checkout Main |
| Ctrl+Shift+2 | Run Task | Git Pull |
| Ctrl+Shift+3 | Run Task | Git All (checkout + pull) |
| Ctrl+Shift+4 | Run Task | Wrangler Dev |
| Ctrl+Shift+5 | Run Task | PR: create + merge (squash) + update main + delete branch |

## How to Update Keybindings

### Option 1: PowerShell Script (Recommended)

```powershell
$kiroUserPath = "$env:APPDATA\Kiro\User"
New-Item -Path $kiroUserPath -ItemType Directory -Force | Out-Null

$keybindings = @(
    @{key="ctrl+shift+1";command="workbench.action.tasks.runTask";args="Git Checkout Main"},
    @{key="ctrl+shift+2";command="workbench.action.tasks.runTask";args="Git Pull"},
    @{key="ctrl+shift+3";command="workbench.action.tasks.runTask";args="Git All"},
    @{key="ctrl+shift+4";command="workbench.action.tasks.runTask";args="Wrangler Dev"},
    @{key="ctrl+shift+5";command="workbench.action.tasks.runTask";args="PR: create + merge (squash) + update main + delete branch"}
)

$keybindings | ConvertTo-Json -Depth 10 | Set-Content "$kiroUserPath\keybindings.json"
Write-Host "Keybindings updated at: $kiroUserPath\keybindings.json"
```

### Option 2: Manual Edit

1. Navigate to: `%APPDATA%\Kiro\User\`
2. Create or edit `keybindings.json`
3. Add your keybindings in JSON format
4. Reload Kiro window (Ctrl+Shift+P → "Reload Window")

## Keybindings Format

```json
[
  {
    "key": "ctrl+shift+1",
    "command": "workbench.action.tasks.runTask",
    "args": "Task Name From tasks.json"
  }
]
```

## After Making Changes

**ALWAYS reload Kiro window:**
1. Press Ctrl+Shift+P
2. Type "Reload Window"
3. Press Enter

## Troubleshooting

### Shortcuts Don't Work

1. Verify file location: `%APPDATA%\Kiro\User\keybindings.json`
2. Check JSON syntax is valid
3. Ensure task names match exactly what's in `.vscode/tasks.json`
4. Reload Kiro window
5. Check for conflicting keybindings

### Find Kiro User Directory

```powershell
echo $env:APPDATA\Kiro\User
```

## Accessibility Note

These keyboard shortcuts are essential for users with accessibility needs. Proper configuration is critical for:
- Reducing repetitive strain
- Minimizing mouse usage
- Improving workflow efficiency
- Supporting users with motor impairments

---

**Last Updated:** 2026-02-17  
**Tested On:** Kiro (Windows)
