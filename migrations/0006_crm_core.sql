CREATE TABLE IF NOT EXISTS crm_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'lead',
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL DEFAULT 'web',
    source TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'lead',
    tags TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    last_contact_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    title TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'new',
    value REAL NOT NULL DEFAULT 0,
    probability REAL NOT NULL DEFAULT 0,
    quote_id INTEGER,
    due_date TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    deal_id INTEGER,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'follow_up',
    due_date TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    notes TEXT NOT NULL DEFAULT '',
    completed_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    deal_id INTEGER,
    type TEXT NOT NULL DEFAULT 'note',
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_search ON crm_contacts(name, company, email, phone);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status_due ON crm_tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact ON crm_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created ON crm_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id);
