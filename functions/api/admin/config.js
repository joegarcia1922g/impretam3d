import { assertAdmin } from '../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse, nowIso, parseJson, toNumber } from '../../_shared/admin-db.js';

const ALLOWED_KEYS = new Set(['calculatorConfig', 'siteContent']);
const MAX_BODY_BYTES = 20000;

function validateKey(url) {
    const key = url.searchParams.get('key');

    if (!key || !ALLOWED_KEYS.has(key)) {
        return null;
    }

    return key;
}

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

async function getSettingFromD1(db, key) {
    const row = await db.prepare('SELECT value, updated_at FROM site_settings WHERE key = ?')
        .bind(key)
        .first();

    return {
        value: parseJson(row ? row.value : null, null),
        updatedAt: row ? row.updated_at : null
    };
}

async function getServicesFromD1(db) {
    const rows = await db.prepare(`
        SELECT id, name, description, base_price, sort_order, active, created_at, updated_at
        FROM services
        WHERE active = 1
        ORDER BY sort_order ASC, id ASC
    `).all();

    return (rows.results || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        basePrice: row.base_price,
        sortOrder: row.sort_order,
        active: Boolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

async function saveSettingToD1(db, key, value) {
    const timestamp = nowIso();

    await db.prepare(`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
    `).bind(key, JSON.stringify(value), timestamp).run();

    return timestamp;
}

async function saveServicesToD1(db, services) {
    const timestamp = nowIso();

    await db.prepare('DELETE FROM services').run();

    for (let index = 0; index < services.length; index += 1) {
        const service = services[index] || {};
        await db.prepare(`
            INSERT INTO services (
                name,
                description,
                base_price,
                sort_order,
                active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, 1, ?, ?)
        `).bind(
            String(service.name || '').trim() || 'Servicio',
            String(service.description || '').trim(),
            toNumber(service.basePrice),
            index,
            timestamp,
            timestamp
        ).run();
    }
}

async function loadFromD1(db, key) {
    const stored = await getSettingFromD1(db, key);

    if (key === 'siteContent') {
        const services = await getServicesFromD1(db);
        const value = stored.value || {};
        value.services = services.length ? services : (Array.isArray(value.services) ? value.services : []);

        return jsonResponse({
            ok: true,
            storage: 'd1',
            key,
            value,
            updatedAt: stored.updatedAt
        });
    }

    return jsonResponse({
        ok: true,
        storage: 'd1',
        key,
        value: stored.value,
        updatedAt: stored.updatedAt
    });
}

async function saveToD1(db, key, value) {
    let valueToSave = value;

    if (key === 'siteContent') {
        const services = Array.isArray(value.services) ? value.services : [];
        await saveServicesToD1(db, services);
        valueToSave = { ...value, services };
    }

    const updatedAt = await saveSettingToD1(db, key, valueToSave);

    return jsonResponse({
        ok: true,
        storage: 'd1',
        key,
        value: valueToSave,
        updatedAt
    });
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Allow': 'GET, PUT, POST, OPTIONS',
                'Cache-Control': 'no-store'
            }
        });
    }

    const auth = assertAdmin(request, env);
    if (!auth.ok) {
        return auth.response;
    }

    const url = new URL(request.url);
    const key = validateKey(url);

    if (!key) {
        return jsonResponse({
            ok: false,
            error: 'invalid_key',
            allowedKeys: Array.from(ALLOWED_KEYS)
        }, 400);
    }

    const db = getAdminDb(env);
    if (db) {
        await ensureAdminSchema(db);

        if (request.method === 'GET') {
            return loadFromD1(db, key);
        }

        if (request.method === 'PUT' || request.method === 'POST') {
            const parsed = await readJsonBody(request);

            if (parsed.error === 'payload_too_large') {
                return jsonResponse({ ok: false, error: parsed.error }, 413);
            }

            if (parsed.error === 'invalid_json') {
                return jsonResponse({ ok: false, error: parsed.error }, 400);
            }

            const value = parsed.value && Object.prototype.hasOwnProperty.call(parsed.value, 'value')
                ? parsed.value.value
                : parsed.value;

            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return jsonResponse({
                    ok: false,
                    error: 'invalid_value',
                    message: 'El valor debe ser un objeto JSON.'
                }, 400);
            }

            return saveToD1(db, key, value);
        }
    }

    if (!env.ADMIN_CONFIG_KV) {
        return jsonResponse({
            ok: false,
            error: 'missing_storage_binding',
            message: 'Configura el binding IMPRETAM3D_DB o DB en Cloudflare Pages. KV es solo respaldo opcional.'
        }, 503);
    }

    if (request.method === 'GET') {
        const stored = await env.ADMIN_CONFIG_KV.get(key, { type: 'json' });

        return jsonResponse({
            ok: true,
            storage: 'kv',
            key,
            value: stored ? stored.value : null,
            updatedAt: stored ? stored.updatedAt : null
        });
    }

    if (request.method === 'PUT' || request.method === 'POST') {
        const parsed = await readJsonBody(request);

        if (parsed.error === 'payload_too_large') {
            return jsonResponse({ ok: false, error: parsed.error }, 413);
        }

        if (parsed.error === 'invalid_json') {
            return jsonResponse({ ok: false, error: parsed.error }, 400);
        }

        const value = parsed.value && Object.prototype.hasOwnProperty.call(parsed.value, 'value')
            ? parsed.value.value
            : parsed.value;

        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return jsonResponse({
                ok: false,
                error: 'invalid_value',
                message: 'El valor debe ser un objeto JSON.'
            }, 400);
        }

        const record = {
            value,
            updatedAt: new Date().toISOString()
        };

        await env.ADMIN_CONFIG_KV.put(key, JSON.stringify(record));

        return jsonResponse({
            ok: true,
            storage: 'kv',
            key,
            value: record.value,
            updatedAt: record.updatedAt
        });
    }

    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
}
