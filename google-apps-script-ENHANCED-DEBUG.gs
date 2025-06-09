// Google Apps Script MEJORADO - Impretam 3D Contact Form
// Versión con DIAGNÓSTICO AVANZADO para resolver problema de emails
// Basado en tu código actual + debug adicional

// CONFIGURACIÓN
const ADMIN_EMAIL = 'impretam3d@gmail.com';
const DEBUG_MODE = true; // Activar logs detallados

// CONFIGURACIÓN DE LA COLA
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID'; // Reemplaza con el ID de tu hoja de cálculo
const SHEET_NAME = 'ContactQueue';

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

// Función para inicializar la hoja de cálculo de la cola
function initializeQueue() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Name', 'Phone', 'Email', 'Message', 'Files']);
    debugLog(`✅ Hoja de cola creada: ${SHEET_NAME}`);
  } else {
    debugLog(`✅ Hoja de cola ya existe: ${SHEET_NAME}`);
  }
}

// Revisar y asegurar que cada solicitud se maneje de forma independiente
function doPost(e) {
  const startTime = new Date();
  debugLog("🎯 doPost iniciado");

  try {
    if (!e) {
      debugLog("❌ CRÍTICO: El objeto 'e' es undefined");
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Objeto 'e' es undefined - problema crítico en deployment",
        timestamp: startTime.toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    debugLog("📨 Datos recibidos", {
      hasParameter: !!e.parameter,
      parameterKeys: e.parameter ? Object.keys(e.parameter) : [],
      hasPostData: !!e.postData,
      postDataType: e.postData ? e.postData.type : null
    });

    let data;
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
      data.hasFiles = data.hasFiles === 'true';
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

    // Guardar en la cola
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    sheet.appendRow([
      new Date().toISOString(),
      data.name,
      data.phone,
      data.email,
      data.message,
      JSON.stringify(data.files)
    ]);

    debugLog("✅ Datos almacenados en la cola");

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Datos almacenados en la cola',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    debugLog("❌ Error crítico en doPost", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Función para procesar la cola
function processQueue() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    debugLog("📭 La cola está vacía");
    return;
  }

  for (let i = 1; i < rows.length; i++) {
    const [timestamp, name, phone, email, message, files] = rows[i];

    try {
      const emailSubject = `🔔 NUEVO CONTACTO: ${name} - Impretam 3D`;
      const emailBody = `
        Nombre: ${name}
        Teléfono: ${phone}
        Email: ${email}
        Mensaje: ${message}
        Archivos: ${files}
      `;

      GmailApp.sendEmail(ADMIN_EMAIL, emailSubject, emailBody);
      debugLog(`✅ Email enviado para ${name}`);

    } catch (error) {
      debugLog(`❌ Error enviando email para ${name}`, error);
    }
  }

  // Limpiar la cola
  sheet.deleteRows(2, rows.length - 1);
  debugLog("✅ Cola procesada y limpiada");
}

// Función para procesar archivos (misma lógica que tienes)
function processFiles(data) {
  debugLog("📁 Procesando archivos adjuntos");

  const results = { processed: 0, successful: 0, failed: 0, details: [], totalSize: 0 };

  try {
    const totalSize = data.files.reduce((sum, file) => sum + file.size, 0);
    results.totalSize = totalSize;
    debugLog(`📊 Tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Validar tamaño total
    if (totalSize > 50 * 1024 * 1024) {
      throw new Error("El tamaño total de los archivos excede el límite de 50MB.");
    }

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

    // Procesar cada archivo
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i];
      results.processed++;

      try {
        debugLog(`📎 Procesando archivo ${i + 1}/${data.files.length}: ${file.name}`);

        // Validar tamaño individual
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`El archivo "${file.name}" excede el límite de 50MB.`);
        }

        // Detectar tipo y extensión
        const fileName = file.name.toLowerCase();
        const hasValidExtension = fileName.includes('.') && fileName.lastIndexOf('.') > 0;

        if (!hasValidExtension) {
          throw new Error(`El archivo "${file.name}" no tiene una extensión válida.`);
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

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    debugLog("📂 Usando carpeta existente:", folderName);
    return folders.next();
  }
  debugLog("📂 Carpeta creada:", folderName);
  return DriveApp.createFolder(folderName);
}

function validateFile(file) {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error(`El archivo "${file.name}" excede el límite de 50MB.`);
  }
  if (!file.name.includes('.') || file.name.lastIndexOf('.') <= 0) {
    throw new Error(`El archivo "${file.name}" no tiene una extensión válida.`);
  }
}

function saveFileToDrive(file, folder, userName, index) {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [baseName, extension] = file.name.split(/\.(?=[^\.]+$)/);
  const driveFileName = `${baseName}_${userName}_${timestamp}_${index + 1}.${extension}`;
  const fileBlob = Utilities.newBlob(
    Utilities.base64Decode(file.content),
    file.type || 'application/octet-stream',
    driveFileName
  );
  const driveFile = folder.createFile(fileBlob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return driveFile;
}

function handleFileError(file, error, results) {
  debugLog(`❌ Error procesando archivo ${file.name}`, error);
  results.failed++;
  results.details.push({
    name: file.name,
    size: file.size,
    error: error.message,
    status: 'error'
  });
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
