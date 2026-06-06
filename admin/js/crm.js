const CRM_STAGES = [
    { code: 'new', label: 'Nuevo' },
    { code: 'contacted', label: 'Contactado' },
    { code: 'quoting', label: 'Cotizando' },
    { code: 'approved', label: 'Aceptado' },
    { code: 'production', label: 'En proceso' },
    { code: 'won', label: 'Venta' },
    { code: 'lost', label: 'Perdido' }
];

const state = {
    dashboard: null,
    contacts: [],
    deals: [],
    tasks: [],
    activities: []
};

function byId(id) {
    return document.getElementById(id);
}

function escapeHtml(input) {
    return String(input || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function dateLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleDateString('es-MX', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formObject(form) {
    const data = new FormData(form);
    const value = {};
    data.forEach((fieldValue, key) => {
        value[key] = fieldValue;
    });
    return value;
}

function priorityLabel(priority) {
    const labels = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return labels[priority] || 'Media';
}

function stageLabel(stage) {
    return (CRM_STAGES.find((item) => item.code === stage) || CRM_STAGES[0]).label;
}

function renderMetrics(dashboard) {
    const stats = dashboard && dashboard.stats ? dashboard.stats : {};
    byId('kpiContacts').textContent = String(stats.totalContacts || 0);
    byId('kpiLeads').textContent = `${stats.leads || 0} leads`;
    byId('kpiDeals').textContent = String(stats.openDeals || 0);
    byId('kpiPipeline').textContent = `${AdminStorage.money(stats.openValue || 0)} pipeline`;
    byId('kpiQuotes').textContent = String(stats.totalQuotes || 0);
    byId('kpiAccepted').textContent = `${stats.acceptedQuotes || 0} aceptadas`;
    byId('kpiTasks').textContent = String(stats.openTasks || 0);
    byId('kpiDue').textContent = `${stats.dueTasks || 0} vencidas`;
    byId('kpiWon').textContent = AdminStorage.money(stats.wonValue || 0);
    byId('kpiWonCount').textContent = `${stats.wonDeals || 0} cierres`;
}

function renderStageOptions(select, selected = '') {
    select.innerHTML = CRM_STAGES.map((stage) => `
        <option value="${stage.code}" ${stage.code === selected ? 'selected' : ''}>${escapeHtml(stage.label)}</option>
    `).join('');
}

function renderContactOptions() {
    const options = '<option value="">Sin contacto</option>' + state.contacts.map((contact) => `
        <option value="${contact.id}">${escapeHtml(contact.name)}${contact.company ? ` · ${escapeHtml(contact.company)}` : ''}</option>
    `).join('');

    ['dealContactSelect', 'taskContactSelect', 'activityContactSelect'].forEach((id) => {
        const select = byId(id);
        if (select) select.innerHTML = options;
    });
}

function renderDealOptions() {
    const options = '<option value="">Sin oportunidad</option>' + state.deals.map((deal) => `
        <option value="${deal.id}">${escapeHtml(deal.title)}</option>
    `).join('');

    ['taskDealSelect', 'activityDealSelect'].forEach((id) => {
        const select = byId(id);
        if (select) select.innerHTML = options;
    });
}

function renderPipeline() {
    const board = byId('pipelineBoard');
    const grouped = CRM_STAGES.map((stage) => ({
        ...stage,
        deals: state.deals.filter((deal) => deal.stage === stage.code)
    }));

    board.innerHTML = grouped.map((stage) => `
        <section class="pipeline-column" data-stage="${stage.code}">
            <header>
                <strong>${escapeHtml(stage.label)}</strong>
                <span>${stage.deals.length}</span>
            </header>
            <div class="pipeline-stack">
                ${stage.deals.map((deal) => `
                    <article class="deal-card" data-id="${deal.id}">
                        <div class="deal-card-head">
                            <strong>${escapeHtml(deal.title)}</strong>
                            <span class="pill priority-${escapeHtml(deal.priority)}">${priorityLabel(deal.priority)}</span>
                        </div>
                        <p>${escapeHtml(deal.contactName || 'Sin contacto')}</p>
                        <div class="deal-meta">
                            <span>${AdminStorage.money(deal.value || 0)}</span>
                            <span>${deal.probability || 0}%</span>
                            <span>${dateLabel(deal.dueDate)}</span>
                        </div>
                        <select class="deal-stage-select" data-id="${deal.id}">
                            ${CRM_STAGES.map((item) => `<option value="${item.code}" ${item.code === deal.stage ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
                        </select>
                    </article>
                `).join('') || '<p class="empty-state">Sin oportunidades.</p>'}
            </div>
        </section>
    `).join('');
}

function renderContacts() {
    const list = byId('contactList');
    if (!state.contacts.length) {
        list.innerHTML = '<p class="empty-state">Aun no hay contactos.</p>';
        renderContactOptions();
        return;
    }

    list.innerHTML = state.contacts.map((contact) => `
        <article class="crm-row contact-row" data-id="${contact.id}">
            <div>
                <strong>${escapeHtml(contact.name)}</strong>
                <span>${escapeHtml(contact.company || contact.channel || 'Sin empresa')}</span>
            </div>
            <div>
                <span>${escapeHtml(contact.phone || 'Sin telefono')}</span>
                <span>${escapeHtml(contact.email || 'Sin email')}</span>
            </div>
            <div>
                <span>${escapeHtml(contact.tags || contact.source || '')}</span>
                <span>${contact.lastContactAt ? `Ultimo contacto ${dateLabel(contact.lastContactAt)}` : 'Sin contacto reciente'}</span>
            </div>
            <select class="contact-status-select" data-id="${contact.id}">
                <option value="lead" ${contact.status === 'lead' ? 'selected' : ''}>Lead</option>
                <option value="active" ${contact.status === 'active' ? 'selected' : ''}>Activo</option>
                <option value="inactive" ${contact.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
            </select>
        </article>
    `).join('');

    renderContactOptions();
}

function renderTasks() {
    const list = byId('taskList');
    if (!state.tasks.length) {
        list.innerHTML = '<p class="empty-state">Sin tareas abiertas.</p>';
        return;
    }

    list.innerHTML = state.tasks.map((task) => `
        <article class="crm-row task-row ${task.status === 'done' ? 'is-done' : ''}" data-id="${task.id}">
            <label class="task-toggle">
                <input type="checkbox" class="task-status-toggle" data-id="${task.id}" ${task.status === 'done' ? 'checked' : ''}>
                <span>${escapeHtml(task.title)}</span>
            </label>
            <div>
                <span>${escapeHtml(task.contactName || task.dealTitle || 'Sin relacion')}</span>
                <span>${task.dueDate ? `Vence ${dateLabel(task.dueDate)}` : 'Sin fecha'}</span>
            </div>
            <span class="pill priority-${escapeHtml(task.priority)}">${priorityLabel(task.priority)}</span>
        </article>
    `).join('');
}

function renderActivities() {
    const list = byId('activityList');
    if (!state.activities.length) {
        list.innerHTML = '<p class="empty-state">Sin actividad registrada.</p>';
        return;
    }

    list.innerHTML = state.activities.map((activity) => `
        <article class="activity-item">
            <span>${dateLabel(activity.createdAt)}</span>
            <strong>${escapeHtml(activity.subject || activity.type)}</strong>
            <p>${escapeHtml(activity.contactName || activity.dealTitle || 'General')}</p>
            ${activity.body ? `<small>${escapeHtml(activity.body)}</small>` : ''}
        </article>
    `).join('');
}

function renderAll() {
    if (state.dashboard) renderMetrics(state.dashboard);
    renderPipeline();
    renderContacts();
    renderDealOptions();
    renderTasks();
    renderActivities();
}

async function loadCrm() {
    const [dashboard, contacts, deals, tasks, activities] = await Promise.all([
        AdminStorage.getCrmDashboard(),
        AdminStorage.listCrmContacts({
            q: byId('contactSearch') ? byId('contactSearch').value : '',
            status: byId('contactStatusFilter') ? byId('contactStatusFilter').value : '',
            limit: 80
        }),
        AdminStorage.listCrmDeals({ limit: 120 }),
        AdminStorage.listCrmTasks({ status: 'open', limit: 80 }),
        AdminStorage.listCrmActivities({ limit: 60 })
    ]);

    if (dashboard.ok) state.dashboard = dashboard.dashboard;
    if (contacts.ok) state.contacts = contacts.contacts || [];
    if (deals.ok) state.deals = deals.deals || [];
    if (tasks.ok) state.tasks = tasks.tasks || [];
    if (activities.ok) state.activities = activities.activities || [];

    renderAll();
}

async function refreshAndStatus(element, message) {
    await loadCrm();
    AdminStorage.setStatus(element, message, 'success');
}

document.addEventListener('DOMContentLoaded', async () => {
    renderStageOptions(byId('dealStageSelect'), 'new');
    await loadCrm();

    byId('refreshCrm').addEventListener('click', loadCrm);

    let searchTimeout = null;
    byId('contactSearch').addEventListener('input', () => {
        window.clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(loadCrm, 250);
    });
    byId('contactStatusFilter').addEventListener('change', loadCrm);

    byId('contactForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await AdminStorage.createCrmContact(formObject(event.target));
        if (response.ok) {
            event.target.reset();
            await refreshAndStatus(byId('contactStatus'), 'Contacto guardado en D1.');
        } else {
            AdminStorage.setStatus(byId('contactStatus'), response.message || 'No se pudo guardar contacto.', 'error');
        }
    });

    byId('dealForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = formObject(event.target);
        const response = await AdminStorage.createCrmDeal(data);
        if (response.ok) {
            event.target.reset();
            renderStageOptions(byId('dealStageSelect'), 'new');
            await refreshAndStatus(byId('dealStatus'), 'Oportunidad guardada en D1.');
        } else {
            AdminStorage.setStatus(byId('dealStatus'), response.message || 'No se pudo guardar oportunidad.', 'error');
        }
    });

    byId('taskForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await AdminStorage.createCrmTask(formObject(event.target));
        if (response.ok) {
            event.target.reset();
            await refreshAndStatus(byId('taskStatus'), 'Tarea guardada en D1.');
        } else {
            AdminStorage.setStatus(byId('taskStatus'), response.message || 'No se pudo guardar tarea.', 'error');
        }
    });

    byId('activityForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await AdminStorage.createCrmActivity(formObject(event.target));
        if (response.ok) {
            event.target.reset();
            await refreshAndStatus(byId('activityStatus'), 'Actividad registrada en D1.');
        } else {
            AdminStorage.setStatus(byId('activityStatus'), response.message || 'No se pudo registrar actividad.', 'error');
        }
    });

    byId('pipelineBoard').addEventListener('change', async (event) => {
        const select = event.target.closest('.deal-stage-select');
        if (!select) return;
        const deal = state.deals.find((item) => String(item.id) === String(select.dataset.id));
        if (!deal) return;
        const response = await AdminStorage.updateCrmDeal(deal.id, { ...deal, stage: select.value });
        if (response.ok) {
            await loadCrm();
        }
    });

    byId('contactList').addEventListener('change', async (event) => {
        const select = event.target.closest('.contact-status-select');
        if (!select) return;
        const contact = state.contacts.find((item) => String(item.id) === String(select.dataset.id));
        if (!contact) return;
        const response = await AdminStorage.updateCrmContact(contact.id, { ...contact, status: select.value });
        if (response.ok) {
            await loadCrm();
        }
    });

    byId('taskList').addEventListener('change', async (event) => {
        const checkbox = event.target.closest('.task-status-toggle');
        if (!checkbox) return;
        const task = state.tasks.find((item) => String(item.id) === String(checkbox.dataset.id));
        if (!task) return;
        const response = await AdminStorage.updateCrmTask(task.id, {
            ...task,
            status: checkbox.checked ? 'done' : 'open'
        });
        if (response.ok) {
            await loadCrm();
        }
    });
});
