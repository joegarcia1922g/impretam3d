document.addEventListener('DOMContentLoaded', async () => {
    const securityStatus = document.getElementById('securityStatus');
    const dashboardStorageStatus = document.getElementById('dashboardStorageStatus');
    const calculatorStatus = document.getElementById('calculatorStatus');
    const contentStatus = document.getElementById('contentStatus');
    const crmStatus = document.getElementById('crmStatus');

    const [calculator, content, storage, crm] = await Promise.all([
        AdminStorage.load('calculatorConfig'),
        AdminStorage.load('siteContent'),
        AdminStorage.getStorageUsage(),
        AdminStorage.getCrmDashboard()
    ]);

    const serviceCount = Array.isArray(content.value.services) ? content.value.services.length : 0;

    document.getElementById('defaultMaterial').textContent = calculator.value.material;
    document.getElementById('defaultMargin').textContent = `${calculator.value.marginPercent}%`;
    document.getElementById('serviceCount').textContent = serviceCount;

    AdminStorage.setStatus(
        calculatorStatus,
        calculator.remote ? `Configuracion de cotizador sincronizada en ${calculator.storage.toUpperCase()}.` : 'Cotizador usando respaldo local hasta configurar D1.',
        calculator.remote ? 'success' : 'warning'
    );

    AdminStorage.setStatus(
        contentStatus,
        content.remote ? `Contenido editable sincronizado en ${content.storage.toUpperCase()}.` : 'Editor usando respaldo local hasta configurar D1.',
        content.remote ? 'success' : 'warning'
    );

    AdminStorage.setStatus(
        securityStatus,
        calculator.remote && content.remote
            ? 'IMPRETAM3D_DB esta respondiendo para el admin.'
            : 'Crea el binding IMPRETAM3D_DB para guardar datos compartidos en Cloudflare D1.',
        calculator.remote && content.remote ? 'success' : 'warning'
    );

    if (crm.ok && crm.dashboard) {
        document.getElementById('crmOpenDeals').textContent = String(crm.dashboard.stats.openDeals || 0);
        document.getElementById('crmOpenTasks').textContent = String(crm.dashboard.stats.openTasks || 0);
        AdminStorage.setStatus(crmStatus, 'CRM sincronizado en D1.', 'success');
    } else {
        AdminStorage.setStatus(crmStatus, crm.message || 'CRM pendiente de sincronizar.', 'warning');
    }

    if (storage.ok && storage.usage) {
        const usage = storage.usage;
        const fill = document.getElementById('dashboardStorageMeterFill');
        const stateLabels = {
            normal: 'Normal',
            warning: 'Advertencia',
            critical: 'Critico',
            blocked: 'Bloqueado'
        };
        const statusTypes = {
            normal: 'success',
            warning: 'warning',
            critical: 'error',
            blocked: 'error'
        };

        document.getElementById('dashboardStorageUsed').textContent = `${AdminStorage.formatBytes(usage.bytesStored)} / ${AdminStorage.formatBytes(usage.limits.blockBytes)}`;
        document.getElementById('dashboardStorageState').textContent = stateLabels[usage.status.state] || 'Sin datos';
        document.getElementById('dashboardStorageDuplicates').textContent = String(usage.duplicateUploads || 0);

        if (fill) {
            fill.style.width = `${Math.max(0, Math.min(usage.status.percentage, 100)).toFixed(2)}%`;
            fill.dataset.state = usage.status.state;
        }

        AdminStorage.setStatus(
            dashboardStorageStatus,
            `${usage.status.percentage.toFixed(1)}% usado del limite preventivo.`,
            statusTypes[usage.status.state] || 'warning'
        );
    } else {
        AdminStorage.setStatus(
            dashboardStorageStatus,
            storage.message || 'Storage R2 pendiente de configurar.',
            'warning'
        );
    }
});
