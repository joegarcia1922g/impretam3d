import { assertAdmin } from '../../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse } from '../../../_shared/admin-db.js';
import { readRecentAlerts, recordStorageAlerts, updateMonthlyUsage } from '../../../_shared/storage.js';

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
        return jsonResponse({
            ok: false,
            error: 'missing_d1_binding',
            message: 'Configura el binding IMPRETAM3D_DB o DB en Cloudflare Pages.'
        }, 503);
    }

    await ensureAdminSchema(db);

    const usage = await updateMonthlyUsage(db);
    const createdAlerts = await recordStorageAlerts(db, env, usage);
    const alerts = await readRecentAlerts(db, usage.monthKey);

    return jsonResponse({
        ok: true,
        storage: 'd1',
        source: 'd1_metadata',
        usage,
        alerts,
        createdAlerts
    });
}
