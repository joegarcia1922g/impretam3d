// Google Apps Script para manejar formulario con múltiples archivos y enviar a Drive + Gmail (hasta 50MB total)
// VERSIÓN FINAL CON SOPORTE MÚLTIPLES ARCHIVOS - 7 Junio 2025

// Función para manejar peticiones GET (diagnóstico y CORS)
function doGet(e) {
  console.log("🔍 doGet iniciado - petición de diagnóstico");
  
  const output = ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script funcionando correctamente",
    timestamp: new Date().toISOString(),
    version: "2.3-FINAL"
  }));
  
  output.setMimeType(ContentService.MimeType.JSON);
  
  return output;
}

function doPost(e) {
  try {
    console.log("🎯 doPost iniciado");
    
    // Verificar si e existe
    if (!e) {
      console.error("❌ Error: El objeto 'e' es undefined");
      
      // Enviar email de debug cuando e es undefined
      const debugEmailSubject = "🐛 DEBUG - doPost llamado sin parámetros - Impretam 3D";
      const debugEmailBody = `
DEBUG: doPost fue llamado pero el objeto 'e' es undefined.

Timestamp: ${new Date().toISOString()}
Posibles causas:
1. Error en el deployment de Google Apps Script
2. Problema en el envío del formulario
3. Issue con CORS o headers

Verificar el deployment y el código del formulario.
      `;
      
      try {
        GmailApp.sendEmail('impretam3d@gmail.com', debugEmailSubject, debugEmailBody);
        console.log("📧 Email de debug enviado");
      } catch (emailError) {
        console.error("❌ Error enviando email de debug:", emailError);
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false, 
          error: "Objeto 'e' es undefined - problema en el deployment o en el envío"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log("📨 Datos recibidos:", JSON.stringify(e));
    console.log("📨 Parámetros:", e.parameter ? JSON.stringify(e.parameter) : "No parameter");
    console.log("📨 PostData:", e.postData ? JSON.stringify(e.postData) : "No postData");
    
    let data;
    
    // Verificar si los datos vienen como parámetros de formulario (método preferido)
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      // Método formulario tradicional
      data = e.parameter;
      console.log("✅ Usando datos de parámetros de formulario:", data);
        // Convertir hasFiles de string a boolean
      data.hasFiles = data.hasFiles === 'true';
      
      // Convertir archivos de string a array si existe
      if (data.files && typeof data.files === 'string') {
        try {
          data.files = JSON.parse(data.files);
        } catch (fileParseError) {
          console.log("⚠️ Error parseando archivos, continuando sin archivos");
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
      // Método fetch con JSON (fallback)
      try {
        data = JSON.parse(e.postData.contents);
        console.log("✅ Datos JSON parseados:", data);
      } catch (parseError) {
        console.error("❌ Error parseando JSON:", parseError);
        throw new Error("Error parseando datos JSON: " + parseError.message);
      }
    } else {
      // Si no hay parámetros ni postData, crear datos de ejemplo para debug
      console.log("⚠️ No se recibieron datos válidos. Creando datos de ejemplo para debug.");      data = {
        name: "Test Debug User",
        phone: "No proporcionado",
        email: "debug@test.com",
        message: "Mensaje de debug - no se recibieron datos válidos en el formulario",
        hasFiles: false,
        files: []
      };
      console.log("🔧 Usando datos de debug:", data);
    }    // Verificar si hay archivos adjuntos
    const hasFiles = data.hasFiles && data.files && data.files.length > 0;
    console.log("📎 ¿Tiene archivos?", hasFiles);
    console.log("📎 data.hasFiles:", data.hasFiles);
    console.log("📎 data.files:", data.files ? `${data.files.length} archivo(s)` : "Sin archivos");
    
    let fileUrls = [];
    let totalSize = 0;
    let fileDetails = [];
    
    if (hasFiles) {
      console.log("📁 Procesando archivos adjuntos...");
      
      // Calcular tamaño total
      totalSize = data.files.reduce((sum, file) => sum + file.size, 0);
      console.log(`📊 Tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Procesar cada archivo
      for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];
        console.log(`📎 Procesando archivo ${i + 1}/${data.files.length}: ${file.name}`);
        
        let fileType = "archivo";
        let fileIcon = "📎";
          // Detectar tipo de archivo para mejor manejo y validar extensión
        const fileName = file.name.toLowerCase();
        const hasValidExtension = fileName.includes('.') && fileName.lastIndexOf('.') > 0;
        
        if (!hasValidExtension) {
          console.error(`❌ Archivo sin extensión válida: ${file.name}`);
          throw new Error(`El archivo "${file.name}" no tiene una extensión válida`);
        }
        
        if (fileName.endsWith('.pdf')) { 
          fileType = "PDF"; 
          fileIcon = "📄"; 
        } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) { 
          fileType = "imagen"; 
          fileIcon = "🖼️"; 
        } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) { 
          fileType = "documento Word"; 
          fileIcon = "📝"; 
        } else if (fileName.endsWith('.txt')) { 
          fileType = "archivo de texto"; 
          fileIcon = "📄"; 
        } else if (fileName.endsWith('.stl')) { 
          fileType = "modelo 3D STL"; 
          fileIcon = "🔷"; 
        } else if (fileName.endsWith('.3mf')) { 
          fileType = "modelo 3D 3MF"; 
          fileIcon = "🔷"; 
        } else if (fileName.endsWith('.obj')) { 
          fileType = "modelo 3D OBJ"; 
          fileIcon = "🔷"; 
        }
          console.log(`📎 Tipo detectado: ${fileType} (${fileIcon})`);
        
        try {
          // Crear archivo en Google Drive preservando la extensión original
          const originalName = file.name;
          const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
          const extension = originalName.substring(originalName.lastIndexOf('.'));
          const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');
          const driveFileName = `${baseName}_${data.name}_${timestamp}_${i + 1}${extension}`;
          
          console.log(`📁 Archivo original: ${originalName}`);
          console.log(`📁 Nombre en Drive: ${driveFileName}`);
          console.log(`📁 Extensión preservada: ${extension}`);
          
          // Buscar o crear carpeta "Impretam3D_Contactos"
          let folder;
          const folderName = "Impretam3D_Contactos";
          const folders = DriveApp.getFoldersByName(folderName);
          
          if (folders.hasNext()) {
            folder = folders.next();
            console.log("📂 Usando carpeta existente:", folderName);
          } else {
            folder = DriveApp.createFolder(folderName);
            console.log("📂 Carpeta creada:", folderName);
          }
          
          // Convertir base64 a blob con nombre y tipo correctos
          const fileBlob = Utilities.newBlob(
            Utilities.base64Decode(file.content), 
            file.type || 'application/octet-stream', 
            driveFileName
          );
          
          console.log(`💾 Creando archivo en Drive dentro de la carpeta "${folderName}"...`);
          console.log(`📋 Tipo MIME: ${file.type || 'application/octet-stream'}`);
          console.log(`📋 Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
            const driveFile = folder.createFile(fileBlob);
          console.log("✅ Archivo creado en carpeta:", driveFile.getId());
          console.log("✅ Nombre final del archivo:", driveFile.getName());
          
          // Verificar que el archivo se creó con la extensión correcta
          const finalName = driveFile.getName();
          if (!finalName.endsWith(extension)) {
            console.warn(`⚠️ Advertencia: El archivo se guardó como "${finalName}" pero se esperaba que terminara en "${extension}"`);
          }
          
          // Hacer el archivo público
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          const fileUrl = driveFile.getUrl();
          console.log("🔗 URL del archivo:", fileUrl);
          
          fileUrls.push(fileUrl);
          fileDetails.push({
            name: file.name,
            type: fileType,
            icon: fileIcon,
            size: file.size,
            url: fileUrl,
            driveId: driveFile.getId(),
            finalName: finalName
          });
          
        } catch (fileError) {
          console.error(`❌ Error procesando archivo ${file.name}:`, fileError);
          console.error(`❌ Stack trace:`, fileError.stack);
          
          // Continuar con el siguiente archivo si hay error
          fileDetails.push({
            name: file.name,
            type: fileType,
            icon: fileIcon,
            size: file.size,
            url: null,
            error: `Error al subir archivo: ${fileError.message}`
          });
        }
      }
        // Crear archivo de texto con los datos del formulario y lista de archivos EN LA MISMA CARPETA
      try {
        const textFileName = `Contacto_${data.name}_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.txt`;
        const fileList = fileDetails.map(detail => 
          `- ${detail.name} (${detail.type}, ${(detail.size / 1024 / 1024).toFixed(2)} MB)${detail.error ? ' - ERROR: ' + detail.error : ''}`
        ).join('\n');
        
        const fileContent = `
Formulario de Contacto - Impretam 3D
====================================
Fecha: ${new Date().toLocaleString()}
Nombre: ${data.name}
Teléfono: ${data.phone}
Email: ${data.email}
Mensaje: ${data.message}

Archivos adjuntos (${data.files.length} archivo(s), ${(totalSize / 1024 / 1024).toFixed(2)} MB total):
${fileList}
        `;
        
        // Buscar la carpeta nuevamente para el archivo de texto
        const folderName = "Impretam3D_Contactos";
        const folders = DriveApp.getFoldersByName(folderName);
        let folder;
        
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(folderName);
        }
        
        const textFile = folder.createFile(textFileName, fileContent, 'text/plain');
        console.log("✅ Archivo de datos creado en carpeta:", textFile.getId());
      } catch (textFileError) {
        console.error("❌ Error creando archivo de texto:", textFileError);
      }
    } else {
      console.log("📧 Solo mensaje de texto - sin archivos en Drive (optimización de cuota)");
    }    // Preparar email (siempre se envía)
    const emailSubject = `Nuevo contacto de ${data.name} - Impretam 3D${hasFiles ? ` (con ${data.files.length} archivo(s) adjunto(s))` : ''}`;
    
    let filesSection = '';
    if (hasFiles) {
      const successfulFiles = fileDetails.filter(f => f.url);
      const failedFiles = fileDetails.filter(f => !f.url);
        if (successfulFiles.length > 0) {
        filesSection += `\n📎 Archivos adjuntos (${successfulFiles.length}/${data.files.length} subidos exitosamente, ${(totalSize / 1024 / 1024).toFixed(2)} MB total):\n`;
        successfulFiles.forEach((file, index) => {
          filesSection += `${index + 1}. ${file.icon} ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB)\n`;
          filesSection += `   📁 Guardado como: ${file.finalName || 'N/A'}\n`;
          filesSection += `   🔗 ${file.url}\n`;
          if (file.driveId) {
            filesSection += `   🆔 ID: ${file.driveId}\n`;
          }
          filesSection += `\n`;
        });
      }
      
      if (failedFiles.length > 0) {
        filesSection += `\n❌ Archivos con errores (${failedFiles.length}):\n`;
        failedFiles.forEach((file, index) => {
          filesSection += `${index + 1}. ${file.icon} ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB) - ${file.error}\n`;
        });
      }
    } else {
      filesSection = '\n📝 Sin archivos adjuntos';
    }
    
    const emailBody = `
Se ha recibido un nuevo mensaje de contacto:

Nombre: ${data.name}
Teléfono: ${data.phone}
Email: ${data.email}
Mensaje: ${data.message}
${filesSection}

---
Sistema automático de Impretam 3D
    `;
    
    console.log("📧 Enviando email...");
    GmailApp.sendEmail('impretam3d@gmail.com', emailSubject, emailBody);
    console.log("✅ Email enviado");    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        message: 'Mensaje enviado correctamente',
        savedToDrive: hasFiles,
        filesProcessed: hasFiles ? data.files.length : 0,
        totalSize: hasFiles ? totalSize : 0
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error("❌ Error en doPost:", error);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false, 
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función para manejar peticiones OPTIONS (CORS preflight)
function doOptions(e) {
  console.log("🌐 doOptions iniciado - CORS preflight");
  
  const output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.TEXT);
  
  return output;
}

// Función de prueba mejorada con debug
function testFunction() {
  try {
    console.log("🚀 Iniciando función de prueba...");
    
    // Crear datos de prueba directamente para evitar problemas con doPost
    console.log("📧 Enviando email de prueba directo...");
    
    const emailSubject = "🧪 Prueba - Nuevo contacto de Test User - Impretam 3D";
    const emailBody = `
Se ha recibido un nuevo mensaje de contacto (PRUEBA):

Nombre: Test User
Teléfono: 1234567890
Email: test@example.com
Mensaje: Este es un mensaje de prueba

---
Sistema automático de Impretam 3D (Prueba)
    `;
    
    GmailApp.sendEmail('impretam3d@gmail.com', emailSubject, emailBody);
    console.log("✅ Email de prueba enviado");
    
    // Crear archivo de prueba en Drive
    console.log("💾 Creando archivo de prueba en Drive...");
    const fileName = `PRUEBA_Contacto_Test_User_${new Date().toISOString().slice(0,10)}.txt`;
    const fileContent = `
Formulario de Contacto - Impretam 3D (PRUEBA)
============================================
Fecha: ${new Date().toLocaleString()}
Nombre: Test User
Teléfono: 1234567890
Email: test@example.com
Mensaje: Este es un mensaje de prueba
    `;
    
    const file = DriveApp.createFile(fileName, fileContent, 'text/plain');
    console.log("✅ Archivo de prueba creado:", file.getId());
    console.log("🔗 URL del archivo:", file.getUrl());
    
    return "Prueba completada exitosamente";
    
  } catch (error) {
    console.error("❌ Error en testFunction:", error);
    throw error;
  }
}

// Función de debug para analizar qué está pasando
function debugFunction() {
  try {
    console.log("🔍 Función de debug iniciada");
    console.log("📅 Fecha actual:", new Date().toISOString());
    console.log("🔧 Script funcionando correctamente");
    
    return "Debug completado - " + new Date().toISOString();
  } catch (error) {
    console.error("❌ Error en debugFunction:", error);
    throw error;
  }
}

// Función auxiliar para probar solo permisos
function testPermissions() {
  try {
    console.log("🔑 Probando permisos...");
    
    // Probar Drive
    const folders = DriveApp.getFolders();
    console.log("✅ Acceso a Drive: OK");
    
    // Probar Gmail
    const drafts = GmailApp.getDrafts();
    console.log("✅ Acceso a Gmail: OK");
    
    console.log("🎉 Todos los permisos están correctos");
    return "Permisos verificados correctamente";
    
  } catch (error) {
    console.error("❌ Error de permisos:", error);
    throw error;
  }
}
