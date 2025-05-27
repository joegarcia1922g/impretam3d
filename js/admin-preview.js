// Admin Preview Functionality
class AdminPreview {
    constructor() {
        this.currentPreviewData = null;
        this.previewDialog = null;
        this.isTransitioning = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.previewDialog?.classList.contains('active')) {
                this.closePreview();
            }
        });

        // Add event listener for the apply changes button
        document.addEventListener('DOMContentLoaded', () => {
            const applyButton = document.getElementById('btnApplyPreview');
            if (applyButton) {
                applyButton.addEventListener('click', () => this.applyPreviewChanges());
            }
        });
    }

    showPreview(data) {
        if (this.isTransitioning) return;
        this.currentPreviewData = data;
        this.previewDialog = document.getElementById('previewDialog');
        if (!this.previewDialog) {
            console.error('Preview dialog not found');
            return;
        }
        const previewImage = document.getElementById('previewImage');
        // Oculta detalles, solo muestra la imagen
        const previewName = document.getElementById('previewName');
        const previewSize = document.getElementById('previewSize');
        const previewType = document.getElementById('previewType');
        if (previewName) previewName.style.display = 'none';
        if (previewSize) previewSize.style.display = 'none';
        if (previewType) previewType.style.display = 'none';
        // Reset state
        this.clearPreviewState();
        if (data.file) {
            this.handleFilePreview(data.file, { previewImage });
        } else if (data.imageUrl) {
            this.handleEditPreview(data, { previewImage });
        }
        requestAnimationFrame(() => {
            this.previewDialog.classList.add('active');
            this.trapFocus(this.previewDialog);
            const applyButton = document.getElementById('btnApplyPreview');
            if (applyButton) {
                applyButton.focus();
            }
        });
    }

    handleFilePreview(file, elements) {
        const { previewImage } = elements;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.style.opacity = '0';
            previewImage.onload = () => {
                previewImage.style.opacity = '1';
                this.showSuccessIndicator();
            };
        };
        reader.readAsDataURL(file);
    }

    handleEditPreview(data, elements) {
        const { previewImage } = elements;
        previewImage.src = data.imageUrl;
        previewImage.style.opacity = '0';
        previewImage.onload = () => {
            previewImage.style.opacity = '1';
            this.showSuccessIndicator();
        };
    }

    closePreview() {
        if (!this.previewDialog || this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.previewDialog.classList.add('closing');
        
        setTimeout(() => {
            this.previewDialog.classList.remove('active', 'closing');
            this.clearPreviewState();
            this.isTransitioning = false;
        }, 300);
    }

    applyPreviewChanges() {
        if (!this.currentPreviewData) {
            this.showErrorMessage('No hay cambios para aplicar');
            return;
        }
        
        try {
            if (typeof this.currentPreviewData.onConfirm === 'function') {
                this.currentPreviewData.onConfirm();
                this.showSuccessMessage('¡Cambios aplicados correctamente!');
            } else {
                console.warn('No onConfirm handler provided');
                this.showErrorMessage('No se pudo procesar la acción');
            }
            this.closePreview();
        } catch (error) {
            console.error('Error applying changes:', error);
            this.showErrorMessage('Error al aplicar los cambios. Por favor intenta de nuevo.');
        }
    }

    clearPreviewState() {
        if (this.previewDialog) {
            const previewImage = this.previewDialog.querySelector('#previewImage');
            if (previewImage) {
                previewImage.src = '';
                previewImage.style.opacity = '';
            }
        }
        this.currentPreviewData = null;
    }

    showSuccessIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'preview-success';
        indicator.innerHTML = '<span class="material-icons">check_circle</span>';
        
        this.previewDialog.querySelector('.preview-content').appendChild(indicator);
        setTimeout(() => indicator.remove(), 2000);
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.preview-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `preview-message preview-message-${type}`;
        messageEl.setAttribute('role', 'alert');
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        // Remove the message after animation
        setTimeout(() => {
            messageEl.classList.add('fade-out');
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }

    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', e => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        });

        // Auto-focus first element
        firstElement.focus();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize preview functionality
const adminPreview = new AdminPreview();

// Export functions for backward compatibility
window.showPreview = (data) => adminPreview.showPreview(data);
window.closePreview = () => adminPreview.closePreview();
window.applyPreviewChanges = () => adminPreview.applyPreviewChanges();
