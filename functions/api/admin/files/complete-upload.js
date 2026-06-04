import { assertAdmin } from '../../../_shared/admin-auth.js';
import { ensureAdminSchema, getAdminDb, getFilesBucket, jsonResponse, nowIso } from '../../../_shared/admin-db.js';
import {
    createOrGetFileLink,
    findFileByHash,
    getStorageUsage,
    normalizeFileMetadata,
    readRecentAlerts,
    recordStorageAlerts,
    rowToFileObject,
    storageKeyForFile,
    updateMonthlyUsage,
    validateFileMetadata
} from '../../../_shared/storage.js';

function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function sha256Hex(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return toHex(digest);
}

function readFormString(formData, key) {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
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

    const bucket = getFilesBucket(env);
    if (!bucket) {
        return jsonResponse({
            ok: false,
            error: 'missing_r2_binding',
            message: 'Configura el binding IMP_FILES_BUCKET en Cloudflare Pages.'
        }, 503);
    }

    await ensureAdminSchema(db);

    let formData;
    try {
        formData = await request.formData();
    } catch (_error) {
        return jsonResponse({ ok: false, error: 'invalid_form_data' }, 400);
    }

    const uploadedFile = formData.get('file');
    if (!uploadedFile || typeof uploadedFile.arrayBuffer !== 'function') {
        return jsonResponse({ ok: false, error: 'missing_file' }, 400);
    }

    const file = normalizeFileMetadata({
        filename: uploadedFile.name || readFormString(formData, 'filename'),
        contentType: uploadedFile.type || readFormString(formData, 'contentType'),
        sizeBytes: uploadedFile.size,
        sha256: readFormString(formData, 'sha256'),
        relatedType: readFormString(formData, 'relatedType'),
        relatedId: readFormString(formData, 'relatedId'),
        label: readFormString(formData, 'label')
    });
    const validationError = validateFileMetadata(file);
    if (validationError) {
        return jsonResponse({ ok: false, error: validationError }, 400);
    }

    const buffer = await uploadedFile.arrayBuffer();
    const actualHash = await sha256Hex(buffer);
    if (actualHash !== file.sha256) {
        return jsonResponse({
            ok: false,
            error: 'sha256_mismatch',
            message: 'El hash calculado del archivo no coincide con el hash preparado.'
        }, 400);
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
            message: 'Archivo existente reutilizado por hash SHA-256.',
            file: existingFile,
            link,
            usage,
            alerts,
            createdAlerts
        });
    }

    const usageBeforeUpload = await getStorageUsage(db);
    const projectedBytes = usageBeforeUpload.bytesStored + file.sizeBytes;
    if (projectedBytes > usageBeforeUpload.limits.blockBytes) {
        const createdAlerts = await recordStorageAlerts(db, env, usageBeforeUpload);
        const alerts = await readRecentAlerts(db, usageBeforeUpload.monthKey);

        return jsonResponse({
            ok: false,
            error: 'storage_limit_exceeded',
            message: 'La subida supera el limite configurado de storage.',
            projectedBytes,
            usage: usageBeforeUpload,
            alerts,
            createdAlerts
        }, 409);
    }

    const requestedStorageKey = readFormString(formData, 'storageKey');
    const storageKey = requestedStorageKey || storageKeyForFile(file);
    const timestamp = nowIso();

    await bucket.put(storageKey, buffer, {
        httpMetadata: {
            contentType: file.contentType
        },
        customMetadata: {
            sha256: file.sha256,
            originalFilename: file.filename
        }
    });

    await db.prepare(`
        INSERT OR IGNORE INTO file_objects (
            sha256,
            storage_key,
            filename,
            content_type,
            size_bytes,
            storage_provider,
            upload_count,
            download_count,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'r2', 1, 0, ?, ?)
    `).bind(
        file.sha256,
        storageKey,
        file.filename,
        file.contentType,
        file.sizeBytes,
        timestamp,
        timestamp
    ).run();

    const savedFileRow = await db.prepare(`
        SELECT *
        FROM file_objects
        WHERE sha256 = ?
    `).bind(file.sha256).first();
    const savedFile = rowToFileObject(savedFileRow);
    const link = await createOrGetFileLink(db, savedFile.id, file);
    const usage = await updateMonthlyUsage(db, { uploads: 1, classAOps: 1 });
    const createdAlerts = await recordStorageAlerts(db, env, usage);
    const alerts = await readRecentAlerts(db, usage.monthKey);

    return jsonResponse({
        ok: true,
        duplicate: false,
        file: savedFile,
        link,
        usage,
        alerts,
        createdAlerts
    }, 201);
}
