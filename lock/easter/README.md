Drop any .jpg/.jpeg/.png images into this folder, then run one of the following:

Manual (one-time):

```pwsh
node lock/easter/generate_manifest.js
```

Auto-watch (recommended during development):

```pwsh
node lock/easter/watch_manifest.js
```

The watcher regenerates `lock/easter/list.json` automatically when images are added, removed, or renamed.

This manifest is read by the client-side easter-egg in `lock/lock.js`, which will randomly pick an image from the list.