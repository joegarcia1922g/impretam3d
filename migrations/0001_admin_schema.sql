CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    base_price REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL DEFAULT '',
    material TEXT NOT NULL,
    grams REAL NOT NULL DEFAULT 0,
    hours REAL NOT NULL DEFAULT 0,
    material_cost_per_gram REAL NOT NULL DEFAULT 0,
    hourly_cost REAL NOT NULL DEFAULT 0,
    margin_percent REAL NOT NULL DEFAULT 0,
    include_iva INTEGER NOT NULL DEFAULT 0,
    iva_percent REAL NOT NULL DEFAULT 0,
    material_total REAL NOT NULL DEFAULT 0,
    time_total REAL NOT NULL DEFAULT 0,
    base_subtotal REAL NOT NULL DEFAULT 0,
    margin_amount REAL NOT NULL DEFAULT 0,
    iva_amount REAL NOT NULL DEFAULT 0,
    final_price REAL NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    source TEXT NOT NULL DEFAULT 'admin',
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT '',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    storage_provider TEXT NOT NULL DEFAULT 'r2',
    storage_key TEXT NOT NULL,
    public_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_name ON quotes(customer_name);
CREATE INDEX IF NOT EXISTS idx_services_sort_order ON services(sort_order, id);
CREATE INDEX IF NOT EXISTS idx_files_quote_id ON files(quote_id);
