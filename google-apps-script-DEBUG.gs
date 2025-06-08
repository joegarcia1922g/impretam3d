// Google Apps Script DEBUGGING VERSION - Impretam 3D Contact Form
// Esta versión incluye debug exhaustivo y múltiples métodos de notificación
// ===================================================================

// CONFIGURACIÓN DE EMAIL - MODIFICAR ESTOS VALORES SEGÚN NECESIDAD
const ADMIN_EMAIL = 'impretam3d@gmail.com';
const BACKUP_EMAIL = 'joegarcia2392@gmail.com'; // Email de respaldo para debug
const DEBUG_MODE = true; // Cambiar a false en producción

// Función de logging mejorada
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log("Data:", JSON.stringify(data, null, 2));
  }
  
  // En modo debug, también enviar logs críticos por email
  if (DEBUG_MODE && message.includes('❌')) {
    try {
      GmailApp.sendEmail(
        BACKUP_EMAIL,
        `🐛 DEBUG LOG - ${message}`,
        `${logMessage}\n\nData: ${data ? JSON.stringify(data, null, 2) : 'No data'}`
      );
    } catch (e) {
      console.error("Error enviando debug email:", e);
    }
  }
}

// Función para manejar peticiones GET (diagnóstico)
function doGet(e) {
  debugLog("🔍 doGet iniciado - petición de diagnóstico");
  
  const response = {
    status: "ok",
    message: "Google Apps Script funcionando correctamente",
    timestamp: new Date().toISOString(),
    version: "DEBUG-v1.0",
    deployment: "active",
    permissions: "granted"
  };
  
  debugLog("✅ doGet completado", response);
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Función principal para manejar formularios
function doPost(e) {
  const startTime = new Date();
  debugLog("🎯 doPost iniciado");
  
  try {
    // Verificar si e existe
    if (!e) {
      debugLog("❌ CRÍTICO: El objeto 'e' es undefined");
      
      // Enviar notificación crítica inmediata
      try {
        GmailApp.sendEmail(
          ADMIN_EMAIL,
          "🚨 CRÍTICO - doPost sin parámetros - Impretam 3D",
          `ALERTA CRÍTICA: El Google Apps Script fue llamado pero no recibió datos.

Timestamp: ${startTime.toISOString()}

Posibles causas:
1. Error en el deployment del script
2. Problema CORS o headers HTTP
3. Error en el código del formulario

ACCIÓN REQUERIDA: Verificar deployment y re-deployar si es necesario.
`
        );
        
        // También al email de backup
        GmailApp.sendEmail(
          BACKUP_EMAIL,
          "🚨 CRÍTICO - doPost sin parámetros - Impretam 3D",
          "El script fue llamado sin parámetros. Ver email principal para detalles."
        );
        
      } catch (emailError) {
        debugLog("❌ Error enviando notificación crítica", emailError);
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "No se recibieron datos del formulario",
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
    
    let data = extractFormData(e);
    debugLog("✅ Datos extraídos", data);
    
    // ENVIAR EMAIL DE NOTIFICACIÓN INMEDIATAMENTE (sin esperar archivos)
    const notificationResult = sendNotificationEmail(data);
    debugLog("📧 Resultado envío email", notificationResult);
    
    // Procesar archivos si existen
    let fileResults = { processed: 0, successful: 0, failed: 0, details: [] };
    if (data.hasFiles && data.files && data.files.length > 0) {
      fileResults = processFiles(data);
      debugLog("📁 Resultado procesamiento archivos", fileResults);
    }
    
    // Email de confirmación con archivos (si los hay)
    if (fileResults.processed > 0) {
      sendFilesConfirmationEmail(data, fileResults);
    }
    
    const endTime = new Date();
    const processingTime = endTime - startTime;
    
    debugLog("✅ doPost completado", {
      processingTimeMs: processingTime,
      emailSent: notificationResult.success,
      filesProcessed: fileResults.processed
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Mensaje enviado correctamente',
        timestamp: endTime.toISOString(),
        processingTimeMs: processingTime,
        emailSent: notificationResult.success,
        filesProcessed: fileResults.processed,
        debug: DEBUG_MODE ? "Debug mode active" : "Production mode"
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    debugLog("❌ Error crítico en doPost", error);
    
    // Enviar email de error crítico
    try {
      GmailApp.sendEmail(
        ADMIN_EMAIL,
        "🚨 ERROR CRÍTICO - Google Apps Script - Impretam 3D",
        `Error crítico en el procesamiento del formulario:

Error: ${error.toString()}
Stack: ${error.stack}
Timestamp: ${new Date().toISOString()}

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

// Función para extraer datos del formulario
function extractFormData(e) {
  debugLog("🔄 Extrayendo datos del formulario");
  
  let data;
  
  if (e.parameter && Object.keys(e.parameter).length > 0) {
    debugLog("📥 Usando parámetros de formulario");
    data = e.parameter;
    
    // Convertir hasFiles de string a boolean
    data.hasFiles = data.hasFiles === 'true';
    
    // Parsear archivos si existen
    if (data.files && typeof data.files === 'string') {
      try {
        data.files = JSON.parse(data.files);
        debugLog("✅ Archivos parseados correctamente", { count: data.files.length });
      } catch (parseError) {
        debugLog("⚠️ Error parseando archivos", parseError);
        data.hasFiles = false;
        data.files = [];
      }
    }
    
    // Validar que files sea array
    if (!Array.isArray(data.files)) {
      data.files = [];
      data.hasFiles = false;
    }
    
  } else if (e.postData && e.postData.contents) {
    debugLog("📥 Usando datos POST JSON");
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      debugLog("❌ Error parseando JSON", parseError);
      throw new Error("Error parseando datos JSON: " + parseError.message);
    }
  } else {
    debugLog("⚠️ Datos no válidos, usando datos de prueba");
    data = {
      name: "Usuario de Prueba",
      phone: "Sin teléfono",
      email: "test@debug.com",
      message: "Mensaje de debug - no se recibieron datos válidos",
      hasFiles: false,
      files: []
    };
  }
  
  // Validación básica
  if (!data.name || !data.email || !data.message) {
    throw new Error("Faltan campos obligatorios: nombre, email o mensaje");
  }
  
  return data;
}

// Función para enviar email de notificación inmediata
function sendNotificationEmail(data) {
  debugLog("📧 Enviando email de notificación");
  
  try {
    const subject = `🔔 NUEVO CONTACTO: ${data.name} - Impretam 3D`;
    
    const body = `
¡NUEVO MENSAJE DE CONTACTO RECIBIDO!

===================================
DATOS DEL CONTACTO:
===================================
👤 Nombre: ${data.name}
📞 Teléfono: ${data.phone || 'No proporcionado'}
📧 Email: ${data.email}

💬 Mensaje:
${data.message}

===================================
INFORMACIÓN TÉCNICA:
===================================
⏰ Recibido: ${new Date().toLocaleString('es-ES')}
📎 Archivos adjuntos: ${data.hasFiles ? `SÍ (${data.files.length} archivo(s))` : 'NO'}
🌐 Sistema: Google Apps Script - Impretam 3D

${data.hasFiles ? '\n📋 NOTA: Los archivos se están procesando y recibirás otro email con los detalles.' : ''}

===================================
Este es un mensaje automático del sistema de contacto de Impretam 3D.
    `;
    
    // Enviar al email principal
    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
    debugLog("✅ Email principal enviado");
    
    // En modo debug, también enviar copia de seguridad
    if (DEBUG_MODE) {
      try {
        GmailApp.sendEmail(
          BACKUP_EMAIL,
          `[DEBUG] ${subject}`,
          `[MODO DEBUG ACTIVO]\n\n${body}`
        );
        debugLog("✅ Email de debug enviado");
      } catch (debugEmailError) {
        debugLog("⚠️ Error enviando email de debug", debugEmailError);
      }
    }
    
    return { success: true, message: "Email enviado correctamente" };
    
  } catch (error) {
    debugLog("❌ Error enviando email de notificación", error);
    
    // Intentar envío de emergencia al backup
    try {
      GmailApp.sendEmail(
        BACKUP_EMAIL,
        "🚨 ERROR - Sistema email principal falló",
        `Error enviando email principal para contacto de ${data.name}.\n\nError: ${error.toString()}`
      );
    } catch (backupError) {
      debugLog("❌ Error enviando email de backup", backupError);
    }
    
    return { success: false, error: error.toString() };
  }
}

// Función para procesar archivos
function processFiles(data) {
  debugLog("📁 Iniciando procesamiento de archivos", { count: data.files.length });
  
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    details: [],
    totalSize: 0
  };
  
  try {
    // Crear o encontrar carpeta
    let folder;
    const folderName = "Impretam3D_Contactos";
    const folders = DriveApp.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      folder = folders.next();
      debugLog("📂 Usando carpeta existente");
    } else {
      folder = DriveApp.createFolder(folderName);
      debugLog("📂 Carpeta creada");
    }
    
    // Procesar cada archivo
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      results.processed++;
      results.totalSize += file.size;
      
      debugLog(`📎 Procesando archivo ${i + 1}/${data.files.length}: ${file.name}`);
      
      try {
        // Validar archivo
        if (!file.name || !file.content) {
          throw new Error("Archivo inválido: falta nombre o contenido");
        }
        
        // Crear nombre único
        const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const originalName = file.name;
        const baseName = originalName.substring(0, originalName.lastIndexOf('.') || originalName.length);
        const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
        const driveFileName = `${baseName}_${data.name}_${timestamp}_${i + 1}${extension}`;
        
        // Crear archivo en Drive
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
          driveFileName: driveFileName,
          size: file.size,
          url: driveFile.getUrl(),
          status: "success"
        });
        
        debugLog(`✅ Archivo procesado: ${driveFileName}`);
        
      } catch (fileError) {
        results.failed++;
        results.details.push({
          name: file.name,
          size: file.size,
          status: "error",
          error: fileError.toString()
        });
        
        debugLog(`❌ Error procesando archivo ${file.name}`, fileError);
      }
    }
    
  } catch (error) {
    debugLog("❌ Error general en procesamiento de archivos", error);
  }
  
  return results;
}

// Función para enviar email de confirmación con archivos
function sendFilesConfirmationEmail(data, fileResults) {
  debugLog("📎 Enviando email de confirmación de archivos");
  
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

// ========================================
// FUNCIONES DE PRUEBA Y DIAGNÓSTICO
// ========================================

// Función de prueba básica
function testBasicEmail() {
  debugLog("🧪 Iniciando prueba básica de email");
  
  try {
    const subject = "🧪 PRUEBA BÁSICA - Sistema de contacto Impretam 3D";
    const body = `
Esta es una prueba básica del sistema de email.

Timestamp: ${new Date().toISOString()}
Status: Sistema funcionando correctamente

Si recibes este email, la configuración básica está funcionando.
    `;
    
    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
    debugLog("✅ Email de prueba básica enviado");
    
    // También al backup si está en modo debug
    if (DEBUG_MODE) {
      GmailApp.sendEmail(BACKUP_EMAIL, `[DEBUG] ${subject}`, body);
      debugLog("✅ Email de prueba backup enviado");
    }
    
    return "Prueba básica completada exitosamente";
    
  } catch (error) {
    debugLog("❌ Error en prueba básica", error);
    throw error;
  }
}

// Función de prueba completa
function testCompleteSystem() {
  debugLog("🚀 Iniciando prueba completa del sistema");
  
  try {
    // Simular datos de formulario
    const testData = {
      name: "Usuario de Prueba Completa",
      phone: "555-0123",
      email: "test@example.com",
      message: "Este es un mensaje de prueba del sistema completo de contacto.",
      hasFiles: false,
      files: []
    };
    
    // Probar envío de email
    const emailResult = sendNotificationEmail(testData);
    debugLog("📧 Resultado prueba email", emailResult);
    
    // Probar creación de archivo en Drive
    const testFileName = `PRUEBA_COMPLETA_${new Date().toISOString().slice(0,10)}.txt`;
    const testFile = DriveApp.createFile(testFileName, `Prueba completa del sistema\n\nTimestamp: ${new Date().toISOString()}`, 'text/plain');
    debugLog("📁 Archivo de prueba creado", { id: testFile.getId(), url: testFile.getUrl() });
    
    debugLog("✅ Prueba completa exitosa");
    return "Sistema completo funcionando correctamente";
    
  } catch (error) {
    debugLog("❌ Error en prueba completa", error);
    throw error;
  }
}

// Función para verificar permisos
function checkPermissions() {
  debugLog("🔑 Verificando permisos del sistema");
  
  try {
    // Verificar Gmail
    const drafts = GmailApp.getDrafts();
    debugLog("✅ Acceso a Gmail: OK");
    
    // Verificar Drive
    const folders = DriveApp.getFolders();
    debugLog("✅ Acceso a Drive: OK");
    
    // Verificar creación de archivos
    const testFile = DriveApp.createFile("test_permissions.txt", "Test", "text/plain");
    testFile.setTrashed(true); // Eliminar inmediatamente
    debugLog("✅ Creación de archivos: OK");
    
    return "Todos los permisos están correctos";
    
  } catch (error) {
    debugLog("❌ Error de permisos", error);
    throw error;
  }
}

// Función de diagnóstico de deployment
function diagnosticDeployment() {
  debugLog("🔍 Diagnóstico de deployment");
  
  const info = {
    timestamp: new Date().toISOString(),
    version: "DEBUG-v1.0",
    functions: {
      doGet: typeof doGet === 'function',
      doPost: typeof doPost === 'function',
      testBasicEmail: typeof testBasicEmail === 'function'
    },
    config: {
      adminEmail: ADMIN_EMAIL,
      backupEmail: BACKUP_EMAIL,
      debugMode: DEBUG_MODE
    }
  };
  
  debugLog("📋 Información de deployment", info);
  
  return info;
}
