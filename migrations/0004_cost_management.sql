CREATE TABLE IF NOT EXISTS cost_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cost_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    cost_per_gram REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cost_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    material_id INTEGER NOT NULL,
    pieces_per_plate INTEGER NOT NULL DEFAULT 1,
    print_hours TEXT NOT NULL DEFAULT '0:00',
    print_hours_decimal REAL NOT NULL DEFAULT 0,
    grams REAL NOT NULL DEFAULT 0,
    sale_estimate REAL,
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (material_id) REFERENCES cost_materials(id)
);

CREATE TABLE IF NOT EXISTS pricing_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    min_markup REAL NOT NULL DEFAULT 0,
    max_markup REAL NOT NULL DEFAULT 0,
    default_markup REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cost_materials_active ON cost_materials(active, name);
CREATE INDEX IF NOT EXISTS idx_cost_models_material_id ON cost_models(material_id);
CREATE INDEX IF NOT EXISTS idx_cost_models_active ON cost_models(active, name);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_active ON pricing_tiers(active, id);

INSERT OR IGNORE INTO cost_settings (key, value, updated_at)
VALUES
    ('businessName', 'Impretam 3D', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('printCostPerHour', '35', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('energyCostPerHour', '3', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('maintenanceCostPerHour', '1.83', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('defaultMarginPercent', '225', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('includeIva', 'false', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('ivaPercent', '16', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO cost_materials (name, cost_per_gram, color, notes, active, created_at, updated_at)
VALUES ('PLA base', 0.40, '', 'Material base importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO pricing_tiers (code, name, description, min_markup, max_markup, default_markup, active, created_at, updated_at)
VALUES
    ('final', 'Cliente final', 'Precio alto al publico final.', 300, 350, 325, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('frequent', 'Cliente frecuente', 'Cliente recurrente con margen intermedio.', 200, 250, 225, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('bulk', 'Cliente bulk', 'Volumen alto y margen configurable.', 120, 180, 150, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO cost_models (name, material_id, pieces_per_plate, print_hours, print_hours_decimal, grams, sale_estimate, notes, active, created_at, updated_at)
SELECT 'Alien Nuevo', id, 15, '11:08', 11.1333, 199.09, NULL, 'Modelo semilla importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM cost_materials
WHERE name = 'PLA base';

INSERT OR IGNORE INTO cost_models (name, material_id, pieces_per_plate, print_hours, print_hours_decimal, grams, sale_estimate, notes, active, created_at, updated_at)
SELECT 'Ring de valla', id, 1, '2:10', 2.1667, 39.68, 47.41, 'Modelo semilla importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM cost_materials
WHERE name = 'PLA base';
