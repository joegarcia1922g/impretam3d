import { assertAdmin } from '../../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse } from '../../../_shared/admin-db.js';
import { getStorageUsage, readRecentAlerts, recordStorageAlerts } from '../../../_shared/storage.js';

export async function onRequest(context) {
    const { request, env } = context;

    const auth = assertAdmin(request, env);
    if (!auth.ok) {
        return auth.response;
    }

    if (request.method !== 'GET') {
        return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
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

    const usage = await getStorageUsage(db);
    const createdAlerts = await recordStorageAlerts(db, env, usage);
    const alerts = await readRecentAlerts(db, usage.monthKey);

    return jsonResponse({
        ok: true,
        storage: 'd1',
        usage,
        alerts,
        createdAlerts
    });
}
