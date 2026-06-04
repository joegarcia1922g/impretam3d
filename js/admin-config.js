// Legacy admin compatibility only.
// Real admin access now lives at /admin and is protected by Cloudflare Pages Functions.
const ADMIN_CONFIG = {
    AUTH_MODE: 'cloudflare-pages-functions',
    ADMIN_PATH: '/admin/',
    UPLOAD_PATH: '/uploads/images/',
    SERVICES_FILE: '/data/services.json',
    DEFAULT_IMAGES: {
        hero: '/images/hero-bg.jpg'
    }
};

async function saveToKV(key, value) {
    throw new Error('Legacy KV helper disabled. Use /api/admin/config from the protected admin.');
}

async function loadFromKV(key) {
    throw new Error('Legacy KV helper disabled. Use /api/admin/config from the protected admin.');
}

// Utility functions kept so old pages do not fail with ReferenceError.
const AdminUtils = {    
    validateLogin(username, password) {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('userRole');
        return false;
    },

    saveChanges(data, callback) {
        if (callback) callback({ ok: false, message: 'Legacy admin disabled.' });
    },

    loadData() {
        return null;
    },

    formatDate(date) {
        return new Intl.DateTimeFormat('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    async handleImageUpload(file) {
        throw new Error('Legacy image upload disabled.');
    },

    deleteImage(imageId) {
        return false;
    }
};
