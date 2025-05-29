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
    
    // Initialize the WhatsApp integration
    init() {
        this.bindEvents();
        this.setupMediaQueries();
    },
    
    // Setup media query listener for reduced motion preference
    setupMediaQueries() {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionQuery.addEventListener('change', e => {
            this.state.isReducedMotion = e.matches;
        });
    },
    
    // Bind click events to all WhatsApp buttons
    bindEvents() {
        const buttons = document.querySelectorAll('.whatsapp-button');
        buttons.forEach(button => {
            this.setupButton(button);
        });
    },
    
    // Setup individual WhatsApp button with ARIA attributes and click handler
    setupButton(button) {
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', 'Abrir chat de WhatsApp');
        
        button.addEventListener('click', e => {
            e.preventDefault();
            this.createPopup();
        });
    },
    
    // Create and display the WhatsApp popup
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
    
    // Setup popup event listeners and accessibility features
    setupPopup(popup) {
        this.state.activePopup = popup;
        this.state.form = popup.querySelector('#whatsappForm');
        this.state.inputs = Array.from(popup.querySelectorAll('input, textarea'));
        
        const closeBtn = popup.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.closePopup());
        
        popup.addEventListener('click', e => {
            if (e.target === popup) this.closePopup();
        });
        
        // Remove previous keydown listener to avoid multiple bindings
        if (this._keydownListener) {
            document.removeEventListener('keydown', this._keydownListener);
        }
        this._keydownListener = (e) => {
            if (e.key === 'Escape') this.closePopup();
        };
        document.addEventListener('keydown', this._keydownListener);
        
        this.state.form.addEventListener('submit', e => this.handleSubmit(e));
        
        const phoneInput = popup.querySelector('#whatsappPhone');
