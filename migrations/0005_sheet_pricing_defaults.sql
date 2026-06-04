INSERT OR IGNORE INTO cost_settings (key, value, updated_at)
VALUES
    ('bankCommissionPercent', '3.5', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('rentPercent', '5', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('cardCostPerPiece', '0.33', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('ringCostPerPiece', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('bagCostPerPiece', '0.88', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('eyeletCostPerPiece', '1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('magnetCostPerPiece', '0', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

UPDATE cost_settings
SET value = '0', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'printCostPerHour' AND value = '35';

UPDATE cost_settings
SET value = '0.50', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'energyCostPerHour' AND value = '3';

UPDATE cost_settings
SET value = '1.76', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'maintenanceCostPerHour' AND value = '1.83';

UPDATE cost_settings
SET value = '100', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'defaultMarginPercent' AND value = '225';

UPDATE cost_settings
SET value = 'true', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'includeIva' AND value = 'false';

UPDATE pricing_tiers
SET name = 'Margen Bajo',
    description = 'Precio sugerido con 50% de ganancia.',
    min_markup = 50,
    max_markup = 50,
    default_markup = 50,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'final' AND default_markup = 325;

UPDATE pricing_tiers
SET name = 'Margen Medio',
    description = 'Precio sugerido con 100% de ganancia.',
    min_markup = 100,
    max_markup = 100,
    default_markup = 100,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'frequent' AND default_markup = 225;

UPDATE pricing_tiers
SET name = 'Margen Alto',
    description = 'Precio sugerido con 250% de ganancia.',
    min_markup = 250,
    max_markup = 250,
    default_markup = 250,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'bulk' AND default_markup = 150;
