import { assertAdmin } from '../../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, getFilesBucket, jsonResponse } from '../../../_shared/admin-db.js';
import { readRecentAlerts, recordStorageAlerts, rowToFileObject, updateMonthlyUsage } from '../../../_shared/storage.js';

function readId(params) {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const id = Number.parseInt(rawId || '', 10);
    return Number.isFinite(id) && id > 0 ? id : null;
}

async function countLinks(db, fileObjectId) {
    const row = await db.prepare(`
        SELECT COUNT(*) AS link_count
        FROM file_links
        WHERE file_object_id = ?
    `).bind(fileObjectId).first();

    return Number(row && row.link_count ? row.link_count : 0);
}

async function deletePhysicalFile(db, bucket, file) {
    await bucket.delete(file.storageKey);
    await db.prepare('DELETE FROM file_objects WHERE id = ?').bind(file.id).run();
    return updateMonthlyUsage(db, { deletes: 1, classAOps: 1 });
}

export async function onRequest(context) {
    const { request, env, params } = context;

    const auth = assertAdmin(request, env);
    if (!auth.ok) {
        return auth.response;
    }

    if (request.method !== 'DELETE') {
        return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
    }

    const id = readId(params);
    if (!id) {
        return jsonResponse({ ok: false, error: 'invalid_file_id' }, 400);
    }

    const db = getAdminDb(env);
    if (!db) {
        return jsonResponse({
            ok: false,
            error: 'missing_d1_binding',
            message: 'Configura el binding IMPRETAM3D_DB o DB en Cloudflare Pages.'
        }, 503);
    }

    const bucket = getFilesBucket(env);
    if (!bucket) {
        return jsonResponse({
            ok: false,
            error: 'missing_r2_binding',
            message: 'Configura el binding IMP_FILES_BUCKET en Cloudflare Pages.'
        }, 503);
    }

    await ensureAdminSchema(db);

    const fileRow = await db.prepare(`
        SELECT *
        FROM file_objects
        WHERE id = ?
    `).bind(id).first();
    const file = rowToFileObject(fileRow);

    if (!file) {
        return jsonResponse({ ok: false, error: 'file_not_found' }, 404);
    }

    const url = new URL(request.url);
    const linkId = Number.parseInt(url.searchParams.get('linkId') || '', 10);
    let usage;
    let deletedPhysicalObject = false;

    if (Number.isFinite(linkId) && linkId > 0) {
        await db.prepare(`
            DELETE FROM file_links
            WHERE id = ?
                AND file_object_id = ?
        `).bind(linkId, file.id).run();

        const remainingLinks = await countLinks(db, file.id);
        if (remainingLinks > 0) {
            usage = await updateMonthlyUsage(db);
        } else {
            usage = await deletePhysicalFile(db, bucket, file);
            deletedPhysicalObject = true;
        }
    } else {
        await db.prepare('DELETE FROM file_links WHERE file_object_id = ?').bind(file.id).run();
        usage = await deletePhysicalFile(db, bucket, file);
        deletedPhysicalObject = true;
    }

    const createdAlerts = await recordStorageAlerts(db, env, usage);
    const alerts = await readRecentAlerts(db, usage.monthKey);

    return jsonResponse({
        ok: true,
        deletedPhysicalObject,
        file,
        usage,
        alerts,
        createdAlerts
    });
}
