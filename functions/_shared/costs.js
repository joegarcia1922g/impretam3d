import { nowIso, toBooleanInteger, toNumber } from './admin-db.js';

export const DEFAULT_COST_SETTINGS = {
    businessName: 'Impretam 3D',
    printCostPerHour: 35,
    energyCostPerHour: 3,
    maintenanceCostPerHour: 1.83,
    defaultMarginPercent: 225,
    includeIva: false,
    ivaPercent: 16
};

const DEFAULT_MATERIALS = [
    { name: 'PLA base', costPerGram: 0.40, color: '', notes: 'Material base importado del cotizador operativo.' }
];

const DEFAULT_TIERS = [
    { code: 'final', name: 'Cliente final', description: 'Precio alto al publico final.', minMarkup: 300, maxMarkup: 350, defaultMarkup: 325 },
    { code: 'frequent', name: 'Cliente frecuente', description: 'Cliente recurrente con margen intermedio.', minMarkup: 200, maxMarkup: 250, defaultMarkup: 225 },
    { code: 'bulk', name: 'Cliente bulk', description: 'Volumen alto y margen configurable.', minMarkup: 120, maxMarkup: 180, defaultMarkup: 150 }
];

const DEFAULT_MODELS = [
    { name: 'Alien Nuevo', piecesPerPlate: 15, printHours: '11:08', grams: 199.09, saleEstimate: null },
    { name: 'Ring de valla', piecesPerPlate: 1, printHours: '2:10', grams: 39.68, saleEstimate: 47.41 },
    { name: 'Motor fuera de borda 1 - TuonixDIY', piecesPerPlate: 1, printHours: '7:41', grams: 194.61, saleEstimate: 206.92 },
    { name: 'Motor fuera de borda 2 - ultimaker3dprint', piecesPerPlate: 1, printHours: '6:15', grams: 128.50, saleEstimate: 146.86 }
];

export function roundMoney(value) {
    const number = toNumber(value);
    return Math.round((number + Number.EPSILON) * 100) / 100;
}

export function parseHoursToDecimal(value) {
    const text = String(value || '').trim();
    if (!text) {
        return 0;
    }

    if (text.includes(':')) {
        const parts = text.split(':');
        if (parts.length !== 2) {
            throw new Error('invalid_hours');
        }

        const hours = Number.parseInt(parts[0], 10);
        const minutes = Number.parseInt(parts[1], 10);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
            throw new Error('invalid_hours');
        }

        return roundMoney(hours + (minutes / 60));
    }

    const number = toNumber(String(text).replace(',', '.'));
    if (number < 0) {
        throw new Error('invalid_hours');
    }
    return number;
}

function normalizeText(value, fallback = '') {
    return String(value || '').trim() || fallback;
}

function positiveInteger(value, fallback = 1) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function normalizeCostSettings(input = {}) {
    return {
        businessName: normalizeText(input.businessName, DEFAULT_COST_SETTINGS.businessName),
        printCostPerHour: roundMoney(input.printCostPerHour),
        energyCostPerHour: roundMoney(input.energyCostPerHour),
        maintenanceCostPerHour: roundMoney(input.maintenanceCostPerHour),
        defaultMarginPercent: roundMoney(input.defaultMarginPercent),
        includeIva: Boolean(input.includeIva),
        ivaPercent: roundMoney(input.ivaPercent)
    };
}

export function normalizeMaterial(input = {}) {
    return {
        name: normalizeText(input.name, 'Material'),
        costPerGram: roundMoney(input.costPerGram),
        color: normalizeText(input.color),
        notes: normalizeText(input.notes),
        active: input.active === undefined ? true : Boolean(input.active)
    };
}

export function normalizeModel(input = {}) {
    const printHours = normalizeText(input.printHours, '0:00');
    const hoursDecimal = parseHoursToDecimal(printHours);

    return {
        name: normalizeText(input.name, 'Modelo'),
        materialId: positiveInteger(input.materialId || input.material_id, 0),
        piecesPerPlate: positiveInteger(input.piecesPerPlate || input.pieces_per_plate, 1),
        printHours,
        printHoursDecimal: hoursDecimal,
        grams: roundMoney(input.grams),
        saleEstimate: input.saleEstimate === '' || input.saleEstimate === null || input.saleEstimate === undefined
            ? null
            : roundMoney(input.saleEstimate),
        notes: normalizeText(input.notes),
        active: input.active === undefined ? true : Boolean(input.active)
    };
}

export function normalizeTier(input = {}) {
    return {
        code: normalizeText(input.code, 'custom').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 40),
        name: normalizeText(input.name, 'Tier'),
        description: normalizeText(input.description),
        minMarkup: roundMoney(input.minMarkup),
        maxMarkup: roundMoney(input.maxMarkup),
        defaultMarkup: roundMoney(input.defaultMarkup),
        active: input.active === undefined ? true : Boolean(input.active)
    };
}

