import { STORAGE_LIMITS, nowIso } from './admin-db.js';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const RELATED_TYPES = new Set(['general', 'quote', 'order', 'customer']);
const ALERT_THRESHOLDS = [
    { name: 'warning', field: 'warnBytes' },
    { name: 'critical', field: 'criticalBytes' },
    { name: 'blocked', field: 'blockBytes' }
];
const ALLOWED_EXTENSIONS = new Set([
    '.3mf',
    '.csv',
    '.doc',
    '.docx',
    '.gif',
    '.jpeg',
    '.jpg',
    '.obj',
    '.pdf',
    '.png',
    '.stl',
    '.step',
    '.stp',
    '.txt',
    '.webp',
    '.xls',
    '.xlsx',
    '.zip'
]);

function clampInteger(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        return fallback;
    }

    return Math.floor(number);
}

export function getMonthKey(date = new Date()) {
    return date.toISOString().slice(0, 7);
}

export function bytesToGb(bytes) {
    return bytes / (1024 * 1024 * 1024);
}

export function isValidSha256(value) {
    return /^[a-f0-9]{64}$/i.test(String(value || '').trim());
}

export function sanitizeFilename(filename) {
    const cleaned = String(filename || 'archivo')
        .trim()
        .replace(/[/\\]/g, '-')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return cleaned || 'archivo';
}

export function getFileExtension(filename) {
    const match = String(filename || '').toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : '';
}

export function isAllowedUpload(filename) {
    return ALLOWED_EXTENSIONS.has(getFileExtension(filename));
}

export function normalizeFileMetadata(input) {
    const filename = sanitizeFilename(input.filename || 'archivo');
    const contentType = String(input.contentType || input.type || 'application/octet-stream').trim().slice(0, 140);
    const sha256 = String(input.sha256 || '').trim().toLowerCase();
    const sizeBytes = clampInteger(input.sizeBytes ?? input.size);
    const relatedTypeInput = String(input.relatedType || '').trim().toLowerCase();
    const relatedType = RELATED_TYPES.has(relatedTypeInput) ? relatedTypeInput : 'general';
    const relatedId = String(input.relatedId || '').trim().slice(0, 80);
    const label = String(input.label || '').trim().slice(0, 140);

    return {
        filename,
        contentType: contentType || 'application/octet-stream',
        sha256,
        sizeBytes,
        relatedType,
        relatedId,
        label
    };
}

export function storageKeyForFile(file) {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const extension = getFileExtension(file.filename);
    const baseName = file.filename.replace(/\.[^.]+$/, '').slice(0, 70) || 'archivo';

    return `uploads/${year}/${month}/${file.sha256.slice(0, 16)}-${baseName}${extension}`;
}

export function validateFileMetadata(file) {
    if (!file.filename) {
        return 'missing_filename';
    }

    if (!isAllowedUpload(file.filename)) {
        return 'unsupported_file_type';
    }

    if (!isValidSha256(file.sha256)) {
        return 'invalid_sha256';
    }

    if (!file.sizeBytes) {
        return 'invalid_size';
    }

    if (file.sizeBytes > MAX_UPLOAD_BYTES) {
        return 'file_too_large';
    }

    return null;
}

async function readUsageAggregate(db) {
    const row = await db.prepare(`
        SELECT
            COALESCE(SUM(size_bytes), 0) AS bytes_stored,
            COUNT(*) AS file_objects
        FROM file_objects
    `).first();

    return {
        bytesStored: clampInteger(row ? row.bytes_stored : 0),
        fileObjects: clampInteger(row ? row.file_objects : 0)
    };
}

async function readMonthlyUsage(db, monthKey) {
    const row = await db.prepare(`
        SELECT *
        FROM storage_usage_monthly
        WHERE month_key = ?
    `).bind(monthKey).first();

    return {
        monthKey,
        uploads: clampInteger(row ? row.uploads : 0),
        duplicateUploads: clampInteger(row ? row.duplicate_uploads : 0),
        downloads: clampInteger(row ? row.downloads : 0),
        deletes: clampInteger(row ? row.deletes : 0),
        classAOps: clampInteger(row ? row.class_a_ops : 0),
        classBOps: clampInteger(row ? row.class_b_ops : 0),
        updatedAt: row ? row.updated_at : null
    };
}

