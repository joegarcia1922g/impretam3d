let services = [];

function fieldValue(id) {
    return document.getElementById(id).value.trim();
}

function numberValue(id) {
    const value = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(value) ? value : 0;
}

function applyContent(content) {
    document.getElementById('heroTitle').value = content.heroTitle || '';
    document.getElementById('heroSubtitle').value = content.heroSubtitle || '';
    document.getElementById('contactCta').value = content.contactCta || '';
    document.getElementById('contactEmail').value = content.contactEmail || '';
    document.getElementById('whatsappNumber').value = content.whatsappNumber || '';
    services = Array.isArray(content.services) ? content.services : [];
    renderServices();
}

function readContent() {
    return {
        heroTitle: fieldValue('heroTitle'),
        heroSubtitle: fieldValue('heroSubtitle'),
        contactCta: fieldValue('contactCta'),
        contactEmail: fieldValue('contactEmail'),
        whatsappNumber: fieldValue('whatsappNumber'),
        services: services.map((service) => ({
            name: service.name.trim(),
            description: service.description.trim(),
            basePrice: Number.isFinite(service.basePrice) ? service.basePrice : 0
        }))
    };
}

function updatePreview() {
    const content = readContent();
    document.getElementById('previewHeroTitle').textContent = content.heroTitle || 'Sin titulo';
    document.getElementById('previewHeroSubtitle').textContent = content.heroSubtitle || 'Sin subtitulo';
    document.getElementById('previewContactCta').textContent = content.contactCta || 'Sin llamada a accion';
    document.getElementById('previewServiceCount').textContent = String(content.services.length);
}

function createInput(labelText, value, onInput, type) {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';

    const label = document.createElement('span');
    label.textContent = labelText;

    const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    if (type && type !== 'textarea') {
        input.type = type;
    }
    input.value = value;
    input.addEventListener('input', (event) => {
        onInput(event.target.value);
        updatePreview();
    });

    wrapper.append(label, input);
    return wrapper;
}

function renderServices() {
    const container = document.getElementById('servicesList');
    container.innerHTML = '';

    services.forEach((service, index) => {
        const row = document.createElement('div');
        row.className = 'service-row';

        row.append(
            createInput('Servicio', service.name || '', (value) => {
                services[index].name = value;
            }),
            createInput('Precio base MXN', service.basePrice || 0, (value) => {
                services[index].basePrice = Number.parseFloat(value) || 0;
            }, 'number'),
            createInput('Descripcion', service.description || '', (value) => {
                services[index].description = value;
            }, 'textarea')
        );

        row.querySelector('.field:last-of-type').classList.add('description');

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'button danger remove';
        removeButton.textContent = 'Quitar';
        removeButton.addEventListener('click', () => {
            services.splice(index, 1);
            renderServices();
            updatePreview();
        });

        row.append(removeButton);
        container.append(row);
    });

    updatePreview();
}

async function saveContent() {
    const status = document.getElementById('editorStatus');
    const result = await AdminStorage.save('siteContent', readContent());

    AdminStorage.setStatus(
        status,
        result.remote ? `Contenido guardado en ${result.storage.toUpperCase()}.` : 'Contenido guardado localmente. Falta configurar D1.',
        result.remote ? 'success' : 'warning'
    );
}

document.addEventListener('DOMContentLoaded', async () => {
    const status = document.getElementById('editorStatus');
    const stored = await AdminStorage.load('siteContent');

    applyContent(stored.value);
    AdminStorage.setStatus(
        status,
        stored.remote ? `Contenido cargado desde ${stored.storage.toUpperCase()}.` : 'Contenido cargado desde respaldo local.',
        stored.remote ? 'success' : 'warning'
    );

    ['heroTitle', 'heroSubtitle', 'contactCta', 'contactEmail', 'whatsappNumber'].forEach((id) => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });

    document.getElementById('addService').addEventListener('click', () => {
        services.push({
            name: 'Nuevo servicio',
            description: '',
            basePrice: 0
        });
        renderServices();
    });

    document.getElementById('saveEditor').addEventListener('click', saveContent);
    updatePreview();
});
