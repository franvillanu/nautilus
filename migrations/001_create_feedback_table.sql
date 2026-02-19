-- Feedback items table
CREATE TABLE IF NOT EXISTS feedback_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('bug', 'improvement', 'feature', 'idea')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done')),
    screenshot_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    created_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_items(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback_items(status, created_at DESC);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_feedback_timestamp 
AFTER UPDATE ON feedback_items
BEGIN
    UPDATE feedback_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;