export async function getStorageLimits(db) {
    const row = await db.prepare(`
        SELECT warn_bytes, critical_bytes, block_bytes
        FROM storage_limits
        WHERE id = 1
    `).first();

    return {
        warnBytes: clampInteger(row ? row.warn_bytes : STORAGE_LIMITS.warnBytes, STORAGE_LIMITS.warnBytes),
        criticalBytes: clampInteger(row ? row.critical_bytes : STORAGE_LIMITS.criticalBytes, STORAGE_LIMITS.criticalBytes),
        blockBytes: clampInteger(row ? row.block_bytes : STORAGE_LIMITS.blockBytes, STORAGE_LIMITS.blockBytes)
    };
}

export function getStorageStatus(bytesStored, limits) {
    let state = 'normal';

    if (bytesStored >= limits.blockBytes) {
        state = 'blocked';
    } else if (bytesStored >= limits.criticalBytes) {
        state = 'critical';
    } else if (bytesStored >= limits.warnBytes) {
        state = 'warning';
    }

    return {
        state,
        percentage: limits.blockBytes ? Math.min((bytesStored / limits.blockBytes) * 100, 100) : 0,
        remainingBytes: Math.max(limits.blockBytes - bytesStored, 0),
        canUpload: state !== 'blocked'
    };
}

export async function getStorageUsage(db) {
    const monthKey = getMonthKey();
    const aggregate = await readUsageAggregate(db);
    const counters = await readMonthlyUsage(db, monthKey);
    const limits = await getStorageLimits(db);
    const status = getStorageStatus(aggregate.bytesStored, limits);

    return {
        monthKey,
        bytesStored: aggregate.bytesStored,
        fileObjects: aggregate.fileObjects,
        uploads: counters.uploads,
        duplicateUploads: counters.duplicateUploads,
        downloads: counters.downloads,
        deletes: counters.deletes,
        classAOps: counters.classAOps,
        classBOps: counters.classBOps,
        updatedAt: counters.updatedAt,
        limits,
        status
    };
}

export async function updateMonthlyUsage(db, increments = {}) {
    const monthKey = getMonthKey();
    const timestamp = nowIso();
    const aggregate = await readUsageAggregate(db);

    await db.prepare(`
        INSERT INTO storage_usage_monthly (
            month_key,
            bytes_stored,
            file_objects,
            uploads,
            duplicate_uploads,
            downloads,
            deletes,
            class_a_ops,
            class_b_ops,
            updated_at
        )
        VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, ?)
        ON CONFLICT(month_key) DO NOTHING
    `).bind(monthKey, aggregate.bytesStored, aggregate.fileObjects, timestamp).run();

    await db.prepare(`
        UPDATE storage_usage_monthly
        SET
            bytes_stored = ?,
            file_objects = ?,
            uploads = uploads + ?,
            duplicate_uploads = duplicate_uploads + ?,
            downloads = downloads + ?,
            deletes = deletes + ?,
            class_a_ops = class_a_ops + ?,
            class_b_ops = class_b_ops + ?,
            updated_at = ?
        WHERE month_key = ?
    `).bind(
        aggregate.bytesStored,
        aggregate.fileObjects,
        clampInteger(increments.uploads),
        clampInteger(increments.duplicateUploads),
        clampInteger(increments.downloads),
        clampInteger(increments.deletes),
        clampInteger(increments.classAOps),
        clampInteger(increments.classBOps),
        timestamp,
        monthKey
    ).run();

    return getStorageUsage(db);
}

export async function readRecentAlerts(db, monthKey = getMonthKey()) {
    const rows = await db.prepare(`
        SELECT month_key, threshold, bytes_stored, channel, sent_at
        FROM storage_alerts
        WHERE month_key = ?
        ORDER BY sent_at DESC, id DESC
        LIMIT 20
    `).bind(monthKey).all();

    return (rows.results || []).map((row) => ({
        monthKey: row.month_key,
        threshold: row.threshold,
        bytesStored: clampInteger(row.bytes_stored),
        channel: row.channel,
        sentAt: row.sent_at
    }));
}

