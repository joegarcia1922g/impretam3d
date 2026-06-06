import { nowIso, toBooleanInteger, toNumber } from './admin-db.js';

export const CRM_STAGES = [
    { code: 'new', label: 'Nuevo', order: 10 },
    { code: 'contacted', label: 'Contactado', order: 20 },
    { code: 'quoting', label: 'Cotizando', order: 30 },
    { code: 'approved', label: 'Aceptado', order: 40 },
    { code: 'production', label: 'En proceso', order: 50 },
    { code: 'won', label: 'Venta', order: 60 },
    { code: 'lost', label: 'Perdido', order: 70 }
];

const CONTACT_STATUSES = new Set(['lead', 'active', 'inactive']);
const DEAL_STAGES = new Set(CRM_STAGES.map((stage) => stage.code));
const TASK_STATUSES = new Set(['open', 'done']);
const PRIORITIES = new Set(['low', 'medium', 'high']);

function cleanText(value, fallback = '') {
    return String(value || '').trim() || fallback;
}

function cleanEnum(value, allowed, fallback) {
    const nextValue = cleanText(value).toLowerCase();
    return allowed.has(nextValue) ? nextValue : fallback;
}

function readPositiveInteger(value, fallback = null) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function cleanDate(value) {
    return cleanText(value).slice(0, 40);
}

