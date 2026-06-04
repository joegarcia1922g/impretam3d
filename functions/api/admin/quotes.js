import { assertAdmin } from '../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse, nowIso, toBooleanInteger, toNumber } from '../../_shared/admin-db.js';

const MAX_BODY_BYTES = 20000;

async function readJsonBody(request) {
    const rawBody = await request.text();

    if (rawBody.length > MAX_BODY_BYTES) {
        return { error: 'payload_too_large' };
    }

    try {
        return { value: JSON.parse(rawBody) };
    } catch (_error) {
        return { error: 'invalid_json' };
    }
}

function normalizeQuote(input) {
    const quote = input && typeof input === 'object' ? input : {};
    const firstNumber = (...values) => {
        const value = values.find((item) => item !== undefined && item !== null && item !== '');
        return toNumber(value);
    };
    const positiveInteger = (value, fallback = 1) => {
        const number = Number.parseInt(value, 10);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    };
    const materialTotal = firstNumber(quote.materialTotal, quote.material_total);
    const printTotal = firstNumber(quote.printTotal, quote.print_total);
    const energyTotal = firstNumber(quote.energyTotal, quote.energy_total);
    const maintenanceTotal = firstNumber(quote.maintenanceTotal, quote.maintenance_total);
    let timeTotal = firstNumber(quote.timeTotal, quote.time_total);
    if (!timeTotal && (printTotal || energyTotal || maintenanceTotal)) {
        timeTotal = printTotal + energyTotal + maintenanceTotal;
    }
    let baseSubtotal = firstNumber(quote.baseSubtotal, quote.base_subtotal, quote.costPerPlate, quote.cost_per_plate);
    if (!baseSubtotal && (materialTotal || timeTotal)) {
        baseSubtotal = materialTotal + timeTotal;
    }
    const marginAmount = firstNumber(quote.marginAmount, quote.margin_amount);
    const ivaAmount = firstNumber(quote.ivaAmount, quote.iva_amount);
    const finalPrice = firstNumber(quote.finalPrice, quote.final_price) || baseSubtotal + marginAmount + ivaAmount;
    const piecesPerPlate = positiveInteger(quote.piecesPerPlate || quote.pieces_per_plate, 1);
    let costPerPiece = firstNumber(quote.costPerPiece, quote.cost_per_piece);
    if (!costPerPiece && baseSubtotal) {
        costPerPiece = Math.round(((baseSubtotal / piecesPerPlate) + Number.EPSILON) * 100) / 100;
    }

    return {
        customerName: String(quote.customerName || '').trim(),
        material: String(quote.material || 'PLA').trim(),
        grams: toNumber(quote.grams),
        hours: toNumber(quote.hours),
        materialCostPerGram: firstNumber(quote.materialCostPerGram, quote.materialCost, quote.material_cost_per_gram),
        hourlyCost: firstNumber(quote.hourlyCost, quote.costPerHour, quote.hourly_cost),
        printCostPerHour: firstNumber(quote.printCostPerHour, quote.hourlyCost, quote.costPerHour, quote.print_cost_per_hour),
        energyCostPerHour: firstNumber(quote.energyCostPerHour, quote.energy_cost_per_hour),
        maintenanceCostPerHour: firstNumber(quote.maintenanceCostPerHour, quote.maintenance_cost_per_hour),
        marginPercent: firstNumber(quote.marginPercent, quote.margin, quote.margin_percent),
        includeIva: Boolean(quote.includeIva ?? quote.includeTax ?? quote.include_iva),
        ivaPercent: firstNumber(quote.ivaPercent, quote.taxRate, quote.iva_percent),
        materialTotal,
        timeTotal,
        printTotal,
        energyTotal,
        maintenanceTotal,
        costPerPlate: firstNumber(quote.costPerPlate, quote.cost_per_plate, baseSubtotal),
        costPerPiece,
        piecesPerPlate,
        pricingTierCode: String(quote.pricingTierCode || '').trim(),
        baseSubtotal,
        marginAmount,
        ivaAmount,
        finalPrice,
        notes: String(quote.notes || '').trim(),
        status: String(quote.status || 'draft').trim() || 'draft'
    };
}

