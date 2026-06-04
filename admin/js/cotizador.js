let costCatalog = null;

const calculatorFields = [
    'material',
    'pricingTierCode',
    'materialCostPerGram',
    'hourlyCost',
    'energyCostPerHour',
    'maintenanceCostPerHour',
    'piecesPerPlate',
    'marginPercent',
    'includeIva',
    'ivaPercent'
];

const quoteFields = [
    'customerName',
    'grams',
    'hours',
    ...calculatorFields
];

function numberFromInput(id) {
    const value = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(value) ? value : 0;
}

function integerFromInput(id, fallback = 1) {
    const value = Number.parseInt(document.getElementById(id).value, 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function selectedOption(id) {
    const select = document.getElementById(id);
    return select.options[select.selectedIndex] || null;
}

function readCalculatorConfig() {
    const printCostPerHour = numberFromInput('hourlyCost');
    const energyCostPerHour = numberFromInput('energyCostPerHour');
    const maintenanceCostPerHour = numberFromInput('maintenanceCostPerHour');

    return {
        material: document.getElementById('material').value,
        pricingTierCode: document.getElementById('pricingTierCode').value,
        materialCostPerGram: numberFromInput('materialCostPerGram'),
        hourlyCost: printCostPerHour + energyCostPerHour + maintenanceCostPerHour,
        printCostPerHour,
        energyCostPerHour,
        maintenanceCostPerHour,
        piecesPerPlate: integerFromInput('piecesPerPlate'),
        marginPercent: numberFromInput('marginPercent'),
        includeIva: document.getElementById('includeIva').checked,
        ivaPercent: numberFromInput('ivaPercent')
    };
}

function applyCalculatorConfig(config) {
    document.getElementById('material').value = config.material || 'PLA';
    document.getElementById('pricingTierCode').value = config.pricingTierCode || '';
    document.getElementById('materialCostPerGram').value = config.materialCostPerGram ?? 0;
    document.getElementById('hourlyCost').value = config.printCostPerHour ?? config.hourlyCost ?? 0;
    document.getElementById('energyCostPerHour').value = config.energyCostPerHour ?? 0;
    document.getElementById('maintenanceCostPerHour').value = config.maintenanceCostPerHour ?? 0;
    document.getElementById('piecesPerPlate').value = config.piecesPerPlate || 1;
    document.getElementById('marginPercent').value = config.marginPercent ?? 0;
    document.getElementById('includeIva').checked = Boolean(config.includeIva);
    document.getElementById('ivaPercent').value = config.ivaPercent ?? 16;
}

function applyCostSettings(settings) {
    if (!settings) {
        return;
    }

    document.getElementById('hourlyCost').value = settings.printCostPerHour ?? numberFromInput('hourlyCost');
    document.getElementById('energyCostPerHour').value = settings.energyCostPerHour ?? numberFromInput('energyCostPerHour');
    document.getElementById('maintenanceCostPerHour').value = settings.maintenanceCostPerHour ?? numberFromInput('maintenanceCostPerHour');
    document.getElementById('marginPercent').value = settings.defaultMarginPercent ?? numberFromInput('marginPercent');
    document.getElementById('includeIva').checked = Boolean(settings.includeIva);
    document.getElementById('ivaPercent').value = settings.ivaPercent ?? numberFromInput('ivaPercent');
}

function renderMaterialOptions(materials) {
    const select = document.getElementById('material');
    const current = select.value;

    if (!materials || !materials.length) {
        return;
    }

    select.innerHTML = materials.map((material) => `
        <option value="${escapeHtml(material.name)}" data-cost="${material.costPerGram}">${escapeHtml(material.name)}</option>
    `).join('');

    if ([...select.options].some((option) => option.value === current)) {
        select.value = current;
    }
}

function renderTierOptions(tiers) {
    const select = document.getElementById('pricingTierCode');
    const current = select.value;
    select.innerHTML = '<option value="">Manual</option>' + (tiers || []).map((tier) => `
        <option value="${escapeHtml(tier.code)}" data-margin="${tier.defaultMarkup}">${escapeHtml(tier.name)} (${tier.defaultMarkup}%)</option>
    `).join('');
    select.value = current;
}

function renderModelOptions(models) {
    const select = document.getElementById('savedModel');
    select.innerHTML = '<option value="">Cotizacion manual</option>' + (models || []).map((model) => `
        <option value="${model.id}">${escapeHtml(model.name)} - ${model.piecesPerPlate} pzs/placa</option>
    `).join('');
}

function applyMaterialCostFromSelection() {
    const option = selectedOption('material');
    if (!option || !option.dataset.cost) {
        return;
    }

    document.getElementById('materialCostPerGram').value = option.dataset.cost;
}

function applyTierMarginFromSelection() {
    const option = selectedOption('pricingTierCode');
    if (!option || !option.dataset.margin) {
        return;
    }

    document.getElementById('marginPercent').value = option.dataset.margin;
}

function applySavedModel() {
    const modelId = Number.parseInt(document.getElementById('savedModel').value, 10);
    const model = costCatalog && (costCatalog.models || []).find((row) => row.id === modelId);

    if (!model) {
        return;
    }

    document.getElementById('material').value = model.materialName;
    document.getElementById('materialCostPerGram').value = model.materialCostPerGram;
    document.getElementById('grams').value = model.grams;
    document.getElementById('hours').value = model.printHoursDecimal;
    document.getElementById('piecesPerPlate').value = model.piecesPerPlate;
    calculateQuote();
}

function calculateQuote() {
    const grams = numberFromInput('grams');
    const hours = numberFromInput('hours');
    const config = readCalculatorConfig();
    const materialTotal = grams * config.materialCostPerGram;
    const printTotal = hours * config.printCostPerHour;
    const energyTotal = hours * config.energyCostPerHour;
    const maintenanceTotal = hours * config.maintenanceCostPerHour;
    const timeTotal = printTotal + energyTotal + maintenanceTotal;
    const baseSubtotal = materialTotal + timeTotal;
    const costPerPiece = baseSubtotal / Math.max(config.piecesPerPlate, 1);
    const marginAmount = baseSubtotal * (config.marginPercent / 100);
    const subtotal = baseSubtotal + marginAmount;
    const ivaAmount = config.includeIva ? subtotal * (config.ivaPercent / 100) : 0;
    const finalPrice = subtotal + ivaAmount;

    document.getElementById('materialTotal').textContent = AdminStorage.money(materialTotal);
    document.getElementById('printTotal').textContent = AdminStorage.money(printTotal);
    document.getElementById('energyTotal').textContent = AdminStorage.money(energyTotal);
    document.getElementById('maintenanceTotal').textContent = AdminStorage.money(maintenanceTotal);
    document.getElementById('baseSubtotal').textContent = AdminStorage.money(baseSubtotal);
    document.getElementById('costPerPiece').textContent = AdminStorage.money(costPerPiece);
    document.getElementById('marginAmount').textContent = AdminStorage.money(marginAmount);
    document.getElementById('ivaAmount').textContent = AdminStorage.money(ivaAmount);
    document.getElementById('finalPrice').textContent = AdminStorage.money(finalPrice);

    return {
        customerName: document.getElementById('customerName').value.trim(),
        grams,
        hours,
        ...config,
        materialTotal,
        timeTotal,
        printTotal,
        energyTotal,
        maintenanceTotal,
        costPerPlate: baseSubtotal,
        costPerPiece,
        baseSubtotal,
        marginAmount,
        ivaAmount,
        finalPrice,
        notes: ''
    };
}

async function saveCalculatorConfig() {
    const status = document.getElementById('calculatorStatus');
    const result = await AdminStorage.save('calculatorConfig', readCalculatorConfig());

    AdminStorage.setStatus(
        status,
        result.remote ? `Configuracion guardada en ${result.storage.toUpperCase()}.` : 'Configuracion guardada localmente. Falta configurar D1.',
        result.remote ? 'success' : 'warning'
    );
}

async function saveCurrentQuote() {
    const status = document.getElementById('calculatorStatus');
    const quote = calculateQuote();
    const result = await AdminStorage.saveQuote(quote);

    AdminStorage.setStatus(
        status,
        result.remote
            ? `Cotizacion ${result.quote.quoteNumber} guardada en D1.`
            : 'Cotizacion guardada localmente. Falta configurar D1.',
        result.remote ? 'success' : 'warning'
    );

    await renderQuoteHistory();
}

async function copyQuote() {
    const quote = calculateQuote();
    const customer = quote.customerName || 'Cliente sin nombre';
    const summary = [
        'Cotizacion Impretam 3D',
        `Cliente: ${customer}`,
        `Material: ${quote.material}`,
        `Gramos: ${quote.grams}`,
        `Horas: ${quote.hours}`,
        `Piezas por placa: ${quote.piecesPerPlate}`,
        `Material: ${AdminStorage.money(quote.materialTotal)}`,
        `Impresion: ${AdminStorage.money(quote.printTotal)}`,
        `Luz: ${AdminStorage.money(quote.energyTotal)}`,
        `Mantenimiento: ${AdminStorage.money(quote.maintenanceTotal)}`,
        `Costo por pieza: ${AdminStorage.money(quote.costPerPiece)}`,
        `Margen: ${AdminStorage.money(quote.marginAmount)}`,
        `IVA: ${AdminStorage.money(quote.ivaAmount)}`,
        `Precio sugerido: ${AdminStorage.money(quote.finalPrice)}`
    ].join('\n');

    try {
        await navigator.clipboard.writeText(summary);
        AdminStorage.setStatus(document.getElementById('calculatorStatus'), 'Cotizacion copiada al portapapeles.', 'success');
    } catch (_error) {
        AdminStorage.setStatus(document.getElementById('calculatorStatus'), 'No se pudo copiar automaticamente.', 'error');
    }
}

function clearQuote() {
    document.getElementById('customerName').value = '';
    document.getElementById('savedModel').value = '';
    document.getElementById('grams').value = '0';
    document.getElementById('hours').value = '0';
    document.getElementById('piecesPerPlate').value = '1';
    calculateQuote();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderQuoteRows(quotes) {
    const container = document.getElementById('quoteHistory');

    if (!quotes.length) {
        container.innerHTML = '<p class="empty-state">Aun no hay cotizaciones guardadas.</p>';
        return;
    }

    container.innerHTML = quotes.map((quote) => `
        <div class="quote-row">
            <div>
                <strong>${escapeHtml(quote.quoteNumber || 'Sin folio')}</strong>
                <span>${escapeHtml(quote.customerName || 'Cliente sin nombre')}</span>
            </div>
            <div>
                <span>${escapeHtml(quote.material)}</span>
                <span>${escapeHtml(new Date(quote.createdAt).toLocaleString('es-MX'))}</span>
            </div>
            <strong>${AdminStorage.money(quote.finalPrice)}</strong>
        </div>
    `).join('');
}

async function renderQuoteHistory() {
    const result = await AdminStorage.listQuotes(12);
    renderQuoteRows(result.quotes || []);

    const historyStatus = document.getElementById('quoteHistoryStatus');
    AdminStorage.setStatus(
        historyStatus,
        result.remote ? 'Historial cargado desde D1.' : 'Historial usando respaldo local.',
        result.remote ? 'success' : 'warning'
    );
}

document.addEventListener('DOMContentLoaded', async () => {
    const status = document.getElementById('calculatorStatus');
    const [stored, costs] = await Promise.all([
        AdminStorage.load('calculatorConfig'),
        AdminStorage.getCostCatalog()
    ]);

    if (costs.ok && costs.catalog) {
        costCatalog = costs.catalog;
        renderMaterialOptions(costCatalog.materials);
        renderTierOptions(costCatalog.tiers);
        renderModelOptions(costCatalog.models);
        applyCostSettings(costCatalog.settings);
    }

    const catalogDefaults = costCatalog
        ? {
            material: costCatalog.materials[0] ? costCatalog.materials[0].name : AdminStorage.defaults.calculatorConfig.material,
            materialCostPerGram: costCatalog.materials[0] ? costCatalog.materials[0].costPerGram : AdminStorage.defaults.calculatorConfig.materialCostPerGram,
            hourlyCost: costCatalog.settings.printCostPerHour,
            printCostPerHour: costCatalog.settings.printCostPerHour,
            energyCostPerHour: costCatalog.settings.energyCostPerHour,
            maintenanceCostPerHour: costCatalog.settings.maintenanceCostPerHour,
            piecesPerPlate: 1,
            marginPercent: costCatalog.settings.defaultMarginPercent,
            includeIva: costCatalog.settings.includeIva,
            ivaPercent: costCatalog.settings.ivaPercent
        }
        : AdminStorage.defaults.calculatorConfig;

    applyCalculatorConfig({
        ...catalogDefaults,
        ...(stored.value || {}),
        material: stored.value.material || catalogDefaults.material
    });

    if (costs.ok && costCatalog) {
        renderMaterialOptions(costCatalog.materials);
        renderTierOptions(costCatalog.tiers);
        renderModelOptions(costCatalog.models);
        if (!stored.value.materialCostPerGram) {
            applyMaterialCostFromSelection();
        }
    }

    AdminStorage.setStatus(
        status,
        stored.remote ? `Configuracion cargada desde ${stored.storage.toUpperCase()}.` : 'Configuracion cargada desde respaldo local.',
        stored.remote ? 'success' : 'warning'
    );

    quoteFields.forEach((id) => {
        const field = document.getElementById(id);
        field.addEventListener('input', calculateQuote);
        field.addEventListener('change', calculateQuote);
    });

    document.getElementById('material').addEventListener('change', () => {
        applyMaterialCostFromSelection();
        calculateQuote();
    });
    document.getElementById('pricingTierCode').addEventListener('change', () => {
        applyTierMarginFromSelection();
        calculateQuote();
    });
    document.getElementById('savedModel').addEventListener('change', applySavedModel);

    document.getElementById('saveCalculatorConfig').addEventListener('click', saveCalculatorConfig);
    document.getElementById('saveQuote').addEventListener('click', saveCurrentQuote);
    document.getElementById('copyQuote').addEventListener('click', copyQuote);
    document.getElementById('clearQuote').addEventListener('click', clearQuote);

    calculateQuote();
    renderQuoteHistory();
});
