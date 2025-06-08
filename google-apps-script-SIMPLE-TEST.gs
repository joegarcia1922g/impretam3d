// SCRIPT DE PRUEBA SIMPLE - Google Apps Script
// =============================================
// Este script mínimo solo envía un email de prueba
// Úsalo para verificar si el deployment está funcionando

function doGet() {
  return ContentService
    .createTextOutput("Script de prueba funcionando - " + new Date().toISOString())
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost() {
  try {
    // Enviar email inmediatamente
    GmailApp.sendEmail(
      'impretam3d@gmail.com', 
      '🧪 PRUEBA SIMPLE - ' + new Date().toISOString(),
      'Este es un email de prueba desde el script simple.\n\nSi recibes esto, el deployment está funcionando.'
    );
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: "Email enviado" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función para probar manualmente
function sendTestEmail() {
  GmailApp.sendEmail(
    'impretam3d@gmail.com',
    '🧪 PRUEBA MANUAL - Google Apps Script',
    'Este email fue enviado manualmente desde el editor de Apps Script.\n\nTimestamp: ' + new Date().toISOString()
  );
  
  console.log("Email de prueba enviado");
}
