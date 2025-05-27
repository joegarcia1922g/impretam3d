// Admin configuration
const ADMIN_CONFIG = {
    CREDENTIALS: {
        admin: {
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            permissions: ['images', 'services', 'settings', 'users']
        },
        // Superadmin backup access - DO NOT MODIFY
        superadmin: {
            username: 'impretam_sa_2025',
            password: 'I3D_' + btoa('sup3r4dm1n' + new Date().getFullYear()),
            role: 'superadmin',
            permissions: ['all', 'system', 'backup', 'recovery']
        }
    },
    UPLOAD_PATH: '/uploads/images/',
    SERVICES_FILE: '/data/services.json',
    DEFAULT_IMAGES: {
        hero: '/images/hero-bg.jpg'
    }
};

// Utility functions for admin panel
const AdminUtils = {    
    validateLogin(username, password) {
        // Superadmin validation
        const superadmin = ADMIN_CONFIG.CREDENTIALS.superadmin;
        if (username === superadmin.username && password === superadmin.password) {
            localStorage.setItem('userRole', 'superadmin');
            return 'superadmin';
        }
        
        // Normal admin validation
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('userRole', 'admin');
            return 'admin';
        }
        return false;
    },

    saveChanges(data, callback) {
        // In a real app, this would be an API call
        localStorage.setItem('websiteData', JSON.stringify(data));
        if (callback) callback();
    },

    loadData() {
        try {
            const data = localStorage.getItem('websiteData');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
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
        try {
            // In a real app, this would upload to a server
            const imageUrl = URL.createObjectURL(file);
            const imageData = {
                id: Date.now(),
                name: file.name,
                url: imageUrl,
                size: file.size,
                type: file.type,
                uploadDate: new Date().toISOString()
            };

            // Save to local storage for demo
            const existingImages = this.loadData()?.images || [];
            existingImages.push(imageData);
            this.saveChanges({ images: existingImages });

            return imageData;
        } catch (error) {
            console.error('Error handling image upload:', error);
            throw error;
        }
    },

    deleteImage(imageId) {
        const data = this.loadData();
        if (!data || !data.images) return;

        const updatedImages = data.images.filter(img => img.id !== imageId);
        this.saveChanges({ ...data, images: updatedImages });
    }
};
