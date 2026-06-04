import { assertAdmin } from '../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, jsonResponse } from '../../_shared/admin-db.js';
import { rowToFileObject } from '../../_shared/storage.js';

function normalizeLimit(request) {
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
    return Math.min(Math.max(Number.isFinite(limit) ? limit : 50, 1), 100);
}

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

    const limit = normalizeLimit(request);
    const rows = await db.prepare(`
        SELECT
            fo.*,
            COUNT(fl.id) AS link_count,
            MAX(fl.created_at) AS last_link_at
        FROM file_objects fo
        LEFT JOIN file_links fl ON fl.file_object_id = fo.id
        GROUP BY fo.id
        ORDER BY fo.created_at DESC, fo.id DESC
        LIMIT ?
    `).bind(limit).all();

    return jsonResponse({
        ok: true,
        storage: 'd1',
        files: (rows.results || []).map((row) => ({
            ...rowToFileObject(row),
            linkCount: Number(row.link_count || 0),
            lastLinkAt: row.last_link_at || null
        }))
    });
}