function rowToContact(row) {
    return {
        id: row.id,
        type: row.type || 'lead',
        name: row.name,
        company: row.company || '',
        email: row.email || '',
        phone: row.phone || '',
        channel: row.channel || '',
        source: row.source || '',
        status: row.status || 'lead',
        tags: row.tags || '',
        notes: row.notes || '',
        lastContactAt: row.last_contact_at || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function rowToDeal(row) {
    return {
        id: row.id,
        contactId: row.contact_id || null,
        contactName: row.contact_name || '',
        contactPhone: row.contact_phone || '',
        title: row.title,
        stage: row.stage || 'new',
        value: toNumber(row.value),
        probability: toNumber(row.probability),
        quoteId: row.quote_id || null,
        quoteNumber: row.quote_number || '',
        dueDate: row.due_date || '',
        priority: row.priority || 'medium',
        notes: row.notes || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function rowToTask(row) {
    return {
        id: row.id,
        contactId: row.contact_id || null,
        dealId: row.deal_id || null,
        contactName: row.contact_name || '',
        dealTitle: row.deal_title || '',
        title: row.title,
        type: row.type || 'follow_up',
        dueDate: row.due_date || '',
        status: row.status || 'open',
        priority: row.priority || 'medium',
        notes: row.notes || '',
        completedAt: row.completed_at || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function rowToActivity(row) {
    return {
        id: row.id,
        contactId: row.contact_id || null,
        dealId: row.deal_id || null,
        contactName: row.contact_name || '',
        dealTitle: row.deal_title || '',
        type: row.type || 'note',
        subject: row.subject || '',
        body: row.body || '',
        createdAt: row.created_at
    };
}

function normalizeContact(input = {}) {
    return {
        type: cleanEnum(input.type, new Set(['lead', 'customer', 'partner']), 'lead'),
        name: cleanText(input.name, 'Cliente sin nombre').slice(0, 140),
        company: cleanText(input.company).slice(0, 140),
        email: cleanText(input.email).toLowerCase().slice(0, 180),
        phone: cleanText(input.phone).slice(0, 80),
        channel: cleanText(input.channel, 'web').slice(0, 80),
        source: cleanText(input.source).slice(0, 120),
        status: cleanEnum(input.status, CONTACT_STATUSES, 'lead'),
        tags: cleanText(input.tags).slice(0, 240),
        notes: cleanText(input.notes).slice(0, 2000),
        lastContactAt: cleanDate(input.lastContactAt || input.last_contact_at)
    };
}

function normalizeDeal(input = {}) {
    return {
        contactId: readPositiveInteger(input.contactId || input.contact_id),
        title: cleanText(input.title, 'Oportunidad sin titulo').slice(0, 180),
        stage: cleanEnum(input.stage, DEAL_STAGES, 'new'),
        value: Math.max(toNumber(input.value), 0),
        probability: Math.max(0, Math.min(toNumber(input.probability), 100)),
        quoteId: readPositiveInteger(input.quoteId || input.quote_id),
        dueDate: cleanDate(input.dueDate || input.due_date),
        priority: cleanEnum(input.priority, PRIORITIES, 'medium'),
        notes: cleanText(input.notes).slice(0, 2000)
    };
}

function normalizeTask(input = {}) {
    const status = cleanEnum(input.status, TASK_STATUSES, 'open');
    return {
        contactId: readPositiveInteger(input.contactId || input.contact_id),
        dealId: readPositiveInteger(input.dealId || input.deal_id),
        title: cleanText(input.title, 'Seguimiento').slice(0, 180),
        type: cleanText(input.type, 'follow_up').slice(0, 80),
        dueDate: cleanDate(input.dueDate || input.due_date),
        status,
        priority: cleanEnum(input.priority, PRIORITIES, 'medium'),
        notes: cleanText(input.notes).slice(0, 1600),
        completedAt: status === 'done' ? cleanDate(input.completedAt || input.completed_at || nowIso()) : ''
    };
}

function normalizeActivity(input = {}) {
    return {
        contactId: readPositiveInteger(input.contactId || input.contact_id),
        dealId: readPositiveInteger(input.dealId || input.deal_id),
        type: cleanText(input.type, 'note').slice(0, 80),
        subject: cleanText(input.subject, 'Nota').slice(0, 180),
        body: cleanText(input.body).slice(0, 2400)
    };
}

export async function getCrmDashboard(db) {
    const [contactStats, dealStats, taskStats, quoteStats, stageRows, recentContacts, recentDeals, upcomingTasks, recentActivities, recentQuotes] = await Promise.all([
        db.prepare(`
            SELECT
                COUNT(*) AS total_contacts,
                SUM(CASE WHEN status = 'lead' THEN 1 ELSE 0 END) AS leads,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_contacts
            FROM crm_contacts
        `).first(),
        db.prepare(`
            SELECT
                COUNT(*) AS total_deals,
                SUM(CASE WHEN stage NOT IN ('won', 'lost') THEN 1 ELSE 0 END) AS open_deals,
                SUM(CASE WHEN stage NOT IN ('won', 'lost') THEN value ELSE 0 END) AS open_value,
                SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) AS won_deals,
                SUM(CASE WHEN stage = 'won' THEN value ELSE 0 END) AS won_value
            FROM crm_deals
        `).first(),
        db.prepare(`
            SELECT
                COUNT(*) AS total_tasks,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_tasks,
                SUM(CASE WHEN status = 'open' AND due_date <> '' AND due_date <= date('now') THEN 1 ELSE 0 END) AS due_tasks
            FROM crm_tasks
        `).first(),
        db.prepare(`
            SELECT
                COUNT(*) AS total_quotes,
                SUM(CASE WHEN status IN ('accepted', 'approved') THEN 1 ELSE 0 END) AS accepted_quotes,
                SUM(CASE WHEN status IN ('in_process', 'production') THEN 1 ELSE 0 END) AS process_quotes,
                SUM(CASE WHEN status IN ('sold', 'won') THEN 1 ELSE 0 END) AS sold_quotes,
                SUM(CASE WHEN status IN ('accepted', 'approved', 'in_process', 'production', 'sold', 'won') THEN final_price ELSE 0 END) AS quote_value
            FROM quotes
        `).first(),
        db.prepare(`
            SELECT stage, COUNT(*) AS count, SUM(value) AS value
            FROM crm_deals
            GROUP BY stage
        `).all(),
        db.prepare(`
            SELECT *
            FROM crm_contacts
            ORDER BY updated_at DESC, id DESC
            LIMIT 8
        `).all(),
        db.prepare(`
            SELECT d.*, c.name AS contact_name, c.phone AS contact_phone, q.quote_number
            FROM crm_deals d
            LEFT JOIN crm_contacts c ON c.id = d.contact_id
            LEFT JOIN quotes q ON q.id = d.quote_id
            ORDER BY d.updated_at DESC, d.id DESC
            LIMIT 12
        `).all(),
        db.prepare(`
            SELECT t.*, c.name AS contact_name, d.title AS deal_title
            FROM crm_tasks t
            LEFT JOIN crm_contacts c ON c.id = t.contact_id
            LEFT JOIN crm_deals d ON d.id = t.deal_id
            WHERE t.status = 'open'
            ORDER BY
                CASE WHEN t.due_date = '' THEN 1 ELSE 0 END,
                t.due_date ASC,
                t.id DESC
            LIMIT 12
        `).all(),
        db.prepare(`
            SELECT a.*, c.name AS contact_name, d.title AS deal_title
            FROM crm_activities a
            LEFT JOIN crm_contacts c ON c.id = a.contact_id
            LEFT JOIN crm_deals d ON d.id = a.deal_id
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT 14
        `).all(),
        db.prepare(`
            SELECT id, quote_number, customer_name, status, final_price, created_at
            FROM quotes
            ORDER BY created_at DESC, id DESC
            LIMIT 8
        `).all()
    ]);

    const stages = CRM_STAGES.map((stage) => {
        const row = (stageRows.results || []).find((item) => item.stage === stage.code);
        return {
            ...stage,
            count: row ? Number(row.count || 0) : 0,
            value: row ? toNumber(row.value) : 0
        };
    });

    return {
        stats: {
            totalContacts: Number(contactStats.total_contacts || 0),
            leads: Number(contactStats.leads || 0),
            activeContacts: Number(contactStats.active_contacts || 0),
            totalDeals: Number(dealStats.total_deals || 0),
            openDeals: Number(dealStats.open_deals || 0),
            openValue: toNumber(dealStats.open_value),
            wonDeals: Number(dealStats.won_deals || 0),
            wonValue: toNumber(dealStats.won_value),
            openTasks: Number(taskStats.open_tasks || 0),
            dueTasks: Number(taskStats.due_tasks || 0),
            totalQuotes: Number(quoteStats.total_quotes || 0),
            acceptedQuotes: Number(quoteStats.accepted_quotes || 0),
            processQuotes: Number(quoteStats.process_quotes || 0),
            soldQuotes: Number(quoteStats.sold_quotes || 0),
            quoteValue: toNumber(quoteStats.quote_value)
        },
        stages,
        recentContacts: (recentContacts.results || []).map(rowToContact),
        recentDeals: (recentDeals.results || []).map(rowToDeal),
        upcomingTasks: (upcomingTasks.results || []).map(rowToTask),
        recentActivities: (recentActivities.results || []).map(rowToActivity),
        recentQuotes: recentQuotes.results || []
    };
}

export async function listContacts(db, request) {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '60', 10), 1), 150);
    const query = `%${cleanText(url.searchParams.get('q')).replace(/[%_]/g, '')}%`;
    const status = cleanText(url.searchParams.get('status'));
    const hasQuery = query.length > 2;
    const where = [];
    const binds = [];

    if (hasQuery) {
        where.push('(name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ? OR tags LIKE ?)');
        binds.push(query, query, query, query, query);
    }

    if (CONTACT_STATUSES.has(status)) {
        where.push('status = ?');
        binds.push(status);
    }

    const rows = await db.prepare(`
        SELECT *
        FROM crm_contacts
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY updated_at DESC, id DESC
        LIMIT ?
    `).bind(...binds, limit).all();

    return (rows.results || []).map(rowToContact);
}

export async function upsertContact(db, input, id = null) {
    const contact = normalizeContact(input);
    const timestamp = nowIso();

    if (id) {
        await db.prepare(`
            UPDATE crm_contacts
            SET type = ?, name = ?, company = ?, email = ?, phone = ?, channel = ?, source = ?,
                status = ?, tags = ?, notes = ?, last_contact_at = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            contact.type,
            contact.name,
            contact.company,
            contact.email,
            contact.phone,
            contact.channel,
            contact.source,
            contact.status,
            contact.tags,
            contact.notes,
            contact.lastContactAt,
            timestamp,
            id
        ).run();
    } else {
        const result = await db.prepare(`
            INSERT INTO crm_contacts (
                type, name, company, email, phone, channel, source, status, tags, notes,
                last_contact_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            contact.type,
            contact.name,
            contact.company,
            contact.email,
            contact.phone,
            contact.channel,
            contact.source,
            contact.status,
            contact.tags,
            contact.notes,
            contact.lastContactAt,
            timestamp,
            timestamp
        ).run();
        id = result.meta.last_row_id;
    }

    const row = await db.prepare('SELECT * FROM crm_contacts WHERE id = ?').bind(id).first();
    return rowToContact(row);
}

export async function listDeals(db, request) {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '80', 10), 1), 200);
    const stage = cleanText(url.searchParams.get('stage'));
    const where = [];
    const binds = [];

    if (DEAL_STAGES.has(stage)) {
        where.push('d.stage = ?');
        binds.push(stage);
    }

    const rows = await db.prepare(`
        SELECT d.*, c.name AS contact_name, c.phone AS contact_phone, q.quote_number
        FROM crm_deals d
        LEFT JOIN crm_contacts c ON c.id = d.contact_id
        LEFT JOIN quotes q ON q.id = d.quote_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY
            CASE d.stage
                WHEN 'new' THEN 1
                WHEN 'contacted' THEN 2
                WHEN 'quoting' THEN 3
                WHEN 'approved' THEN 4
                WHEN 'production' THEN 5
                WHEN 'won' THEN 6
                ELSE 7
            END,
            d.updated_at DESC,
            d.id DESC
        LIMIT ?
    `).bind(...binds, limit).all();

    return (rows.results || []).map(rowToDeal);
}

export async function upsertDeal(db, input, id = null) {
    const deal = normalizeDeal(input);
    const timestamp = nowIso();

    if (id) {
        await db.prepare(`
            UPDATE crm_deals
            SET contact_id = ?, title = ?, stage = ?, value = ?, probability = ?, quote_id = ?,
                due_date = ?, priority = ?, notes = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            deal.contactId,
            deal.title,
            deal.stage,
            deal.value,
            deal.probability,
            deal.quoteId,
            deal.dueDate,
            deal.priority,
            deal.notes,
            timestamp,
            id
        ).run();
    } else {
        const result = await db.prepare(`
            INSERT INTO crm_deals (
                contact_id, title, stage, value, probability, quote_id, due_date,
                priority, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            deal.contactId,
            deal.title,
            deal.stage,
            deal.value,
            deal.probability,
            deal.quoteId,
            deal.dueDate,
            deal.priority,
            deal.notes,
            timestamp,
            timestamp
        ).run();
        id = result.meta.last_row_id;
    }

    const row = await db.prepare(`
        SELECT d.*, c.name AS contact_name, c.phone AS contact_phone, q.quote_number
        FROM crm_deals d
        LEFT JOIN crm_contacts c ON c.id = d.contact_id
        LEFT JOIN quotes q ON q.id = d.quote_id
        WHERE d.id = ?
    `).bind(id).first();
    return rowToDeal(row);
}

export async function listTasks(db, request) {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '80', 10), 1), 200);
    const status = cleanText(url.searchParams.get('status'));
    const where = [];
    const binds = [];

    if (TASK_STATUSES.has(status)) {
        where.push('t.status = ?');
        binds.push(status);
    }

    const rows = await db.prepare(`
        SELECT t.*, c.name AS contact_name, d.title AS deal_title
        FROM crm_tasks t
        LEFT JOIN crm_contacts c ON c.id = t.contact_id
        LEFT JOIN crm_deals d ON d.id = t.deal_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY
            CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
            CASE WHEN t.due_date = '' THEN 1 ELSE 0 END,
            t.due_date ASC,
            t.updated_at DESC
        LIMIT ?
    `).bind(...binds, limit).all();

    return (rows.results || []).map(rowToTask);
}

