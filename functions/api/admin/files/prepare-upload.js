import { assertAdmin } from '../../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, getFilesBucket, jsonResponse, nowIso } from '../../../_shared/admin-db.js';
import {
    createOrGetFileLink,
    findFileByHash,
    getStorageUsage,
    normalizeFileMetadata,
    readRecentAlerts,
    recordStorageAlerts,
    storageKeyForFile,
    updateMonthlyUsage,
    validateFileMetadata
} from '../../../_shared/storage.js';

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
        return jsonResponse({
            ok: false,
            error: 'missing_d1_binding',
            message: 'Configura el binding IMPRETAM3D_DB o DB en Cloudflare Pages.'
        }, 503);
    }

    await ensureAdminSchema(db);

    const parsed = await readJsonBody(request);
    if (parsed.error) {
        return jsonResponse({ ok: false, error: parsed.error }, parsed.error === 'payload_too_large' ? 413 : 400);
    }

    const file = normalizeFileMetadata(parsed.value || {});
    const validationError = validateFileMetadata(file);
    if (validationError) {
        return jsonResponse({ ok: false, error: validationError }, 400);
    }

    const existingFile = await findFileByHash(db, file.sha256);
    if (existingFile) {
        await db.prepare(`
            UPDATE file_objects
            SET upload_count = upload_count + 1,
                updated_at = ?
            WHERE id = ?
        `).bind(nowIso(), existingFile.id).run();

        const link = await createOrGetFileLink(db, existingFile.id, file);
        const usage = await updateMonthlyUsage(db, { duplicateUploads: 1 });
        const createdAlerts = await recordStorageAlerts(db, env, usage);
        const alerts = await readRecentAlerts(db, usage.monthKey);

        return jsonResponse({
            ok: true,
            duplicate: true,
            canUpload: false,
            message: 'Archivo existente reutilizado por hash SHA-256.',
            file: existingFile,
            link,
            usage,
            alerts,
            createdAlerts
        });
    }

    const bucket = getFilesBucket(env);
    if (!bucket) {
        return jsonResponse({
            ok: false,
            error: 'missing_r2_binding',
            message: 'Configura el binding IMP_FILES_BUCKET en Cloudflare Pages.'
        }, 503);
    }

    const usage = await getStorageUsage(db);
    const projectedBytes = usage.bytesStored + file.sizeBytes;

    if (projectedBytes > usage.limits.blockBytes) {
        const createdAlerts = await recordStorageAlerts(db, env, usage);
        const alerts = await readRecentAlerts(db, usage.monthKey);

        return jsonResponse({
            ok: false,
            error: 'storage_limit_exceeded',
            message: 'La subida supera el limite configurado de storage.',
            projectedBytes,
            usage,
            alerts,
            createdAlerts
        }, 409);
    }

    return jsonResponse({
        ok: true,
        duplicate: false,
        canUpload: true,
        uploadId: `${Date.now().toString(36)}-${file.sha256.slice(0, 12)}`,
        storageKey: storageKeyForFile(file),
        usage
    });
}
