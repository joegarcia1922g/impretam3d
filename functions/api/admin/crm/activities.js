import { assertAdmin } from '../../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse } from '../../../_shared/admin-db.js';
import { createActivity, listActivities } from '../../../_shared/crm.js';

const MAX_BODY_BYTES = 14000;

async function readJsonBody(request) {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) return { error: 'payload_too_large' };
    try {
        return { value: JSON.parse(rawBody) };
    } catch (_error) {
        return { error: 'invalid_json' };
    }
}

export async function onRequest(context) {
    const { request, env } = context;
    const auth = assertAdmin(request, env);
    if (!auth.ok) return auth.response;

    const db = getAdminDb(env);
    if (!db) return jsonResponse({ ok: false, error: 'missing_d1_binding' }, 503);
    await ensureAdminSchema(db);

    if (request.method === 'GET') {
        const activities = await listActivities(db, request);
        return jsonResponse({ ok: true, storage: 'd1', activities });
    }

    if (request.method === 'POST') {
        const parsed = await readJsonBody(request);
        if (parsed.error) return jsonResponse({ ok: false, error: parsed.error }, parsed.error === 'payload_too_large' ? 413 : 400);
        const activity = await createActivity(db, parsed.value || {});
        return jsonResponse({ ok: true, storage: 'd1', activity }, 201);
    }

    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
}
