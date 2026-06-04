// Legacy auth disabled.
// Admin access is handled server-side at /admin by Cloudflare Pages Functions.

// Función para verificar credenciales
function verificarCredenciales(usuario, contraseña) {
    return false;
}

// Función para iniciar sesión
function iniciarSesion(e) {
    e.preventDefault();
    
    sessionStorage.removeItem('autenticado');
    window.location.href = '/admin/';
}

// Función para verificar si ya está autenticado
function verificarAutenticacion() {
    sessionStorage.removeItem('autenticado');
}

// Función para cerrar sesión
function cerrarSesion() {
    sessionStorage.removeItem('autenticado');
    window.location.href = '/';
}

// Función para proteger páginas que requieren autenticación
function protegerPagina() {
    window.location.href = '/admin/';
}
