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
    const baseSubtotal = toNumber(quote.baseSubtotal);
    const marginAmount = toNumber(quote.marginAmount);
    const ivaAmount = toNumber(quote.ivaAmount);
    const finalPrice = toNumber(quote.finalPrice) || baseSubtotal + marginAmount + ivaAmount;

    return {
        customerName: String(quote.customerName || '').trim(),
        material: String(quote.material || 'PLA').trim(),
        grams: toNumber(quote.grams),
        hours: toNumber(quote.hours),
        materialCostPerGram: toNumber(quote.materialCostPerGram),
        hourlyCost: toNumber(quote.hourlyCost),
        marginPercent: toNumber(quote.marginPercent),
        includeIva: Boolean(quote.includeIva),
        ivaPercent: toNumber(quote.ivaPercent),
        materialTotal: toNumber(quote.materialTotal),
        timeTotal: toNumber(quote.timeTotal),
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
        marginPercent: row.margin_percent,
        includeIva: Boolean(row.include_iva),
        ivaPercent: row.iva_percent,
        materialTotal: row.material_total,
        timeTotal: row.time_total,
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
            margin_percent,
            include_iva,
            iva_percent,
            material_total,
            time_total,
            base_subtotal,
            margin_amount,
            iva_amount,
            final_price,
            notes,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        quoteNumber,
        quote.customerName,
        quote.material,
        quote.grams,
        quote.hours,
        quote.materialCostPerGram,
        quote.hourlyCost,
        quote.marginPercent,
        toBooleanInteger(quote.includeIva),
        quote.ivaPercent,
        quote.materialTotal,
        quote.timeTotal,
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
