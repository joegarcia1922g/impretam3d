const calculatorFields = [
    'material',
    'materialCostPerGram',
    'hourlyCost',
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

function readCalculatorConfig() {
    return {
        material: document.getElementById('material').value,
        materialCostPerGram: numberFromInput('materialCostPerGram'),
        hourlyCost: numberFromInput('hourlyCost'),
        marginPercent: numberFromInput('marginPercent'),
        includeIva: document.getElementById('includeIva').checked,
        ivaPercent: numberFromInput('ivaPercent')
    };
}

function applyCalculatorConfig(config) {
    document.getElementById('material').value = config.material;
    document.getElementById('materialCostPerGram').value = config.materialCostPerGram;
    document.getElementById('hourlyCost').value = config.hourlyCost;
    document.getElementById('marginPercent').value = config.marginPercent;
    document.getElementById('includeIva').checked = Boolean(config.includeIva);
    document.getElementById('ivaPercent').value = config.ivaPercent;
}

function calculateQuote() {
    const grams = numberFromInput('grams');
    const hours = numberFromInput('hours');
    const config = readCalculatorConfig();
    const materialTotal = grams * config.materialCostPerGram;
    const timeTotal = hours * config.hourlyCost;
    const baseSubtotal = materialTotal + timeTotal;
    const marginAmount = baseSubtotal * (config.marginPercent / 100);
    const subtotal = baseSubtotal + marginAmount;
    const ivaAmount = config.includeIva ? subtotal * (config.ivaPercent / 100) : 0;
    const finalPrice = subtotal + ivaAmount;

    document.getElementById('materialTotal').textContent = AdminStorage.money(materialTotal);
    document.getElementById('timeTotal').textContent = AdminStorage.money(timeTotal);
    document.getElementById('baseSubtotal').textContent = AdminStorage.money(baseSubtotal);
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
        `Cotizacion Impretam 3D`,
        `Cliente: ${customer}`,
        `Material: ${quote.material}`,
        `Gramos: ${quote.grams}`,
        `Horas: ${quote.hours}`,
        `Material: ${AdminStorage.money(quote.materialTotal)}`,
        `Tiempo: ${AdminStorage.money(quote.timeTotal)}`,
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
    document.getElementById('grams').value = '0';
    document.getElementById('hours').value = '0';
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
    const stored = await AdminStorage.load('calculatorConfig');

    applyCalculatorConfig(stored.value);
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

    document.getElementById('saveCalculatorConfig').addEventListener('click', saveCalculatorConfig);
    document.getElementById('saveQuote').addEventListener('click', saveCurrentQuote);
    document.getElementById('copyQuote').addEventListener('click', copyQuote);
    document.getElementById('clearQuote').addEventListener('click', clearQuote);

    calculateQuote();
    renderQuoteHistory();
});
