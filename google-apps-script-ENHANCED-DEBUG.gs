// Google Apps Script MEJORADO - Impretam 3D Contact Form
// Versión con DIAGNÓSTICO AVANZADO para resolver problema de emails
// Basado en tu código actual + debug adicional

// CONFIGURACIÓN
const ADMIN_EMAIL = 'impretam3d@gmail.com';
const DEBUG_MODE = true; // Activar logs detallados

// Función de logging mejorada
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log("Data:", JSON.stringify(data, null, 2));
  }
}

// Función para manejar peticiones GET (diagnóstico y CORS)
function doGet(e) {
  debugLog("🔍 doGet iniciado - petición de diagnóstico");
  
  const output = ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script funcionando correctamente",
    timestamp: new Date().toISOString(),
    version: "2.4-DEBUG-ENHANCED",
    adminEmail: ADMIN_EMAIL,
    debugMode: DEBUG_MODE
  }));
  
  output.setMimeType(ContentService.MimeType.JSON);
  
  debugLog("✅ doGet completado");
  return output;
}

function doPost(e) {
  const startTime = new Date();
  debugLog("🎯 doPost iniciado");
  
  try {
    // Verificar si e existe
    if (!e) {
      debugLog("❌ CRÍTICO: El objeto 'e' es undefined");
      
      // Email de debug inmediato
      const debugEmailSubject = "🚨 CRÍTICO - doPost sin parámetros - Impretam 3D";
      const debugEmailBody = `
ALERTA CRÍTICA: El Google Apps Script fue llamado pero no recibió datos.

Timestamp: ${startTime.toISOString()}
Deployment URL: ${ScriptApp.getService().getUrl()}

Posibles causas:
1. Error en el deployment del script
2. Problema CORS o headers HTTP  
3. Error en el código del formulario

ACCIÓN REQUERIDA: Verificar deployment y re-deployar si es necesario.
      `;
      
      try {
        GmailApp.sendEmail(ADMIN_EMAIL, debugEmailSubject, debugEmailBody);
        debugLog("📧 Email de debug crítico enviado");
      } catch (emailError) {
        debugLog("❌ Error enviando email de debug", emailError);
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false, 
          error: "Objeto 'e' es undefined - problema crítico en deployment",
          timestamp: startTime.toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    debugLog("📨 Datos recibidos", {
      hasParameter: !!e.parameter,
      parameterKeys: e.parameter ? Object.keys(e.parameter) : [],
      hasPostData: !!e.postData,
      postDataType: e.postData ? e.postData.type : null
    });
    
    let data;
    
    // Extraer datos del formulario
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
      debugLog("✅ Usando datos de parámetros de formulario");
      
      // Convertir hasFiles de string a boolean
      data.hasFiles = data.hasFiles === 'true';
      
      // Convertir archivos de string a array si existe
      if (data.files && typeof data.files === 'string') {
        try {
          data.files = JSON.parse(data.files);
          debugLog("✅ Archivos parseados correctamente", { count: data.files.length });
        } catch (fileParseError) {
          debugLog("⚠️ Error parseando archivos", fileParseError);
          data.hasFiles = false;
          data.files = [];
        }
      }
      
      // Asegurar que files sea un array
      if (!Array.isArray(data.files)) {
        data.files = [];
        data.hasFiles = false;
      }
    } else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
        debugLog("✅ Datos JSON parseados");
      } catch (parseError) {
        debugLog("❌ Error parseando JSON", parseError);
        throw new Error("Error parseando datos JSON: " + parseError.message);
      }
    } else {
      debugLog("⚠️ No se recibieron datos válidos, usando datos de debug");
      data = {
        name: "Usuario Debug",
        phone: "Sin teléfono",
        email: "debug@test.com", 
        message: "Mensaje de debug - no se recibieron datos válidos",
        hasFiles: false,
        files: []
      };
    }
    
    debugLog("📋 Datos extraídos", data);
    
    // ENVIAR EMAIL INMEDIATAMENTE (antes de procesar archivos)
    debugLog("📧 Iniciando envío de email de notificación");
    
    const hasFiles = data.hasFiles && data.files && data.files.length > 0;
    const emailSubject = `🔔 NUEVO CONTACTO: ${data.name} - Impretam 3D${hasFiles ? ` (${data.files.length} archivo(s))` : ''}`;
    
    let filesPreview = '';
    if (hasFiles) {
      const totalSize = data.files.reduce((sum, file) => sum + file.size, 0);
      filesPreview = `\n📎 Archivos adjuntos: ${data.files.length} archivo(s), ${(totalSize / 1024 / 1024).toFixed(2)} MB total\n`;
      data.files.forEach((file, index) => {
        filesPreview += `${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)\n`;
      });
      filesPreview += `\n📋 NOTA: Los archivos se están procesando y se enviarán en un email separado.\n`;
    }
    
    const emailBody = `
¡NUEVO MENSAJE DE CONTACTO RECIBIDO!

===================================
DATOS DEL CONTACTO:
===================================
👤 Nombre: ${data.name}
📞 Teléfono: ${data.phone || 'No proporcionado'}
📧 Email: ${data.email}

💬 Mensaje:
${data.message}

${filesPreview}
===================================
INFORMACIÓN TÉCNICA:
===================================
⏰ Recibido: ${new Date().toLocaleString('es-ES')}
🌐 Sistema: Google Apps Script v2.4-DEBUG
🆔 Script URL: ${ScriptApp.getService().getUrl()}
    `;
    
    try {
      GmailApp.sendEmail(ADMIN_EMAIL, emailSubject, emailBody);
      debugLog("✅ Email de notificación enviado exitosamente");
    } catch (emailError) {
      debugLog("❌ ERROR CRÍTICO enviando email", emailError);
      
      // Intentar envío de emergencia con subject simple
      try {
        GmailApp.sendEmail(
          ADMIN_EMAIL, 
          `Contacto: ${data.name}`,
          `Nuevo contacto de ${data.name} (${data.email}): ${data.message}`
        );
        debugLog("✅ Email de emergencia enviado");
      } catch (emergencyError) {
        debugLog("❌ ERROR CRÍTICO: No se pudo enviar ningún email", emergencyError);
        throw new Error("No se pudo enviar email: " + emailError.toString());
      }
    }
    
    // Procesar archivos si existen
    let fileResults = { processed: 0, successful: 0, failed: 0, details: [] };
    if (hasFiles) {
      debugLog("📁 Iniciando procesamiento de archivos");
      fileResults = processFiles(data);
      debugLog("📁 Procesamiento completado", fileResults);
      
      // Enviar email con detalles de archivos
      if (fileResults.successful > 0) {
        sendFilesEmail(data, fileResults);
      }
    }
    
    const endTime = new Date();
    const processingTime = endTime - startTime;
    
    debugLog("✅ doPost completado", {
      processingTimeMs: processingTime,
      emailSent: true,
      filesProcessed: fileResults.processed
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        message: 'Mensaje enviado correctamente',
        timestamp: endTime.toISOString(),
        processingTimeMs: processingTime,
        emailSent: true,
        filesProcessed: fileResults.processed,
        debug: DEBUG_MODE ? "Debug mode active" : "Production mode"
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    debugLog("❌ Error crítico en doPost", error);
    
    // Email de error crítico
    try {
      GmailApp.sendEmail(
        ADMIN_EMAIL,
        "🚨 ERROR CRÍTICO - Google Apps Script - Impretam 3D",
        `Error crítico en el procesamiento del formulario:

Error: ${error.toString()}
Stack: ${error.stack}
Timestamp: ${new Date().toISOString()}
Script URL: ${ScriptApp.getService().getUrl()}

Los usuarios pueden estar experimentando problemas para enviar formularios.
`
      );
    } catch (emailError) {
      debugLog("❌ Error enviando notificación de error", emailError);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false, 
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función para procesar archivos (misma lógica que tienes)
function processFiles(data) {
  debugLog("📁 Procesando archivos adjuntos");
  
  const results = { processed: 0, successful: 0, failed: 0, details: [], totalSize: 0 };
  
  try {
    const totalSize = data.files.reduce((sum, file) => sum + file.size, 0);
    results.totalSize = totalSize;
    debugLog(`📊 Tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Buscar o crear carpeta
    let folder;
    const folderName = "Impretam3D_Contactos";
    const folders = DriveApp.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      folder = folders.next();
      debugLog("📂 Usando carpeta existente:", folderName);
    } else {
      folder = DriveApp.createFolder(folderName);
      debugLog("📂 Carpeta creada:", folderName);
    }
    
    // Procesar cada archivo (tu lógica existente)
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      results.processed++;
      
      try {
        debugLog(`📎 Procesando archivo ${i + 1}/${data.files.length}: ${file.name}`);
        
        // Detectar tipo y extensión (tu código)
        const fileName = file.name.toLowerCase();
        const hasValidExtension = fileName.includes('.') && fileName.lastIndexOf('.') > 0;
        
        if (!hasValidExtension) {
          throw new Error(`El archivo "${file.name}" no tiene una extensión válida`);
        }
        
        // Crear nombre para Drive
        const originalName = file.name;
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        const extension = originalName.substring(originalName.lastIndexOf('.'));
        const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const driveFileName = `${baseName}_${data.name}_${timestamp}_${i + 1}${extension}`;
        
        // Crear archivo
        const fileBlob = Utilities.newBlob(
          Utilities.base64Decode(file.content), 
          file.type || 'application/octet-stream', 
          driveFileName
        );
        
        const driveFile = folder.createFile(fileBlob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        results.successful++;
        results.details.push({
          name: file.name,
          size: file.size,
          url: driveFile.getUrl(),
          driveFileName: driveFile.getName(),
          status: 'success'
        });
        
        debugLog(`✅ Archivo subido: ${driveFile.getName()}`);
        
      } catch (fileError) {
        debugLog(`❌ Error procesando archivo ${file.name}`, fileError);
        results.failed++;
        results.details.push({
          name: file.name,
          size: file.size,
          error: fileError.message,
          status: 'error'
        });
      }
    }
    
    return results;
    
  } catch (error) {
    debugLog("❌ Error general procesando archivos", error);
    throw error;
  }
}

// Función para enviar email con archivos
function sendFilesEmail(data, fileResults) {
  debugLog("📎 Enviando email con detalles de archivos");
  
  try {
    const subject = `📎 ARCHIVOS PROCESADOS: ${data.name} - Impretam 3D`;
    
    let filesSection = '';
    if (fileResults.successful > 0) {
      filesSection += '\n✅ ARCHIVOS SUBIDOS EXITOSAMENTE:\n';
      fileResults.details
        .filter(f => f.status === 'success')
        .forEach((file, index) => {
          filesSection += `${index + 1}. ${file.name}\n`;
          filesSection += `   📁 Guardado como: ${file.driveFileName}\n`;
          filesSection += `   📊 Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB\n`;
          filesSection += `   🔗 ${file.url}\n\n`;
        });
    }
    
    if (fileResults.failed > 0) {
      filesSection += '\n❌ ARCHIVOS CON ERRORES:\n';
      fileResults.details
        .filter(f => f.status === 'error')
        .forEach((file, index) => {
          filesSection += `${index + 1}. ${file.name} - ${file.error}\n`;
        });
    }
    
    const body = `
ARCHIVOS PROCESADOS PARA: ${data.name}

===================================
RESUMEN:
===================================
📊 Total procesados: ${fileResults.processed}
✅ Exitosos: ${fileResults.successful}
❌ Fallidos: ${fileResults.failed}
📦 Tamaño total: ${(fileResults.totalSize / 1024 / 1024).toFixed(2)} MB

${filesSection}

===================================
Este email complementa el mensaje de contacto recibido anteriormente.
    `;
    
    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
    debugLog("✅ Email de archivos enviado");
    
  } catch (error) {
    debugLog("❌ Error enviando email de archivos", error);
  }
}

// Funciones de prueba (tus funciones existentes mejoradas)
function testFunction() {
  debugLog("🚀 Iniciando función de prueba mejorada");
  
  try {
    const emailSubject = "🧪 PRUEBA MEJORADA - Nuevo contacto de Test User - Impretam 3D";
    const emailBody = `
ESTE ES UN EMAIL DE PRUEBA MEJORADO

===================================
DATOS DE PRUEBA:
===================================
👤 Nombre: Test User
📞 Teléfono: 1234567890
📧 Email: test@example.com
💬 Mensaje: Este es un mensaje de prueba del sistema mejorado

===================================
INFORMACIÓN DEL SISTEMA:
===================================
⏰ Enviado: ${new Date().toLocaleString('es-ES')}
🌐 Script Version: 2.4-DEBUG-ENHANCED
🆔 Script URL: ${ScriptApp.getService().getUrl()}
📧 Email destino: ${ADMIN_EMAIL}
🔧 Debug Mode: ${DEBUG_MODE}

===================================
SI RECIBES ESTE EMAIL:
✅ Google Apps Script puede enviar emails
✅ Los permisos están correctos  
✅ La cuenta de destino funciona

SI NO RECIBES ESTE EMAIL:
❌ Revisar carpeta SPAM
❌ Verificar cuenta ${ADMIN_EMAIL}
❌ Verificar permisos del script
    `;
    
    GmailApp.sendEmail(ADMIN_EMAIL, emailSubject, emailBody);
    debugLog("✅ Email de prueba mejorada enviado");
    
    return "Prueba mejorada completada - revisa tu email";
    
  } catch (error) {
    debugLog("❌ Error en testFunction mejorada", error);
    throw error;
  }
}

function testPermissions() {
  debugLog("🔑 Probando permisos detalladamente");
  
  try {
    // Probar Drive
    const folders = DriveApp.getFolders();
    debugLog("✅ Acceso a Drive: OK");
    
    // Probar Gmail
    const drafts = GmailApp.getDrafts();
    debugLog("✅ Acceso a Gmail: OK");
    
    // Probar creación de archivo
    const testFile = DriveApp.createFile("test_permissions.txt", "Test", "text/plain");
    testFile.setTrashed(true); // Eliminar inmediatamente
    debugLog("✅ Creación de archivos: OK");
    
    debugLog("🎉 Todos los permisos verificados correctamente");
    return "Permisos verificados correctamente";
    
  } catch (error) {
    debugLog("❌ Error de permisos", error);
    throw error;
  }
}

function debugFunction() {
  debugLog("🔍 Función de debug mejorada iniciada");
  
  try {
    const info = {
      timestamp: new Date().toISOString(),
      scriptUrl: ScriptApp.getService().getUrl(),
      adminEmail: ADMIN_EMAIL,
      debugMode: DEBUG_MODE,
      version: "2.4-DEBUG-ENHANCED"
    };
    
    debugLog("📋 Información del sistema", info);
    
    return `Debug completado - ${info.timestamp}`;
  } catch (error) {
    debugLog("❌ Error en debugFunction", error);
    throw error;
  }
}

// Función para diagnóstico completo
function runCompleteDiagnostic() {
  debugLog("🏥 Iniciando diagnóstico completo");
  
  try {
    // Verificar permisos
    testPermissions();
    
    // Enviar email de prueba
    testFunction();
    
    // Información del sistema
    debugFunction();
    
    debugLog("✅ Diagnóstico completo finalizado");
    return "Diagnóstico completo finalizado - revisa tu email";
    
  } catch (error) {
    debugLog("❌ Error en diagnóstico completo", error);
    throw error;
  }
}
