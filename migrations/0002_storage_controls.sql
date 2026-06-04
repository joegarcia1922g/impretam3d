CREATE TABLE IF NOT EXISTS file_objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sha256 TEXT NOT NULL UNIQUE,
    storage_key TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT '',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    storage_provider TEXT NOT NULL DEFAULT 'r2',
    upload_count INTEGER NOT NULL DEFAULT 1,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_object_id INTEGER NOT NULL,
    related_type TEXT NOT NULL DEFAULT 'general',
    related_id TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (file_object_id) REFERENCES file_objects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS storage_usage_monthly (
    month_key TEXT PRIMARY KEY,
    bytes_stored INTEGER NOT NULL DEFAULT 0,
    file_objects INTEGER NOT NULL DEFAULT 0,
    uploads INTEGER NOT NULL DEFAULT 0,
    duplicate_uploads INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0,
    deletes INTEGER NOT NULL DEFAULT 0,
    class_a_ops INTEGER NOT NULL DEFAULT 0,
    class_b_ops INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS storage_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month_key TEXT NOT NULL,
    threshold TEXT NOT NULL,
    bytes_stored INTEGER NOT NULL DEFAULT 0,
    channel TEXT NOT NULL DEFAULT 'admin',
    sent_at TEXT NOT NULL,
    UNIQUE(month_key, threshold, channel)
);

CREATE TABLE IF NOT EXISTS storage_limits (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    warn_bytes INTEGER NOT NULL,
    critical_bytes INTEGER NOT NULL,
    block_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_file_objects_sha256 ON file_objects(sha256);
CREATE INDEX IF NOT EXISTS idx_file_links_file_object_id ON file_links(file_object_id);
CREATE INDEX IF NOT EXISTS idx_file_links_related ON file_links(related_type, related_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_links_unique ON file_links(file_object_id, related_type, related_id, label);
CREATE INDEX IF NOT EXISTS idx_storage_alerts_month ON storage_alerts(month_key, threshold);

INSERT INTO storage_limits (id, warn_bytes, critical_bytes, block_bytes, created_at, updated_at)
VALUES (
    1,
    7516192768,
    9663676416,
    10737418240,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(id) DO NOTHING;
