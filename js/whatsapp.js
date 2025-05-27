// WhatsApp Integration
const WhatsApp = {
    config: {
        phones: ['528334318725'],
        animationDuration: 300,
        templates: {
            message: (data) => 
                `*Nuevo mensaje de:* ${data.whatsappName}\n*Teléfono:* ${data.whatsappPhone}\n\n*Mensaje:*\n${data.whatsappMessage}`
        }
    },
    
    state: {
        activePopup: null,
        form: null,
        inputs: null,
        isReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    },
    
    // Initialize
    init() {
        this.bindEvents();
        this.setupMediaQueries();
    },
    
    setupMediaQueries() {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionQuery.addEventListener('change', e => {
            this.state.isReducedMotion = e.matches;
        });
    },
    
    bindEvents() {
        document.querySelectorAll('.whatsapp-button').forEach(button => {
            this.setupButton(button);
        });
    },
    
    setupButton(button) {
        // Add ARIA attributes
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', 'Abrir chat de WhatsApp');
        
        // Event listeners
        button.addEventListener('click', e => {
            e.preventDefault();
            this.createPopup();
        });
    },
    
    // Create and manage popup
    createPopup() {
        if (this.state.activePopup) {
            this.closePopup();
            return;
        }

        const popup = document.createElement('div');
        popup.className = 'whatsapp-popup';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-labelledby', 'whatsapp-title');
        popup.setAttribute('aria-modal', 'true');
        
        popup.innerHTML = `
            <div class="whatsapp-popup-content">
                <div class="whatsapp-header">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" aria-hidden="true">
                    <h3 id="whatsapp-title">Contactar por WhatsApp</h3>
                    <button type="button" class="close-btn" aria-label="Cerrar">&times;</button>
                </div>
                <form id="whatsappForm" novalidate>
                    <div class="form-group">
                        <label for="whatsappName" class="visually-hidden">Nombre</label>
                        <input type="text" id="whatsappName" placeholder="Tu nombre" autocomplete="name" required>
                    </div>
                    <div class="form-group">
                        <label for="whatsappPhone" class="visually-hidden">Teléfono</label>
                        <input type="tel" id="whatsappPhone" placeholder="Tu número de WhatsApp"
                               inputmode="numeric" pattern="[0-9]{10}" 
                               title="Ingresa un número de 10 dígitos" required>
                    </div>
                    <div class="form-group">
                        <label for="whatsappMessage" class="visually-hidden">Mensaje</label>
                        <textarea id="whatsappMessage" placeholder="Tu mensaje" rows="4" required></textarea>
                    </div>
                    <button type="submit">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" aria-hidden="true">
                        Contactar ahora
                    </button>
                </form>
            </div>
        `;
        
        document.body.appendChild(popup);
        this.setupPopup(popup);
    },
    
    setupPopup(popup) {
        this.state.activePopup = popup;
        this.state.form = popup.querySelector('#whatsappForm');
        this.state.inputs = [...popup.querySelectorAll('input, textarea')];
        
        popup.querySelector('.close-btn').addEventListener('click', () => this.closePopup());
        popup.addEventListener('click', e => {
            if (e.target === popup) this.closePopup();
        });
        
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closePopup();
        });
        
        this.state.form.addEventListener('submit', e => this.handleSubmit(e));
        
        const phoneInput = popup.querySelector('#whatsappPhone');
        phoneInput.addEventListener('input', () => this.validatePhone(phoneInput));
        
        if (!this.state.isReducedMotion) {
            requestAnimationFrame(() => this.state.inputs[0].focus());
        } else {
            this.state.inputs[0].focus();
        }
        
        this.trapFocus(popup);
    },
    
    closePopup() {
        if (!this.state.activePopup) return;

        this.state.activePopup.classList.add('closing');
        
        setTimeout(() => {
            this.state.activePopup.remove();
            this.state.activePopup = null;
            this.state.form = null;
            this.state.inputs = null;
        }, this.state.isReducedMotion ? 0 : this.config.animationDuration);
    },
    
    validatePhone(input) {
        const isValid = /^[0-9]{10}$/.test(input.value.trim());
        input.setAttribute('aria-invalid', !isValid);
        input.setCustomValidity(isValid ? '' : 'Por favor ingresa un número válido de 10 dígitos');
    },
    
    // Handle form submission
    async handleSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        if (!this.validateFormData(data)) return;
        
        try {
            const phone = await this.getRandomTeamPhone();
            const message = this.config.templates.message(data);
            await this.redirectToWhatsApp(phone, message);
        } catch (error) {
            console.error('WhatsApp error:', error);
            this.showError('Lo sentimos, hubo un error. Por favor intenta de nuevo.');
        }
    },
    
    validateFormData(data) {
        const { whatsappName, whatsappPhone, whatsappMessage } = data;
        
        if (!whatsappName?.trim() || !whatsappMessage?.trim()) {
            this.showError('Por favor completa todos los campos');
            return false;
        }
        
        if (!/^[0-9]{10}$/.test(whatsappPhone?.trim())) {
            this.showError('Por favor ingresa un número válido de 10 dígitos');
            return false;
        }
        
        return true;
    },
    
    async getRandomTeamPhone() {
        const { phones } = this.config;
        if (!phones.length) throw new Error('No hay números de teléfono disponibles');
        
        const randomIndex = Math.floor(Math.random() * phones.length);
        return phones[randomIndex];
    },
    
    async redirectToWhatsApp(phone, message) {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        this.closePopup();
        window.location.href = url;
    },
    
    showError(message) {
        const existingError = this.state.activePopup.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        const error = document.createElement('div');
        error.className = 'error-message';
        error.setAttribute('role', 'alert');
        error.textContent = message;
        
        this.state.form.insertBefore(error, this.state.form.firstChild);
    },
    
    // Accessibility Helpers
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', e => {
            const isTab = e.key === 'Tab';
            if (!isTab) return;
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        });
    }
};

// Initialize WhatsApp integration
document.addEventListener('DOMContentLoaded', () => WhatsApp.init());