export function calculateCostBreakdown({ hours, grams, materialCostPerGram, printCostPerHour, energyCostPerHour, maintenanceCostPerHour, piecesPerPlate = 1, saleEstimate = null }) {
    const pieces = Math.max(Number.parseInt(piecesPerPlate, 10) || 1, 1);
    const materialTotal = roundMoney(toNumber(grams) * toNumber(materialCostPerGram));
    const printTotal = roundMoney(toNumber(hours) * toNumber(printCostPerHour));
    const energyTotal = roundMoney(toNumber(hours) * toNumber(energyCostPerHour));
    const maintenanceTotal = roundMoney(toNumber(hours) * toNumber(maintenanceCostPerHour));
    const costPlate = roundMoney(materialTotal + printTotal + energyTotal + maintenanceTotal);
    const costUnit = roundMoney(costPlate / pieces);
    const profit = saleEstimate === null || saleEstimate === undefined || saleEstimate === ''
        ? null
        : roundMoney(toNumber(saleEstimate) - costUnit);

    return {
        materialTotal,
        printTotal,
        energyTotal,
        maintenanceTotal,
        costPlate,
        costUnit,
        profit
    };
}

export async function ensureCostDefaults(db) {
    const timestamp = nowIso();

    for (const [key, value] of Object.entries(DEFAULT_COST_SETTINGS)) {
        await db.prepare(`
            INSERT OR IGNORE INTO cost_settings (key, value, updated_at)
            VALUES (?, ?, ?)
        `).bind(key, String(value), timestamp).run();
    }

    for (const material of DEFAULT_MATERIALS) {
        await db.prepare(`
            INSERT OR IGNORE INTO cost_materials (name, cost_per_gram, color, notes, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
        `).bind(material.name, material.costPerGram, material.color, material.notes, timestamp, timestamp).run();
    }

    const baseMaterial = await db.prepare('SELECT id FROM cost_materials WHERE name = ?')
        .bind(DEFAULT_MATERIALS[0].name)
        .first();

    for (const tier of DEFAULT_TIERS) {
        await db.prepare(`
            INSERT OR IGNORE INTO pricing_tiers (code, name, description, min_markup, max_markup, default_markup, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).bind(tier.code, tier.name, tier.description, tier.minMarkup, tier.maxMarkup, tier.defaultMarkup, timestamp, timestamp).run();
    }

    if (baseMaterial) {
        for (const model of DEFAULT_MODELS) {
            const normalized = normalizeModel({ ...model, materialId: baseMaterial.id });
            await db.prepare(`
                INSERT OR IGNORE INTO cost_models (
                    name, material_id, pieces_per_plate, print_hours, print_hours_decimal, grams,
                    sale_estimate, notes, active, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            `).bind(
                normalized.name,
                normalized.materialId,
                normalized.piecesPerPlate,
                normalized.printHours,
                normalized.printHoursDecimal,
                normalized.grams,
                normalized.saleEstimate,
                'Modelo semilla importado del cotizador operativo.',
                timestamp,
                timestamp
            ).run();
        }
    }
}

export async function getCostSettings(db) {
    const rows = await db.prepare('SELECT key, value FROM cost_settings').all();
    const settings = { ...DEFAULT_COST_SETTINGS };

    for (const row of rows.results || []) {
        if (row.key === 'businessName') {
            settings.businessName = row.value || settings.businessName;
        } else if (row.key === 'includeIva') {
            settings.includeIva = row.value === 'true' || row.value === '1';
        } else if (Object.prototype.hasOwnProperty.call(settings, row.key)) {
            settings[row.key] = roundMoney(row.value);
        }
    }

    return settings;
}

export async function saveCostSettings(db, input) {
    const settings = normalizeCostSettings(input);
    const timestamp = nowIso();

    for (const [key, value] of Object.entries(settings)) {
        await db.prepare(`
            INSERT INTO cost_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        `).bind(key, String(value), timestamp).run();
    }

    return settings;
}

export function rowToMaterial(row) {
    return {
        id: row.id,
        name: row.name,
        costPerGram: roundMoney(row.cost_per_gram),
        color: row.color || '',
        notes: row.notes || '',
        active: Boolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export function rowToTier(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description || '',
        minMarkup: roundMoney(row.min_markup),
        maxMarkup: roundMoney(row.max_markup),
        defaultMarkup: roundMoney(row.default_markup),
        active: Boolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export function rowToModel(row, settings) {
    const materialCostPerGram = roundMoney(row.material_cost_per_gram);
    const breakdown = calculateCostBreakdown({
        hours: row.print_hours_decimal,
        grams: row.grams,
        materialCostPerGram,
        printCostPerHour: settings.printCostPerHour,
        energyCostPerHour: settings.energyCostPerHour,
        maintenanceCostPerHour: settings.maintenanceCostPerHour,
        piecesPerPlate: row.pieces_per_plate,
        saleEstimate: row.sale_estimate
    });

    return {
        id: row.id,
        name: row.name,
        materialId: row.material_id,
        materialName: row.material_name,
        materialCostPerGram,
        piecesPerPlate: row.pieces_per_plate,
        printHours: row.print_hours,
        printHoursDecimal: row.print_hours_decimal,
        grams: roundMoney(row.grams),
        saleEstimate: row.sale_estimate === null || row.sale_estimate === undefined ? null : roundMoney(row.sale_estimate),
        notes: row.notes || '',
        active: Boolean(row.active),
        ...breakdown,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function getCostCatalog(db) {
    await ensureCostDefaults(db);

    const settings = await getCostSettings(db);
    const materialRows = await db.prepare(`
        SELECT *
        FROM cost_materials
        WHERE active = 1
        ORDER BY name ASC, id ASC
    `).all();
    const tierRows = await db.prepare(`
        SELECT *
        FROM pricing_tiers
        WHERE active = 1
        ORDER BY id ASC
    `).all();
    const modelRows = await db.prepare(`
        SELECT cm.*, mat.name AS material_name, mat.cost_per_gram AS material_cost_per_gram
        FROM cost_models cm
        INNER JOIN cost_materials mat ON mat.id = cm.material_id
        WHERE cm.active = 1
        ORDER BY cm.name ASC, cm.id ASC
    `).all();

    const materials = (materialRows.results || []).map(rowToMaterial);
    const tiers = (tierRows.results || []).map(rowToTier);
    const models = (modelRows.results || []).map((row) => rowToModel(row, settings));

    return {
        settings,
        materials,
        tiers,
        models,
        summary: {
            materialCount: materials.length,
            modelCount: models.length,
            averageUnitCost: roundMoney(models.reduce((sum, model) => sum + model.costUnit, 0) / (models.length || 1)),
            totalPlateCost: roundMoney(models.reduce((sum, model) => sum + model.costPlate, 0))
        }
    };
}

export async function upsertMaterial(db, input, id = null) {
    const material = normalizeMaterial(input);
    const timestamp = nowIso();

    if (id) {
        await db.prepare(`
            UPDATE cost_materials
            SET name = ?, cost_per_gram = ?, color = ?, notes = ?, active = ?, updated_at = ?
            WHERE id = ?
        `).bind(material.name, material.costPerGram, material.color, material.notes, toBooleanInteger(material.active), timestamp, id).run();
    } else {
        const result = await db.prepare(`
            INSERT INTO cost_materials (name, cost_per_gram, color, notes, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(material.name, material.costPerGram, material.color, material.notes, toBooleanInteger(material.active), timestamp, timestamp).run();
        id = result.meta.last_row_id;
    }

    const row = await db.prepare('SELECT * FROM cost_materials WHERE id = ?').bind(id).first();
    return rowToMaterial(row);
}

export async function upsertModel(db, input, id = null) {
    const model = normalizeModel(input);
    const timestamp = nowIso();

    if (!model.materialId) {
        throw new Error('missing_material');
    }

    if (id) {
        await db.prepare(`
            UPDATE cost_models
            SET name = ?, material_id = ?, pieces_per_plate = ?, print_hours = ?, print_hours_decimal = ?,
                grams = ?, sale_estimate = ?, notes = ?, active = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            model.name,
            model.materialId,
            model.piecesPerPlate,
            model.printHours,
            model.printHoursDecimal,
            model.grams,
            model.saleEstimate,
            model.notes,
            toBooleanInteger(model.active),
            timestamp,
            id
        ).run();
    } else {
        const result = await db.prepare(`
            INSERT INTO cost_models (
                name, material_id, pieces_per_plate, print_hours, print_hours_decimal,
                grams, sale_estimate, notes, active, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            model.name,
            model.materialId,
            model.piecesPerPlate,
            model.printHours,
            model.printHoursDecimal,
            model.grams,
            model.saleEstimate,
            model.notes,
            toBooleanInteger(model.active),
            timestamp,
            timestamp
        ).run();
        id = result.meta.last_row_id;
    }

    const settings = await getCostSettings(db);
    const row = await db.prepare(`
        SELECT cm.*, mat.name AS material_name, mat.cost_per_gram AS material_cost_per_gram
        FROM cost_models cm
        INNER JOIN cost_materials mat ON mat.id = cm.material_id
        WHERE cm.id = ?
    `).bind(id).first();
    return rowToModel(row, settings);
}

export async function updateTier(db, id, input) {
    const tier = normalizeTier(input);
    const timestamp = nowIso();

    await db.prepare(`
        UPDATE pricing_tiers
        SET name = ?, description = ?, min_markup = ?, max_markup = ?, default_markup = ?, active = ?, updated_at = ?
        WHERE id = ?
    `).bind(
        tier.name,
        tier.description,
        tier.minMarkup,
        tier.maxMarkup,
        tier.defaultMarkup,
        toBooleanInteger(tier.active),
        timestamp,
        id
    ).run();

    const row = await db.prepare('SELECT * FROM pricing_tiers WHERE id = ?').bind(id).first();
    return rowToTier(row);
}
