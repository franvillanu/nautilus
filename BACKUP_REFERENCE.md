# Backup Reference Guide

## Available Backups

### backup-working-dropdown-solution-2025-10-05_18-47-27
- **Created**: October 5, 2025 at 18:47
- **Contains**: Working state with manual dropdown restoration
- **Features**: Light mode fixes, tooltip fixes, dashboard improvements, custom dropdown HTML/CSS/JS
- **Status**: Latest working version with dropdown functionality
- **Use case**: Revert here if dropdown work gets broken

### backup-current-solution-2025-10-05_17-33-42  
- **Created**: October 5, 2025 at 17:33
- **Contains**: Pre-dropdown work state
- **Features**: Light mode fixes, tooltip fixes, dashboard improvements
- **Status**: Stable but with native select dropdown
- **Use case**: Fallback if major issues occur

## How to Restore

To restore from a specific backup:
```powershell
Copy-Item "backup-NAME\*" . -Force
```

Replace `backup-NAME` with the folder name you want to restore from.

## Backup Naming Convention
- `backup-working-[feature]-[timestamp]` - Working versions with specific features
- `backup-stable-[timestamp]` - Stable versions without experimental features
- `backup-milestone-[description]-[timestamp]` - Major milestone versions