// Archivo para manejar la autenticación con credenciales seguras
// Las credenciales se guardarán como variables de entorno en Cloudflare

// Función para verificar credenciales
function verificarCredenciales(usuario, contraseña) {
    // Credenciales fijas (puedes cambiar estas)
    const usuarioAutorizado = 'admin';
    const passwordAutorizada = 'impretam2025';
    
    return usuario === usuarioAutorizado && contraseña === passwordAutorizada;
}

// Función para iniciar sesión
function iniciarSesion(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (verificarCredenciales(usuario, password)) {
        // Guardamos en sessionStorage para mantener la sesión
        sessionStorage.setItem('autenticado', 'true');
        
        // Redirigimos al panel
        const panelUrl = PANEL_URL || './panel.html'; // Uso de otra variable de entorno
        window.location.href = panelUrl;
    } else {
        alert('Usuario o contraseña incorrectos');
    }
}

// Función para verificar si ya está autenticado
function verificarAutenticacion() {
    // Si ya está autenticado, redirigir al panel
    if (sessionStorage.getItem('autenticado') === 'true') {
        const panelUrl = PANEL_URL || './panel.html';
        window.location.href = panelUrl;
    }
}

// Función para cerrar sesión
function cerrarSesion() {
    sessionStorage.removeItem('autenticado');
    window.location.href = '/index.html'; // Redirige siempre a la raíz
}

// Función para proteger páginas que requieren autenticación
function protegerPagina() {
    if (sessionStorage.getItem('autenticado') !== 'true') {
        window.location.href = 'login.html';
    }
}