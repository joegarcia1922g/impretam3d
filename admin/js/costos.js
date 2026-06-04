let catalog = null;

function value(id) {
    return document.getElementById(id).value.trim();
}

function numericValue(id) {
    const number = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(number) ? number : 0;
}

function setValue(id, nextValue) {
    document.getElementById(id).value = nextValue ?? '';
}

function escapeHtml(input) {
    return String(input || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readSettings() {
    return {
        businessName: value('businessName'),
        printCostPerHour: numericValue('printCostPerHour'),
        energyCostPerHour: numericValue('energyCostPerHour'),
        maintenanceCostPerHour: numericValue('maintenanceCostPerHour'),
        defaultMarginPercent: numericValue('defaultMarginPercent'),
        ivaPercent: numericValue('ivaPercent'),
        includeIva: document.getElementById('includeIva').checked
    };
}

function applySettings(settings) {
    setValue('businessName', settings.businessName);
    setValue('printCostPerHour', settings.printCostPerHour);
    setValue('energyCostPerHour', settings.energyCostPerHour);
    setValue('maintenanceCostPerHour', settings.maintenanceCostPerHour);
    setValue('defaultMarginPercent', settings.defaultMarginPercent);
    setValue('ivaPercent', settings.ivaPercent);
    document.getElementById('includeIva').checked = Boolean(settings.includeIva);
}

function readMaterialForm() {
    return {
        name: value('materialName'),
        costPerGram: numericValue('materialCostPerGram'),
        color: value('materialColor'),
        notes: value('materialNotes'),
        active: true
    };
}

function readModelForm() {
    return {
        name: value('modelName'),
        materialId: Number.parseInt(document.getElementById('modelMaterialId').value, 10),
        piecesPerPlate: Number.parseInt(document.getElementById('modelPiecesPerPlate').value, 10) || 1,
        printHours: value('modelPrintHours'),
        grams: numericValue('modelGrams'),
        saleEstimate: value('modelSaleEstimate'),
        notes: value('modelNotes'),
        active: true
    };
}

function updateSummary(summary) {
    document.getElementById('materialCount').textContent = String(summary.materialCount || 0);
    document.getElementById('modelCount').textContent = String(summary.modelCount || 0);
    document.getElementById('averageUnitCost').textContent = AdminStorage.money(summary.averageUnitCost || 0);
    document.getElementById('totalPlateCost').textContent = AdminStorage.money(summary.totalPlateCost || 0);
}

function renderMaterialOptions(materials) {
    const select = document.getElementById('modelMaterialId');
    select.innerHTML = materials.map((material) => `
        <option value="${material.id}">${escapeHtml(material.name)} - ${AdminStorage.money(material.costPerGram)}/g</option>
    `).join('');
}

function materialRow(material) {
    return `
        <form class="data-row editable-row material-edit" data-id="${material.id}">
            <label><span>Material</span><input name="name" value="${escapeHtml(material.name)}"></label>
            <label><span>$/g</span><input name="costPerGram" type="number" min="0" step="0.01" value="${material.costPerGram}"></label>
            <label><span>Color</span><input name="color" value="${escapeHtml(material.color)}"></label>
            <label><span>Notas</span><input name="notes" value="${escapeHtml(material.notes)}"></label>
            <label class="check-row inline-check"><input name="active" type="checkbox" ${material.active ? 'checked' : ''}><span>Activo</span></label>
            <button class="button" type="submit">Guardar</button>
        </form>
    `;
}

function modelRow(model) {
    return `
        <form class="data-row editable-row model-edit" data-id="${model.id}">
            <label><span>Modelo</span><input name="name" value="${escapeHtml(model.name)}"></label>
            <label><span>Material</span><select name="materialId">${catalog.materials.map((material) => `
                <option value="${material.id}" ${material.id === model.materialId ? 'selected' : ''}>${escapeHtml(material.name)}</option>
            `).join('')}</select></label>
            <label><span>Pzs/placa</span><input name="piecesPerPlate" type="number" min="1" step="1" value="${model.piecesPerPlate}"></label>
            <label><span>Horas</span><input name="printHours" value="${escapeHtml(model.printHours)}"></label>
            <label><span>Gramos</span><input name="grams" type="number" min="0" step="0.01" value="${model.grams}"></label>
            <label><span>Venta est.</span><input name="saleEstimate" type="number" min="0" step="0.01" value="${model.saleEstimate ?? ''}"></label>
            <label><span>Notas</span><input name="notes" value="${escapeHtml(model.notes)}"></label>
            <label class="check-row inline-check"><input name="active" type="checkbox" ${model.active ? 'checked' : ''}><span>Activo</span></label>
            <div class="cost-breakdown">
                <span>Placa ${AdminStorage.money(model.costPlate)}</span>
                <span>Pieza ${AdminStorage.money(model.costUnit)}</span>
                <span>Mat. ${AdminStorage.money(model.materialTotal)}</span>
                <span>Luz+mtto ${AdminStorage.money((model.energyTotal || 0) + (model.maintenanceTotal || 0))}</span>
            </div>
            <button class="button" type="submit">Guardar</button>
        </form>
    `;
}

function tierRow(tier) {
    return `
        <form class="data-row editable-row tier-edit" data-id="${tier.id}">
            <strong>${escapeHtml(tier.name)}</strong>
            <label><span>Min %</span><input name="minMarkup" type="number" min="0" step="0.01" value="${tier.minMarkup}"></label>
            <label><span>Max %</span><input name="maxMarkup" type="number" min="0" step="0.01" value="${tier.maxMarkup}"></label>
            <label><span>Default %</span><input name="defaultMarkup" type="number" min="0" step="0.01" value="${tier.defaultMarkup}"></label>
            <label><span>Descripcion</span><input name="description" value="${escapeHtml(tier.description)}"></label>
            <label class="check-row inline-check"><input name="active" type="checkbox" ${tier.active ? 'checked' : ''}><span>Activo</span></label>
            <button class="button" type="submit">Guardar</button>
        </form>
    `;
}

function renderCatalog(nextCatalog) {
    catalog = nextCatalog;
    applySettings(catalog.settings);
    updateSummary(catalog.summary || {});
    renderMaterialOptions(catalog.materials || []);

    document.getElementById('materialsList').innerHTML = (catalog.materials || []).map(materialRow).join('')
        || '<p class="empty-state">Aun no hay materiales.</p>';
    document.getElementById('modelsList').innerHTML = (catalog.models || []).map(modelRow).join('')
        || '<p class="empty-state">Aun no hay modelos.</p>';
    document.getElementById('tiersList').innerHTML = (catalog.tiers || []).map(tierRow).join('')
        || '<p class="empty-state">Aun no hay tiers.</p>';
}

async function loadCatalog() {
    const response = await AdminStorage.getCostCatalog();
    if (!response.ok) {
        AdminStorage.setStatus(
            document.getElementById('catalogStatus'),
            response.message || 'No se pudo cargar el catalogo de costos.',
            'error'
        );
        return;
    }

    renderCatalog(response.catalog);
    AdminStorage.setStatus(document.getElementById('catalogStatus'), 'Costos cargados desde D1.', 'success');
}

function formDataObject(form) {
    const data = new FormData(form);
    const value = {};
    data.forEach((fieldValue, key) => {
        value[key] = fieldValue;
    });
    value.active = Boolean(form.querySelector('[name="active"]')?.checked);
    return value;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();

    document.getElementById('refreshCosts').addEventListener('click', loadCatalog);

    document.getElementById('settingsForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await AdminStorage.saveCostSettings(readSettings());
        if (response.ok) {
            renderCatalog(response.catalog);
            AdminStorage.setStatus(document.getElementById('settingsStatus'), 'Parametros guardados en D1.', 'success');
        } else {
            AdminStorage.setStatus(document.getElementById('settingsStatus'), response.message || 'No se pudieron guardar parametros.', 'error');
        }
    });

    document.getElementById('materialForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await AdminStorage.createMaterial(readMaterialForm());
        if (response.ok) {
            event.target.reset();
            renderCatalog(response.catalog);
        } else {
            AdminStorage.setStatus(document.getElementById('catalogStatus'), response.error || 'No se pudo guardar material.', 'error');
        }
    });

    document.getElementById('modelForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await AdminStorage.createModel(readModelForm());
        if (response.ok) {
            event.target.reset();
            setValue('modelPiecesPerPlate', 1);
            renderCatalog(response.catalog);
        } else {
            AdminStorage.setStatus(document.getElementById('catalogStatus'), response.error || 'No se pudo guardar modelo.', 'error');
        }
    });

    document.getElementById('materialsList').addEventListener('submit', async (event) => {
        const form = event.target.closest('.material-edit');
        if (!form) return;
        event.preventDefault();
        const response = await AdminStorage.updateMaterial(form.dataset.id, formDataObject(form));
        if (response.ok) {
            renderCatalog(response.catalog);
        } else {
            AdminStorage.setStatus(document.getElementById('catalogStatus'), response.error || 'No se pudo actualizar material.', 'error');
        }
    });

    document.getElementById('modelsList').addEventListener('submit', async (event) => {
        const form = event.target.closest('.model-edit');
        if (!form) return;
        event.preventDefault();
        const response = await AdminStorage.updateModel(form.dataset.id, formDataObject(form));
        if (response.ok) {
            renderCatalog(response.catalog);
        } else {
            AdminStorage.setStatus(document.getElementById('catalogStatus'), response.error || 'No se pudo actualizar modelo.', 'error');
        }
    });

    document.getElementById('tiersList').addEventListener('submit', async (event) => {
        const form = event.target.closest('.tier-edit');
        if (!form) return;
        event.preventDefault();
        const data = formDataObject(form);
        data.name = form.querySelector('strong').textContent;
        const response = await AdminStorage.updateTier(form.dataset.id, data);
        if (response.ok) {
            renderCatalog(response.catalog);
        } else {
            AdminStorage.setStatus(document.getElementById('catalogStatus'), response.error || 'No se pudo actualizar tier.', 'error');
        }
    });
});