export async function upsertTask(db, input, id = null) {
    const task = normalizeTask(input);
    const timestamp = nowIso();

    if (id) {
        await db.prepare(`
            UPDATE crm_tasks
            SET contact_id = ?, deal_id = ?, title = ?, type = ?, due_date = ?, status = ?,
                priority = ?, notes = ?, completed_at = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            task.contactId,
            task.dealId,
            task.title,
            task.type,
            task.dueDate,
            task.status,
            task.priority,
            task.notes,
            task.completedAt,
            timestamp,
            id
        ).run();
    } else {
        const result = await db.prepare(`
            INSERT INTO crm_tasks (
                contact_id, deal_id, title, type, due_date, status, priority, notes,
                completed_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            task.contactId,
            task.dealId,
            task.title,
            task.type,
            task.dueDate,
            task.status,
            task.priority,
            task.notes,
            task.completedAt,
            timestamp,
            timestamp
        ).run();
        id = result.meta.last_row_id;
    }

    const row = await db.prepare(`
        SELECT t.*, c.name AS contact_name, d.title AS deal_title
        FROM crm_tasks t
        LEFT JOIN crm_contacts c ON c.id = t.contact_id
        LEFT JOIN crm_deals d ON d.id = t.deal_id
        WHERE t.id = ?
    `).bind(id).first();
    return rowToTask(row);
}

export async function listActivities(db, request) {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '60', 10), 1), 150);

    const rows = await db.prepare(`
        SELECT a.*, c.name AS contact_name, d.title AS deal_title
        FROM crm_activities a
        LEFT JOIN crm_contacts c ON c.id = a.contact_id
        LEFT JOIN crm_deals d ON d.id = a.deal_id
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ?
    `).bind(limit).all();

    return (rows.results || []).map(rowToActivity);
}

export async function createActivity(db, input) {
    const activity = normalizeActivity(input);
    const timestamp = nowIso();
    const result = await db.prepare(`
        INSERT INTO crm_activities (contact_id, deal_id, type, subject, body, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        activity.contactId,
        activity.dealId,
        activity.type,
        activity.subject,
        activity.body,
        timestamp
    ).run();

    if (activity.contactId) {
        await db.prepare(`
            UPDATE crm_contacts
            SET last_contact_at = ?, updated_at = ?
            WHERE id = ?
        `).bind(timestamp, timestamp, activity.contactId).run();
    }

    const row = await db.prepare(`
        SELECT a.*, c.name AS contact_name, d.title AS deal_title
        FROM crm_activities a
        LEFT JOIN crm_contacts c ON c.id = a.contact_id
        LEFT JOIN crm_deals d ON d.id = a.deal_id
        WHERE a.id = ?
    `).bind(result.meta.last_row_id).first();
    return rowToActivity(row);
}
