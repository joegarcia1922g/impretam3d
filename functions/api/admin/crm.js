import { assertAdmin } from '../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse } from '../../_shared/admin-db.js';
import { getCrmDashboard } from '../../_shared/crm.js';

export async function onRequest(context) {
    const { request, env } = context;
    const auth = assertAdmin(request, env);
    if (!auth.ok) return auth.response;

    if (request.method !== 'GET') {
        return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
    }

    const db = getAdminDb(env);
    if (!db) {
        return jsonResponse({ ok: false, error: 'missing_d1_binding' }, 503);
    }

    await ensureAdminSchema(db);
    const dashboard = await getCrmDashboard(db);
    return jsonResponse({ ok: true, storage: 'd1', dashboard });
}
