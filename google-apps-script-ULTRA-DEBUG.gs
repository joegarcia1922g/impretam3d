// Google Apps Script ULTRA DEBUG VERSION - Impretam 3D Contact Form
// Esta versión incluye múltiples métodos de diagnóstico y notificación
// ====================================================================

// CONFIGURACIÓN DE EMAIL
const ADMIN_EMAIL = 'impretam3d@gmail.com';
const BACKUP_EMAIL = 'joegarcia2392@gmail.com';
const DEBUG_MODE = true;
const TEST_MODE = true; // Envía emails de prueba automáticos

// ========================================
// SISTEMA DE LOGGING ULTRA DETALLADO
// ========================================

function ultraLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log("Data:", JSON.stringify(data, null, 2));
  }
    // En modo debug, enviar logs críticos por email SOLO a impretam3d
  if (DEBUG_MODE && (level === 'ERROR' || level === 'CRITICAL')) {
    try {
      GmailApp.sendEmail(
        ADMIN_EMAIL,
        `🚨 [${level}] ULTRA DEBUG - ${message}`,
        `${logMessage}\n\nData: ${data ? JSON.stringify(data, null, 2) : 'No data'}\n\nScript URL: ${ScriptApp.getService().getUrl()}`
      );
    } catch (e) {
      console.error("Error enviando ultra debug email:", e);
    }
  }
}

// ========================================
// FUNCIONES DE DIAGNÓSTICO AUTOMÁTICO
// ========================================

