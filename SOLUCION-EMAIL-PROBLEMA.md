# 🚨 DIAGNÓSTICO Y SOLUCIÓN - Problema de Emails no Recibidos
## Sistema de Contacto Impretam 3D - Google Apps Script

### 📋 PROBLEMA IDENTIFICADO
Los emails del formulario de contacto no están llegando al destinatario (impretam3d@gmail.com), aunque el formulario funciona aparentemente sin errores.

### 🔍 POSIBLES CAUSAS
1. **Emails en spam/junk** (más probable)
2. **Problema con el deployment del Google Apps Script**
3. **Límites de envío de Gmail alcanzados**
4. **Error en la configuración del email de destino**
5. **Problema con permisos del script**

---

## 🚀 PLAN DE ACCIÓN - PASO A PASO

### PASO 1: VERIFICACIÓN INMEDIATA DE EMAILS
**⏱️ Tiempo estimado: 5 minutos**

1. **Revisar carpeta de spam/correo no deseado** en impretam3d@gmail.com
   - Buscar emails de los últimos días
   - Buscar por remitente o palabras clave como "Impretam", "contacto", "nuevo mensaje"

2. **Revisar filtros de Gmail**
   - Ir a Gmail → Configuración → Filtros y direcciones bloqueadas
   - Verificar si hay filtros que puedan estar bloqueando emails

3. **Verificar cuota de almacenamiento**
   - Verificar que la cuenta no esté llena (Gmail rechaza emails si no hay espacio)

### PASO 2: TESTING CON SCRIPTS DE DIAGNÓSTICO
**⏱️ Tiempo estimado: 15 minutos**

**A. Usar el script de prueba simple:**
1. Ir a [Google Apps Script](https://script.google.com)
2. Crear un nuevo proyecto
3. Copiar el contenido de `google-apps-script-SIMPLE-TEST.gs`
4. Ejecutar la función `sendTestEmail()` manualmente
5. Verificar si llega el email de prueba

**B. Usar la página de diagnóstico web:**
1. Abrir `test-google-apps-script.html` en un navegador
2. Configurar la URL del script (la misma URL actual)
3. Ejecutar todas las pruebas paso a paso
4. Revisar resultados

### PASO 3: DEPLOYMENT NUEVO Y LIMPIO
**⏱️ Tiempo estimado: 10 minutos**

1. **Crear nuevo deployment:**
   - En Google Apps Script: Implementar → Nueva implementación
   - Tipo: Aplicación web
   - Ejecutar como: yo (el propietario)
   - Acceso: Cualquier usuario
   - Copiar la nueva URL

2. **Usar el script DEBUG mejorado:**
   - Reemplazar el script actual con el contenido de `google-apps-script-DEBUG.gs`
   - Este script incluye múltiples métodos de notificación
   - Envía emails de debug a un email secundario

3. **Actualizar URL en el formulario:**
   - Cambiar la URL en `contacto.html` línea 693
   - Probar el formulario nuevamente

### PASO 4: CONFIGURACIÓN DE EMAIL BACKUP
**⏱️ Tiempo estimado: 5 minutos**

**Modificar las constantes en el script DEBUG:**
```javascript
const ADMIN_EMAIL = 'impretam3d@gmail.com';
const BACKUP_EMAIL = 'joegarcia2392@gmail.com'; // Email de respaldo
const DEBUG_MODE = true; // Activar modo debug
```

Esto enviará copias de los emails a ambas direcciones para confirmar funcionamiento.

---

## ⚡ SOLUCIÓN RÁPIDA (RECOMENDADA)

### OPCIÓN A: FormSubmit (Servicio externo)
**Ventaja: Funciona inmediatamente sin configuración**

1. Cambiar la URL del formulario en `contacto.html`:
```html
<!-- Cambiar línea 693 de: -->
tempForm.action = 'https://script.google.com/macros/s/[ID]/exec';

<!-- A: -->
tempForm.action = 'https://formsubmit.co/impretam3d@gmail.com';
```

2. Agregar campos de configuración:
```html
<!-- Agregar después de la línea 710 -->
<input type="hidden" name="_subject" value="Nuevo contacto - Impretam 3D">
<input type="hidden" name="_next" value="https://tu-sitio.com/contacto.html">
<input type="hidden" name="_captcha" value="false">
```

### OPCIÓN B: Netlify Forms (Si el sitio está en Netlify)
1. Agregar `netlify` al atributo del formulario
2. Netlify manejará automáticamente los emails

---

## 🔧 TESTING DETALLADO

### Script de prueba manual (Ejecutar en Google Apps Script):
```javascript
function manualTest() {
  // Enviar email directo para probar configuración
  GmailApp.sendEmail(
    'impretam3d@gmail.com',
    '🧪 PRUEBA MANUAL - ' + new Date().toLocaleString(),
    'Si recibes este email, el sistema básico está funcionando.\n\nProblema puede estar en el formulario web.'
  );
  
  console.log("Email de prueba manual enviado");
}
```

### Comandos para debug en la consola del navegador:
```javascript
// Probar conectividad básica
fetch('https://script.google.com/macros/s/[TU-ID]/exec')
  .then(response => response.text())
  .then(data => console.log('Response:', data))
  .catch(error => console.error('Error:', error));
```

---

## 📊 CHECKLIST DE VERIFICACIÓN

### ✅ Verificaciones Básicas:
- [ ] Revisar spam/correo no deseado
- [ ] Verificar filtros de Gmail
- [ ] Confirmar espacio disponible en Gmail
- [ ] Revisar Google Apps Script logs
- [ ] Verificar URL de deployment correcta

### ✅ Tests Técnicos:
- [ ] Ejecutar script de prueba simple
- [ ] Usar página de diagnóstico web
- [ ] Probar envío manual desde Apps Script
- [ ] Verificar permisos del script
- [ ] Confirmar deployment activo

### ✅ Soluciones Implementadas:
- [ ] Script DEBUG con email backup
- [ ] Nuevo deployment limpio
- [ ] FormSubmit como alternativa
- [ ] Modo debug activado

---

## 🎯 PRIORIDAD DE ACCIONES

### 🔥 ALTA PRIORIDAD (Hacer AHORA):
1. **Revisar spam de impretam3d@gmail.com**
2. **Ejecutar función `sendTestEmail()` en Google Apps Script**
3. **Usar página `test-google-apps-script.html`**

### 🟡 MEDIA PRIORIDAD (Si lo anterior falla):
1. **Implementar script DEBUG con email backup**
2. **Crear nuevo deployment**
3. **Considerar FormSubmit como alternativa**

### 🟢 BAJA PRIORIDAD (Optimizaciones):
1. **Configurar dominio personalizado**
2. **Implementar rate limiting**
3. **Mejoras de logging**

---

## 📞 CONTACTO PARA SOPORTE
Si ninguna de estas soluciones funciona, el problema puede ser más profundo y requerir:
- Revisión de configuración de Google Workspace
- Verificación de políticas de seguridad
- Análisis de logs de servidor
- Soporte técnico de Google

## 📁 ARCHIVOS INCLUIDOS EN ESTA SOLUCIÓN:
1. `google-apps-script-DEBUG.gs` - Script con debug exhaustivo
2. `google-apps-script-SIMPLE-TEST.gs` - Script de prueba básica
3. `test-google-apps-script.html` - Página de diagnóstico web
4. Este archivo de instrucciones

**Siguiente paso recomendado: REVISAR SPAM y ejecutar prueba manual en Google Apps Script**
