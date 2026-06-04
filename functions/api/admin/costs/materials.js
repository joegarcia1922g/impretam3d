import { assertAdmin } from '../../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse } from '../../../_shared/admin-db.js';
import { getCostCatalog, upsertMaterial } from '../../../_shared/costs.js';

const MAX_BODY_BYTES = 12000;

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

export async function onRequest(context) {
    const { request, env } = context;

    const auth = assertAdmin(request, env);
    if (!auth.ok) {
        return auth.response;
    }

    if (request.method !== 'POST') {
        return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
    }

    const db = getAdminDb(env);
    if (!db) {
        return jsonResponse({ ok: false, error: 'missing_d1_binding' }, 503);
    }

    await ensureAdminSchema(db);

    const parsed = await readJsonBody(request);
    if (parsed.error) {
        return jsonResponse({ ok: false, error: parsed.error }, parsed.error === 'payload_too_large' ? 413 : 400);
    }

    try {
        const material = await upsertMaterial(db, parsed.value || {});
        const catalog = await getCostCatalog(db);
        return jsonResponse({ ok: true, storage: 'd1', material, catalog }, 201);
    } catch (error) {
        return jsonResponse({ ok: false, error: error.message || 'material_save_failed' }, 400);
    }
}