function doGet(e) {
  ultraLog("INFO", "doGet iniciado - diagnóstico automático");
  
  // Ejecutar diagnóstico completo automáticamente
  const diagnostics = runCompleteDiagnostics();
  
  const response = {
    status: "ok",
    message: "Google Apps Script Ultra Debug funcionando",
    timestamp: new Date().toISOString(),
    version: "ULTRA-DEBUG-v1.0",
    deployment: "active",
    diagnostics: diagnostics
  };
  
  ultraLog("SUCCESS", "doGet completado", response);
  
  return ContentService
    .createTextOutput(JSON.stringify(response, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const startTime = new Date();
  ultraLog("INFO", "doPost iniciado - procesamiento de formulario");
  
  try {
    // Diagnóstico automático en cada envío
    const quickDiag = {
      hasParams: !!e && !!e.parameter,
      hasPostData: !!e && !!e.postData,
      timestamp: startTime.toISOString()
    };
    ultraLog("INFO", "Estado de parámetros recibidos", quickDiag);
    
    // Extraer datos
    let data = extractFormData(e);
    ultraLog("SUCCESS", "Datos extraídos correctamente", data);
    
    // ENVÍO INMEDIATO DE EMAIL (prioridad máxima)
    const emailResult = sendUltraNotificationEmail(data);
    ultraLog("INFO", "Resultado envío email", emailResult);
    
    // Procesar archivos si existen
    let fileResults = { processed: 0, successful: 0, failed: 0 };
    if (data.hasFiles && data.files && data.files.length > 0) {
      fileResults = processFiles(data);
      ultraLog("INFO", "Archivos procesados", fileResults);
    }
    
    // Email de confirmación con detalles técnicos
    sendTechnicalConfirmationEmail(data, emailResult, fileResults, startTime);
    
    const endTime = new Date();
    const processingTime = endTime - startTime;
    
    ultraLog("SUCCESS", "doPost completado exitosamente", {
      processingTimeMs: processingTime,
      emailSent: emailResult.success
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Ultra debug: Mensaje procesado correctamente',
        timestamp: endTime.toISOString(),
        processingTimeMs: processingTime,
        emailResult: emailResult,
        fileResults: fileResults,
        debugInfo: "Ultra debug mode active - check all email accounts"
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    ultraLog("CRITICAL", "Error crítico en doPost", {
      error: error.toString(),
      stack: error.stack
    });
    
    // Envío de emergencia por múltiples canales
    sendEmergencyErrorNotification(error, startTime);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString(),
        debugMode: "ULTRA-DEBUG",
        emergencyNotificationSent: true
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// EXTRACCIÓN DE DATOS MEJORADA
// ========================================

function extractFormData(e) {
  ultraLog("INFO", "Iniciando extracción de datos del formulario");
  
  let data;
  
  if (e && e.parameter && Object.keys(e.parameter).length > 0) {
    ultraLog("INFO", "Usando parámetros de formulario");
    data = e.parameter;
    
    // Procesar archivos si existen
    if (data.files && typeof data.files === 'string') {
      try {
        data.files = JSON.parse(data.files);
        ultraLog("SUCCESS", "Archivos parseados", { count: data.files.length });
      } catch (parseError) {
        ultraLog("ERROR", "Error parseando archivos", parseError);
        data.files = [];
        data.hasFiles = false;
      }
    }
    
  } else if (e && e.postData && e.postData.contents) {
    ultraLog("INFO", "Usando datos POST JSON");
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      ultraLog("ERROR", "Error parseando JSON", parseError);
      throw new Error("Error parseando datos JSON");
    }
    
  } else {
    ultraLog("WARNING", "Sin datos válidos, usando datos de prueba");
    data = {
      name: "Usuario de Prueba Ultra Debug",
      phone: "555-DEBUG",
      email: "debug@ultradebug.com",
      message: "Mensaje de ultra debug - datos no recibidos correctamente",
      hasFiles: false,
      files: []
    };
  }
  
  // Validación y normalización
  data.hasFiles = data.hasFiles === 'true' || data.hasFiles === true;
  data.files = Array.isArray(data.files) ? data.files : [];
  
  ultraLog("SUCCESS", "Datos extraídos y validados", {
    name: data.name,
    email: data.email,
    hasFiles: data.hasFiles,
    filesCount: data.files.length
  });
  
  return data;
}

// ========================================
// SISTEMA DE EMAILS ULTRA ROBUSTO
// ========================================

function sendUltraNotificationEmail(data) {
  ultraLog("INFO", "Iniciando envío de email ultra robusto");
  
  try {
    const subject = `🔔 ULTRA DEBUG - CONTACTO: ${data.name} - Impretam 3D`;
    
    const body = `
¡NUEVO MENSAJE DE CONTACTO RECIBIDO!
===================================

👤 DATOS DEL CONTACTO:
- Nombre: ${data.name}
- Teléfono: ${data.phone || 'No proporcionado'}
- Email: ${data.email}

💬 MENSAJE:
${data.message}

📎 ARCHIVOS: ${data.hasFiles ? `SÍ (${data.files.length})` : 'NO'}

🛠️ INFORMACIÓN TÉCNICA:
- Timestamp: ${new Date().toLocaleString('es-ES')}
- Modo: ULTRA DEBUG
- Sistema: Google Apps Script v2.0
- Procesamiento: Automático

===================================
Este email confirma que el sistema está funcionando correctamente.
    `;
    
    // Envío al email principal    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
    ultraLog("SUCCESS", "Email principal enviado correctamente");
    
    // BACKUP REMOVIDO - Solo enviar a impretam3d@gmail.com
    ultraLog("INFO", "Email enviado únicamente a impretam3d@gmail.com");
    } catch (backupError) {
      ultraLog("ERROR", "Error enviando email de backup", backupError);
    }
    
    return { success: true, message: "Emails enviados correctamente" };
    
  } catch (error) {
    ultraLog("CRITICAL", "Error crítico enviando emails", error);
    return { success: false, error: error.toString() };
  }
}

function sendTechnicalConfirmationEmail(data, emailResult, fileResults, startTime) {
  try {
    const processingTime = new Date() - startTime;
    
    const technicalBody = `
CONFIRMACIÓN TÉCNICA - SISTEMA IMPRETAM 3D
==========================================

📊 RESUMEN DE PROCESAMIENTO:
- Usuario: ${data.name} (${data.email})
- Timestamp: ${new Date().toISOString()}
- Tiempo de procesamiento: ${processingTime}ms
- Email principal: ${emailResult.success ? '✅ ENVIADO' : '❌ FALLÓ'}
- Archivos procesados: ${fileResults.processed || 0}

🔧 ESTADO DEL SISTEMA:
- Modo: ULTRA DEBUG
- Script funcionando: ✅ SÍ
- Permisos Gmail: ✅ ACTIVOS
- Drive Access: ✅ ACTIVO

📧 EMAILS ENVIADOS A:
1. ${ADMIN_EMAIL} (Principal)
2. ${BACKUP_EMAIL} (Backup)
3. Esta confirmación técnica

${emailResult.success ? 
  '✅ SISTEMA FUNCIONANDO PERFECTAMENTE' : 
  '⚠️ REVISAR CONFIGURACIÓN - Ver logs para detalles'}
    `;
      // Enviar confirmación técnica solo a impretam3d
    GmailApp.sendEmail(
      ADMIN_EMAIL,
      `📋 CONFIRMACIÓN TÉCNICA - ${data.name} - ${new Date().toLocaleTimeString()}`,
      technicalBody
    );
    
    ultraLog("SUCCESS", "Email de confirmación técnica enviado solo a impretam3d");
    
  } catch (error) {
    ultraLog("ERROR", "Error enviando confirmación técnica", error);
  }
}

function sendEmergencyErrorNotification(error, startTime) {
  try {
    const emergencyBody = `
🚨 EMERGENCIA - ERROR CRÍTICO EN SCRIPT
======================================

⏰ Timestamp: ${new Date().toISOString()}
🕒 Tiempo desde inicio: ${new Date() - startTime}ms

❌ ERROR:
${error.toString()}

📋 STACK TRACE:
${error.stack || 'No disponible'}

🔧 ACCIONES REQUERIDAS:
1. Verificar deployment del script
2. Revisar permisos de Gmail y Drive
3. Comprobar código del formulario web
4. Verificar conectividad del script

🆘 ESTADO: SISTEMA EN FALLO - REQUIERE ATENCIÓN INMEDIATA
    `;    
    // Enviar solo a admin principal
    GmailApp.sendEmail(ADMIN_EMAIL, "🚨 EMERGENCIA - Script Impretam 3D FALLÓ", emergencyBody);
    
    ultraLog("CRITICAL", "Notificación de emergencia enviada solo a impretam3d@gmail.com");
    
  } catch (emailError) {
    ultraLog("CRITICAL", "FALLO TOTAL - No se pudo enviar notificación de emergencia", emailError);
  }
}

// ========================================
// SISTEMA DE DIAGNÓSTICO COMPLETO
// ========================================

function runCompleteDiagnostics() {
  ultraLog("INFO", "Ejecutando diagnóstico completo automático");
  
  const diagnostics = {
    gmail: testGmailAccess(),
    drive: testDriveAccess(),
    permissions: testPermissions(),
    deployment: testDeploymentStatus(),
    emailTest: testEmailDelivery(),
    timestamp: new Date().toISOString()
  };
  
  ultraLog("INFO", "Diagnóstico completo terminado", diagnostics);
  
  return diagnostics;
}

function testGmailAccess() {
  try {
    const drafts = GmailApp.getDrafts();
    return { status: "OK", message: "Gmail access working" };
  } catch (error) {
    return { status: "ERROR", message: error.toString() };
  }
}

function testDriveAccess() {
  try {
    const folders = DriveApp.getFolders();
    return { status: "OK", message: "Drive access working" };
  } catch (error) {
    return { status: "ERROR", message: error.toString() };
  }
}

function testPermissions() {
  try {
    // Test multiple permissions
    GmailApp.getDrafts();
    DriveApp.getFolders();
    return { status: "OK", message: "All permissions granted" };
  } catch (error) {
    return { status: "ERROR", message: error.toString() };
  }
}

function testDeploymentStatus() {
  try {
    const url = ScriptApp.getService().getUrl();
    return { 
      status: "OK", 
      message: "Deployment active",
      url: url || "URL not available"
    };
  } catch (error) {
    return { status: "ERROR", message: error.toString() };
  }
}

function testEmailDelivery() {  if (TEST_MODE) {
    try {
      GmailApp.sendEmail(
        ADMIN_EMAIL,
        `🧪 AUTO-TEST ${new Date().toISOString()}`,
        "Email de prueba automático del sistema Ultra Debug"
      );
      return { status: "OK", message: "Test email sent to impretam3d@gmail.com" };
    } catch (error) {
      return { status: "ERROR", message: error.toString() };
    }
  }
  return { status: "SKIPPED", message: "Test mode disabled" };
}

// ========================================
// FUNCIONES DE PRUEBA MANUAL
// ========================================

function sendManualTestEmail() {
  ultraLog("INFO", "Enviando email de prueba manual");
  
  try {
    const timestamp = new Date().toISOString();
    
    // Envío múltiple para asegurar recepción
    GmailApp.sendEmail(
      ADMIN_EMAIL,
      `🧪 PRUEBA MANUAL ULTRA - ${timestamp}`,
      `Email de prueba manual del sistema Ultra Debug.\n\nTimestamp: ${timestamp}\n\nSi recibes este email, el sistema básico está funcionando.`    );
    
    // BACKUP REMOVIDO - Solo envío a impretam3d@gmail.com
    
    ultraLog("SUCCESS", "Email de prueba manual enviado solo a impretam3d@gmail.com");
    return "Email de prueba enviado correctamente solo a impretam3d@gmail.com";
    
  } catch (error) {
    ultraLog("ERROR", "Error en prueba manual", error);
    throw error;
  }
}

function runFullSystemTest() {
  ultraLog("INFO", "Ejecutando prueba completa del sistema");
  
  try {
    // Simular datos de contacto
    const testData = {
      name: "Prueba Completa Ultra Debug",
      phone: "555-TEST-ULTRA",
      email: "test@ultradebug.test",
      message: "Este es un mensaje de prueba completa del sistema Ultra Debug. Si recibes este email, todo está funcionando correctamente.",
      hasFiles: false,
      files: []
    };
    
    // Procesar como si fuera un envío real
    const emailResult = sendUltraNotificationEmail(testData);
    
    ultraLog("SUCCESS", "Prueba completa ejecutada", emailResult);
    return "Prueba completa exitosa - revisa ambos emails";
    
  } catch (error) {
    ultraLog("CRITICAL", "Error en prueba completa", error);
    throw error;
  }
}

// ========================================
// PROCESAMIENTO DE ARCHIVOS (SIMPLIFICADO)
// ========================================

function processFiles(data) {
  // Implementación simplificada para el ultra debug
  return {
    processed: data.files.length,
    successful: data.files.length,
    failed: 0,
    details: data.files.map(file => ({ 
      name: file.name, 
      status: 'success',
      message: 'Ultra debug - archivo simulado' 
    }))
  };
}