async function insertAlert(db, monthKey, threshold, bytesStored, channel) {
    const timestamp = nowIso();
    const result = await db.prepare(`
        INSERT OR IGNORE INTO storage_alerts (month_key, threshold, bytes_stored, channel, sent_at)
        VALUES (?, ?, ?, ?, ?)
    `).bind(monthKey, threshold, bytesStored, channel, timestamp).run();

    return Boolean(result.meta && result.meta.changes);
}

async function sendAlertWebhook(env, payload) {
    const endpoint = env.STORAGE_ALERT_WEBHOOK_URL || env.STORAGE_ALERT_EMAIL_ENDPOINT;

    if (!endpoint) {
        return { configured: false, sent: false };
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        return {
            configured: true,
            sent: response.ok,
            status: response.status
        };
    } catch (error) {
        return {
            configured: true,
            sent: false,
            error: error && error.message ? error.message : 'webhook_failed'
        };
    }
}

function hasAlertWebhook(env) {
    return Boolean(env.STORAGE_ALERT_WEBHOOK_URL || env.STORAGE_ALERT_EMAIL_ENDPOINT);
}

export async function recordStorageAlerts(db, env, usage) {
    const created = [];

    for (const threshold of ALERT_THRESHOLDS) {
        const thresholdBytes = usage.limits[threshold.field];
        if (usage.bytesStored < thresholdBytes) {
            continue;
        }

        const adminCreated = await insertAlert(db, usage.monthKey, threshold.name, usage.bytesStored, 'admin');
        if (adminCreated) {
            created.push({ threshold: threshold.name, channel: 'admin' });
        }

        if (hasAlertWebhook(env)) {
            const emailCreated = await insertAlert(db, usage.monthKey, threshold.name, usage.bytesStored, 'email');
            if (!emailCreated) {
                continue;
            }

            const webhook = await sendAlertWebhook(env, {
                type: 'storage_alert',
                threshold: threshold.name,
                monthKey: usage.monthKey,
                bytesStored: usage.bytesStored,
                gbStored: Number(bytesToGb(usage.bytesStored).toFixed(3)),
                limitGb: Number(bytesToGb(usage.limits.blockBytes).toFixed(3)),
                status: usage.status.state,
                generatedAt: nowIso()
            });
            created.push({ threshold: threshold.name, channel: 'email', webhook });
        }
    }

    return created;
}

export function rowToFileObject(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        sha256: row.sha256,
        storageKey: row.storage_key,
        filename: row.filename,
        contentType: row.content_type,
        sizeBytes: clampInteger(row.size_bytes),
        storageProvider: row.storage_provider,
        uploadCount: clampInteger(row.upload_count),
        downloadCount: clampInteger(row.download_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function findFileByHash(db, sha256) {
    const row = await db.prepare(`
        SELECT *
        FROM file_objects
        WHERE sha256 = ?
    `).bind(sha256).first();

    return rowToFileObject(row);
}

export async function createOrGetFileLink(db, fileObjectId, file) {
    const timestamp = nowIso();

    await db.prepare(`
        INSERT OR IGNORE INTO file_links (
            file_object_id,
            related_type,
            related_id,
            label,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
    `).bind(fileObjectId, file.relatedType, file.relatedId, file.label, timestamp).run();

    const link = await db.prepare(`
        SELECT id, file_object_id, related_type, related_id, label, created_at
        FROM file_links
        WHERE file_object_id = ?
            AND related_type = ?
            AND related_id = ?
            AND label = ?
        ORDER BY id DESC
        LIMIT 1
    `).bind(fileObjectId, file.relatedType, file.relatedId, file.label).first();

    return {
        id: link.id,
        fileObjectId: link.file_object_id,
        relatedType: link.related_type,
        relatedId: link.related_id,
        label: link.label,
        createdAt: link.created_at
    };
}
