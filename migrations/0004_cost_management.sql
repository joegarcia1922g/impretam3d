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
    ('printCostPerHour', '0', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('energyCostPerHour', '0.50', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('maintenanceCostPerHour', '1.76', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('defaultMarginPercent', '100', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('includeIva', 'true', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('ivaPercent', '16', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('bankCommissionPercent', '3.5', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('rentPercent', '5', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('cardCostPerPiece', '0.33', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('ringCostPerPiece', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('bagCostPerPiece', '0.88', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('eyeletCostPerPiece', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('magnetCostPerPiece', '0', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO cost_materials (name, cost_per_gram, color, notes, active, created_at, updated_at)
VALUES ('PLA base', 0.40, '', 'Material base importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO pricing_tiers (code, name, description, min_markup, max_markup, default_markup, active, created_at, updated_at)
VALUES
    ('final', 'Margen Bajo', 'Precio sugerido con 50% de ganancia.', 50, 50, 50, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('frequent', 'Margen Medio', 'Precio sugerido con 100% de ganancia.', 100, 100, 100, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('bulk', 'Margen Alto', 'Precio sugerido con 250% de ganancia.', 250, 250, 250, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO cost_models (name, material_id, pieces_per_plate, print_hours, print_hours_decimal, grams, sale_estimate, notes, active, created_at, updated_at)
SELECT 'Alien Nuevo', id, 15, '11:08', 11.1333, 199.09, NULL, 'Modelo semilla importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM cost_materials
WHERE name = 'PLA base';

INSERT OR IGNORE INTO cost_models (name, material_id, pieces_per_plate, print_hours, print_hours_decimal, grams, sale_estimate, notes, active, created_at, updated_at)
SELECT 'Ring de valla', id, 1, '2:10', 2.1667, 39.68, 47.41, 'Modelo semilla importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM cost_materials
WHERE name = 'PLA base';

INSERT OR IGNORE INTO cost_models (name, material_id, pieces_per_plate, print_hours, print_hours_decimal, grams, sale_estimate, notes, active, created_at, updated_at)
SELECT 'Motor fuera de borda 1 - TuonixDIY', id, 1, '7:41', 7.6833, 194.61, 206.92, 'Modelo semilla importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM cost_materials
WHERE name = 'PLA base';

INSERT OR IGNORE INTO cost_models (name, material_id, pieces_per_plate, print_hours, print_hours_decimal, grams, sale_estimate, notes, active, created_at, updated_at)
SELECT 'Motor fuera de borda 2 - ultimaker3dprint', id, 1, '6:15', 6.25, 128.50, 146.86, 'Modelo semilla importado del cotizador operativo.', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM cost_materials
WHERE name = 'PLA base';
