# Configuración de Google Apps Script para Formulario de Contacto

## Pasos para implementar:

### 1. Crear el Google Apps Script
1. Ve a [script.google.com](https://script.google.com)
2. Crea un nuevo proyecto
3. Borra el código por defecto y pega el contenido de `google-apps-script.gs`
4. Guarda el proyecto con un nombre descriptivo (ej: "Formulario Impretam 3D")

### 2. Configurar permisos
1. Ejecuta la función `testFunction` para autorizar permisos
2. Acepta los permisos para Gmail y Google Drive
3. Verifica que funcione correctamente

### 3. Desplegar como Web App
1. En Apps Script, haz clic en "Implementar" > "Nueva implementación"
2. Selecciona tipo: "Aplicación web"
3. Configuración:
   - Ejecutar como: "Yo (tu email)"
   - Quién tiene acceso: "Cualquier persona"
4. Copia la URL que te proporciona

### 4. Actualizar contacto.html
1. Reemplaza `TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI` con la URL que copiaste
2. Sube los cambios a GitHub para que se actualice en Cloudflare

## Ventajas de este sistema:

✅ **Archivo en Drive**: Cada contacto se guarda como archivo en tu Google Drive
✅ **Email automático**: Recibes notificación por Gmail con enlace al archivo
✅ **Gratuito**: Usa servicios gratuitos de Google
✅ **Escalable**: Maneja miles de contactos sin problemas
✅ **Backup automático**: Los archivos quedan respaldados en Drive
✅ **Personalizable**: Puedes modificar el formato de email y archivos

## Flujo del sistema:
```
Tu página web → Google Apps Script → Google Drive + Gmail → Notificación
```

## Ejemplo de archivo generado:
```
Formulario de Contacto - Impretam 3D
====================================
Fecha: 07/06/2025 15:30:45
Nombre: Juan Pérez
Teléfono: 5551234567
Email: juan@example.com
Mensaje: Necesito cotización para impresión 3D
```

¡Es muy sencillo de implementar y totalmente gratuito!
