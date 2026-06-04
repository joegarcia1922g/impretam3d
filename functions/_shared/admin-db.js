export const DB_BINDING = 'IMPRETAM3D_DB';
export const DB_BINDING_ALIAS = 'DB';
export const R2_FILES_BINDING = 'IMP_FILES_BUCKET';
export const R2_FILES_BINDING_ALIAS = 'IMP_STL_BUCKET';

export const STORAGE_LIMITS = {
    warnBytes: 7 * 1024 * 1024 * 1024,
    criticalBytes: 9 * 1024 * 1024 * 1024,
    blockBytes: 10 * 1024 * 1024 * 1024
};

let schemaReady = false;

export function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=UTF-8'
        }
    });
}

export function getAdminDb(env) {
    return env[DB_BINDING] || env[DB_BINDING_ALIAS] || null;
}

export function getFilesBucket(env) {
    return env[R2_FILES_BINDING] || env[R2_FILES_BINDING_ALIAS] || null;
}

export async function ensureAdminSchema(db) {
    if (!db || schemaReady) {
        return;
    }

    const statements = [
        `CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            base_price REAL NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS quotes (
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
        )`,
        `CREATE TABLE IF NOT EXISTS quote_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 1,
            unit_price REAL NOT NULL DEFAULT 0,
            total_price REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS files (
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
        )`,
        `CREATE TABLE IF NOT EXISTS file_objects (
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
        )`,
        `CREATE TABLE IF NOT EXISTS file_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_object_id INTEGER NOT NULL,
            related_type TEXT NOT NULL DEFAULT 'general',
            related_id TEXT NOT NULL DEFAULT '',
            label TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (file_object_id) REFERENCES file_objects(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS storage_usage_monthly (
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
        )`,
        `CREATE TABLE IF NOT EXISTS storage_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month_key TEXT NOT NULL,
            threshold TEXT NOT NULL,
            bytes_stored INTEGER NOT NULL DEFAULT 0,
            channel TEXT NOT NULL DEFAULT 'admin',
            sent_at TEXT NOT NULL,
            UNIQUE(month_key, threshold, channel)
        )`,
        `CREATE TABLE IF NOT EXISTS storage_limits (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            warn_bytes INTEGER NOT NULL,
            critical_bytes INTEGER NOT NULL,
            block_bytes INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`,
        'CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_quotes_customer_name ON quotes(customer_name)',
        'CREATE INDEX IF NOT EXISTS idx_services_sort_order ON services(sort_order, id)',
        'CREATE INDEX IF NOT EXISTS idx_files_quote_id ON files(quote_id)',
        'CREATE INDEX IF NOT EXISTS idx_file_objects_sha256 ON file_objects(sha256)',
        'CREATE INDEX IF NOT EXISTS idx_file_links_file_object_id ON file_links(file_object_id)',
        'CREATE INDEX IF NOT EXISTS idx_file_links_related ON file_links(related_type, related_id)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_file_links_unique ON file_links(file_object_id, related_type, related_id, label)',
        'CREATE INDEX IF NOT EXISTS idx_storage_alerts_month ON storage_alerts(month_key, threshold)'
    ];

    for (const statement of statements) {
        await db.prepare(statement).run();
    }

    const timestamp = nowIso();
    await db.prepare(`
        INSERT INTO storage_limits (id, warn_bytes, critical_bytes, block_bytes, created_at, updated_at)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
    `).bind(
        STORAGE_LIMITS.warnBytes,
        STORAGE_LIMITS.criticalBytes,
        STORAGE_LIMITS.blockBytes,
        timestamp,
        timestamp
    ).run();

    schemaReady = true;
}

export function parseJson(value, fallbackValue = null) {
    if (!value) {
        return fallbackValue;
    }

    try {
        return JSON.parse(value);
    } catch (_error) {
        return fallbackValue;
    }
}

export function nowIso() {
    return new Date().toISOString();
}

export function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

export function toBooleanInteger(value) {
    return value ? 1 : 0;
}