function rowToQuote(row) {
    return {
        id: row.id,
        quoteNumber: row.quote_number,
        customerName: row.customer_name,
        material: row.material,
        grams: row.grams,
        hours: row.hours,
        materialCostPerGram: row.material_cost_per_gram,
        hourlyCost: row.hourly_cost,
        printCostPerHour: row.print_cost_per_hour || 0,
        energyCostPerHour: row.energy_cost_per_hour || 0,
        maintenanceCostPerHour: row.maintenance_cost_per_hour || 0,
        marginPercent: row.margin_percent,
        includeIva: Boolean(row.include_iva),
        ivaPercent: row.iva_percent,
        materialTotal: row.material_total,
        timeTotal: row.time_total,
        printTotal: row.print_total || 0,
        energyTotal: row.energy_total || 0,
        maintenanceTotal: row.maintenance_total || 0,
        costPerPlate: row.cost_per_plate || 0,
        costPerPiece: row.cost_per_piece || 0,
        piecesPerPlate: row.pieces_per_plate || 1,
        pricingTierCode: row.pricing_tier_code || '',
        baseSubtotal: row.base_subtotal,
        marginAmount: row.margin_amount,
        ivaAmount: row.iva_amount,
        finalPrice: row.final_price,
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

async function listQuotes(db, request) {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);
    const rows = await db.prepare(`
        SELECT *
        FROM quotes
        ORDER BY created_at DESC, id DESC
        LIMIT ?
    `).bind(limit).all();

    return jsonResponse({
        ok: true,
        storage: 'd1',
        quotes: (rows.results || []).map(rowToQuote)
    });
}

async function createQuote(db, request) {
    const parsed = await readJsonBody(request);

    if (parsed.error === 'payload_too_large') {
        return jsonResponse({ ok: false, error: parsed.error }, 413);
    }

    if (parsed.error === 'invalid_json') {
        return jsonResponse({ ok: false, error: parsed.error }, 400);
    }

    const quote = normalizeQuote(parsed.value && parsed.value.quote ? parsed.value.quote : parsed.value);
    const timestamp = nowIso();
    const quoteNumber = `I3D-${Date.now().toString(36).toUpperCase()}`;

    const result = await db.prepare(`
        INSERT INTO quotes (
            quote_number,
            customer_name,
            material,
            grams,
            hours,
            material_cost_per_gram,
            hourly_cost,
            print_cost_per_hour,
            energy_cost_per_hour,
            maintenance_cost_per_hour,
            margin_percent,
            include_iva,
            iva_percent,
            material_total,
            time_total,
            print_total,
            energy_total,
            maintenance_total,
            cost_per_plate,
            cost_per_piece,
            pieces_per_plate,
            pricing_tier_code,
            base_subtotal,
            margin_amount,
            iva_amount,
            final_price,
            notes,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        quoteNumber,
        quote.customerName,
        quote.material,
        quote.grams,
        quote.hours,
        quote.materialCostPerGram,
        quote.hourlyCost,
        quote.printCostPerHour,
        quote.energyCostPerHour,
        quote.maintenanceCostPerHour,
        quote.marginPercent,
        toBooleanInteger(quote.includeIva),
        quote.ivaPercent,
        quote.materialTotal,
        quote.timeTotal,
        quote.printTotal,
        quote.energyTotal,
        quote.maintenanceTotal,
        quote.costPerPlate,
        quote.costPerPiece,
        quote.piecesPerPlate,
        quote.pricingTierCode,
        quote.baseSubtotal,
        quote.marginAmount,
        quote.ivaAmount,
        quote.finalPrice,
        quote.notes,
        quote.status,
        timestamp,
        timestamp
    ).run();

    const saved = await db.prepare('SELECT * FROM quotes WHERE id = ?')
        .bind(result.meta.last_row_id)
        .first();

    return jsonResponse({
        ok: true,
        storage: 'd1',
        quote: rowToQuote(saved)
    }, 201);
}

export async function onRequest(context) {
    const { request, env } = context;

    const auth = assertAdmin(request, env);
    if (!auth.ok) {
        return auth.response;
    }

    const db = getAdminDb(env);
    if (!db) {
        return jsonResponse({
            ok: false,
            error: 'missing_d1_binding',
            message: 'Configura el binding IMPRETAM3D_DB o DB en Cloudflare Pages.'
        }, 503);
    }

    await ensureAdminSchema(db);

    if (request.method === 'GET') {
        return listQuotes(db, request);
    }

    if (request.method === 'POST') {
        return createQuote(db, request);
    }

    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
}
