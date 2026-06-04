(function () {
    const STORAGE_PREFIX = 'impretam3d_admin_';
    const DEFAULTS = {
        calculatorConfig: {
            material: 'PLA',
            materialCostPerGram: 0.35,
            hourlyCost: 2.26,
            printCostPerHour: 0,
            energyCostPerHour: 0.5,
            maintenanceCostPerHour: 1.76,
            piecesPerPlate: 1,
            marginPercent: 100,
            includeIva: true,
            ivaPercent: 16,
            bankCommissionPercent: 3.5,
            rentPercent: 5,
            cardCostPerPiece: 0.33,
            ringCostPerPiece: 1,
            bagCostPerPiece: 0.88,
            eyeletCostPerPiece: 1,
            magnetCostPerPiece: 0
        },
        siteContent: {
            heroTitle: 'Impresion 3D creativa',
            heroSubtitle: 'Transformamos ideas en piezas funcionales con diseno, prototipado e impresion 3D.',
            contactCta: 'Cotiza tu proyecto',
            contactEmail: 'impretam3d@gmail.com',
            whatsappNumber: '',
            services: [
                {
                    name: 'Diseno 3D',
                    description: 'Modelado y ajustes para piezas listas para imprimir.',
                    basePrice: 0
                },
                {
                    name: 'Impresion 3D',
                    description: 'Fabricacion por filamento o resina segun la necesidad del proyecto.',
                    basePrice: 0
                },
                {
                    name: 'Asesoria tecnica',
                    description: 'Revision de archivos, materiales y acabados recomendados.',
                    basePrice: 0
                }
            ]
        }
    };

    function isPlainObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function mergeDefaults(defaultValue, savedValue) {
        if (Array.isArray(defaultValue)) {
            return Array.isArray(savedValue) ? savedValue : defaultValue;
        }

        if (!isPlainObject(defaultValue)) {
            return savedValue ?? defaultValue;
        }

        const merged = { ...defaultValue };
        Object.keys(defaultValue).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(savedValue || {}, key)) {
                merged[key] = mergeDefaults(defaultValue[key], savedValue[key]);
            }
        });

        return merged;
    }

    function readLocal(key) {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
            const parsed = raw ? JSON.parse(raw) : null;
            return mergeDefaults(DEFAULTS[key], parsed);
        } catch (_error) {
            return mergeDefaults(DEFAULTS[key], null);
        }
    }

    function writeLocal(key, value) {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    }

    function readLocalQuotes() {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}quotes`);
            return raw ? JSON.parse(raw) : [];
        } catch (_error) {
            return [];
        }
    }

    function writeLocalQuotes(quotes) {
        localStorage.setItem(`${STORAGE_PREFIX}quotes`, JSON.stringify(quotes));
    }

    async function load(key) {
        const fallbackValue = readLocal(key);

        try {
            const response = await fetch(`/admin/api/config?key=${encodeURIComponent(key)}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                return {
                    ok: false,
                    remote: false,
                    value: fallbackValue,
                    error: errorBody.error || `http_${response.status}`
                };
            }

            const body = await response.json();
            const value = mergeDefaults(DEFAULTS[key], body.value);
            writeLocal(key, value);

            return {
                ok: true,
                remote: true,
                storage: body.storage || 'remote',
                value,
                updatedAt: body.updatedAt || null
            };
        } catch (_error) {
            return {
                ok: false,
                remote: false,
                value: fallbackValue,
                error: 'local_fallback'
            };
        }
    }

    async function save(key, value) {
        writeLocal(key, value);

        try {
            const response = await fetch(`/admin/api/config?key=${encodeURIComponent(key)}`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ value })
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                return {
                    ok: false,
                    remote: false,
                    error: errorBody.error || `http_${response.status}`
                };
            }

            const body = await response.json();
            return {
                ok: true,
                remote: true,
                storage: body.storage || 'remote',
                updatedAt: body.updatedAt || null
            };
        } catch (_error) {
            return {
                ok: false,
                remote: false,
                error: 'local_fallback'
            };
        }
    }

    async function saveQuote(quote) {
        const localQuote = {
            ...quote,
            id: Date.now(),
            quoteNumber: `LOCAL-${Date.now().toString(36).toUpperCase()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            const response = await fetch('/admin/api/quotes', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ quote })
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const quotes = [localQuote, ...readLocalQuotes()].slice(0, 25);
                writeLocalQuotes(quotes);

                return {
                    ok: false,
                    remote: false,
                    quote: localQuote,
                    error: errorBody.error || `http_${response.status}`
                };
            }

            const body = await response.json();
            return {
                ok: true,
                remote: true,
                storage: body.storage || 'remote',
                quote: body.quote
            };
        } catch (_error) {
            const quotes = [localQuote, ...readLocalQuotes()].slice(0, 25);
            writeLocalQuotes(quotes);

            return {
                ok: false,
                remote: false,
                quote: localQuote,
                error: 'local_fallback'
            };
        }
    }

    async function listQuotes(limit = 20) {
        const fallbackQuotes = readLocalQuotes().slice(0, limit);

        try {
            const response = await fetch(`/admin/api/quotes?limit=${encodeURIComponent(limit)}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                return {
                    ok: false,
                    remote: false,
                    quotes: fallbackQuotes,
                    error: errorBody.error || `http_${response.status}`
                };
            }

            const body = await response.json();
            return {
                ok: true,
                remote: true,
                storage: body.storage || 'remote',
                quotes: body.quotes || []
            };
        } catch (_error) {
            return {
                ok: false,
                remote: false,
                quotes: fallbackQuotes,
                error: 'local_fallback'
            };
        }
    }

    async function readApiJson(response) {
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                ok: false,
                error: body.error || `http_${response.status}`,
                message: body.message || '',
                status: response.status,
                ...body
            };
        }

        return body;
    }

    async function apiRequest(path, options = {}) {
        try {
            const response = await fetch(path, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    ...(options.headers || {})
                },
                ...options
            });

            return readApiJson(response);
        } catch (_error) {
            return {
                ok: false,
                error: 'network_error',
                message: 'No se pudo conectar con la API del admin.'
            };
        }
    }

    function getStorageUsage() {
        return apiRequest('/admin/api/storage/usage');
    }

    function recalculateStorage() {
        return apiRequest('/admin/api/storage/recalculate', {
            method: 'POST'
        });
    }

    function listFiles(limit = 50) {
        return apiRequest(`/admin/api/files?limit=${encodeURIComponent(limit)}`);
    }

    function prepareUpload(fileMetadata) {
        return apiRequest('/admin/api/files/prepare-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fileMetadata)
        });
    }

    function completeUpload(formData) {
        return apiRequest('/admin/api/files/complete-upload', {
            method: 'POST',
            body: formData
        });
    }

    function deleteFile(id, linkId) {
        const query = linkId ? `?linkId=${encodeURIComponent(linkId)}` : '';
        return apiRequest(`/admin/api/files/${encodeURIComponent(id)}${query}`, {
            method: 'DELETE'
        });
    }

    function getCostCatalog() {
        return apiRequest('/admin/api/costs');
    }

    function saveCostSettings(settings) {
        return apiRequest('/admin/api/costs/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ settings })
        });
    }

    function createMaterial(material) {
        return apiRequest('/admin/api/costs/materials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(material)
        });
    }

    function updateMaterial(id, material) {
        return apiRequest(`/admin/api/costs/materials/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(material)
        });
    }

    function createModel(model) {
        return apiRequest('/admin/api/costs/models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(model)
        });
    }

    function updateModel(id, model) {
        return apiRequest(`/admin/api/costs/models/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(model)
        });
    }

    function updateTier(id, tier) {
        return apiRequest(`/admin/api/costs/tiers/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tier)
        });
    }

    function money(value) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(Number.isFinite(value) ? value : 0);
    }

    function formatBytes(bytes) {
        const value = Number(bytes);
        if (!Number.isFinite(value) || value <= 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const power = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
        const size = value / (1024 ** power);
        const digits = power >= 3 ? 2 : 1;

        return `${size.toFixed(digits)} ${units[power]}`;
    }

    function setStatus(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.className = `status active ${type || ''}`.trim();
    }

    window.AdminStorage = {
        defaults: DEFAULTS,
        load,
        save,
        saveQuote,
        listQuotes,
        getStorageUsage,
        recalculateStorage,
        listFiles,
        prepareUpload,
        completeUpload,
        deleteFile,
        getCostCatalog,
        saveCostSettings,
        createMaterial,
        updateMaterial,
        createModel,
        updateModel,
        updateTier,
        money,
        formatBytes,
        setStatus
    };
}());
