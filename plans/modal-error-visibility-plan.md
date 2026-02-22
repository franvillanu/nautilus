# Modal Error Visibility Improvement Plan

## Problem Statement

When users attempt to upload more than 5 files in the task attachment modal:
1. The upload is correctly blocked (new behavior)
2. An error notification is triggered via `showErrorNotification()`
3. **The notification may not be visible** to users focused on the modal
4. **The message is incorrect** - it says files were uploaded when they weren't

## Current State Analysis

### Z-Index Stack
| Element | Z-Index | Location |
|---------|---------|----------|
| Modal backdrop | 1000 | Full screen overlay |
| Modal content | 1001-1002 | Centered dialog |
| Dropdowns in modal | 1500-3000 | Within modal |
| Notification toast | 10001 | Bottom-right corner |

The notification z-index (10001) is technically above the modal, but:
- Users are focused on the center of the screen (modal)
- Bottom-right corner is outside their immediate attention area
- The toast disappears after 4 seconds

### Translation Issue
**Current (incorrect):**
- EN: "Only the first {max} files were uploaded."
- ES: "Solo se subieron los primeros {max} archivos."

**Expected behavior:** No files are uploaded when limit is exceeded.

## Proposed Solution

### Option A: In-Modal Error Display (Recommended)

Display the error message directly within the modal, below the dropzone area.

**Pros:**
- Error appears exactly where the user is looking
- Immediate visual feedback in context
- No z-index conflicts
- Consistent with form validation patterns

**Cons:**
- Requires adding error container to HTML
- Slightly more complex implementation

**Implementation:**

```
┌─────────────────────────────────────────┐
│  Task Modal                              │
│  ┌─────────────────────────────────────┐│
│  │  Attachments                         ││
│  │  ┌─────────────────────────────────┐││
│  │  │  📎 Drop files here or click    │││
│  │  │     to upload (max 5)           │││
│  │  └─────────────────────────────────┘││
│  │  ⚠️ Maximum 5 files allowed. Please │││
│  │     upload in batches of 5 or fewer.│││  ← In-modal error
│  │  Supported: Images, PDFs, Docs      ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Option B: Centered Modal Alert

Show a centered alert dialog on top of the task modal.

**Pros:**
- Highly visible
- Requires user acknowledgment
- Familiar pattern

**Cons:**
- More disruptive to workflow
- Requires additional click to dismiss
- May feel heavy-handed for a simple validation error

### Option C: Enhanced Toast Position

Position the toast at the top-center of the screen or within the modal bounds.

**Pros:**
- Minimal code changes
- Reuses existing notification system

**Cons:**
- Still may not be in user's focus area
- Less contextual than in-modal display

## Recommended Approach: Option A + Translation Fix

### Changes Required

#### 1. Fix Translation Messages
**File:** `src/config/i18n.js`

```javascript
// English (line 572)
'error.tooManyFiles': 'Maximum {max} files allowed. Please upload in batches of {max} or fewer.',

// Spanish (line 1416)
'error.tooManyFiles': 'Máximo {max} archivos permitidos. Por favor, sube en lotes de {max} o menos.',
```

#### 2. Add Error Container in Modal
**File:** `index.html` (around line 1728)

```html
<!-- File Upload -->
<div id="attachment-file-dropzone" class="form-input task-attachment-dropzone" ...></div>
<input type="file" id="attachment-file" ...>
<!-- NEW: Error container -->
<div id="attachment-error" class="form-error" style="display: none;"></div>
```

#### 3. Add CSS for Error Display
**File:** `style.css`

```css
.form-error {
    color: var(--accent-red);
    font-size: 13px;
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(220, 53, 69, 0.1);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
}
```

#### 4. Update JavaScript to Show In-Modal Error
**File:** `app.js` - `handleDropOrPasteFileList()` and `addFileAttachment()`

```javascript
// Add helper function
function showAttachmentError(message) {
    let errorEl = document.getElementById('attachment-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'attachment-error';
        errorEl.className = 'form-error';
        const dropzone = document.getElementById('attachment-file-dropzone');
        dropzone?.parentNode?.insertBefore(errorEl, dropzone.nextSibling);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Update in handleDropOrPasteFileList (line 19672-19674)
if (files.length > MAX_ATTACHMENTS_PER_UPLOAD) {
    const message = t('error.tooManyFiles', { max: MAX_ATTACHMENTS_PER_UPLOAD });
    showAttachmentError(message);
    showErrorNotification(message); // Keep toast as backup
    return;
}

// Update in addFileAttachment (line 19857-19860)
if (allFiles.length > MAX_FILES) {
    const message = t('error.tooManyFiles', { max: MAX_FILES });
    showAttachmentError(message);
    showErrorNotification(message); // Keep toast as backup
    if (fileInput) fileInput.value = '';
    return;
}
```

#### 5. Clear Error on Successful Upload
Add error clearing when upload succeeds:

```javascript
// In uploadTaskAttachmentFile on success
const errorEl = document.getElementById('attachment-error');
if (errorEl) errorEl.style.display = 'none';
```

## Implementation Checklist

- [ ] Update English translation in `src/config/i18n.js`
- [ ] Update Spanish translation in `src/config/i18n.js`
- [ ] Add error container HTML in `index.html`
- [ ] Add `.form-error` CSS styles in `style.css`
- [ ] Add `showAttachmentError()` helper function in `app.js`
- [ ] Update `handleDropOrPasteFileList()` to use in-modal error
- [ ] Update `addFileAttachment()` to use in-modal error
- [ ] Clear error on successful upload
- [ ] Rebuild bundle: `npm run build`
- [ ] Test with more than 5 files via drag-drop
- [ ] Test with more than 5 files via file picker
- [ ] Verify error clears on successful upload

## Testing Scenarios

1. **Drag 6+ files to dropzone** → Error appears in modal, no files uploaded
2. **Select 6+ files via file picker** → Error appears in modal, no files uploaded
3. **Select exactly 5 files** → All 5 upload successfully, no error
4. **Error auto-dismisses after 5 seconds**
5. **Error clears when successful upload follows**
6. **Both EN and ES translations display correctly**

## Files to Modify

| File | Changes |
|------|---------|
| `src/config/i18n.js` | Fix translation messages |
| `index.html` | Add error container element |
| `style.css` | Add `.form-error` styles |
| `app.js` | Add helper function, update error handling |
| `dist/app.bundle.js` | Rebuild after changes |
