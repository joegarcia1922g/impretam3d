// ========================================
// PRUEBA MANUAL - EJECUTAR EN GOOGLE APPS SCRIPT
// ========================================
// Copia esta función en tu Google Apps Script y ejecútala manualmente

function pruebaManualEmail() {
  console.log("🧪 Iniciando prueba manual de email");
  
  try {
    // Enviar email de prueba directo
    GmailApp.sendEmail(
      'impretam3d@gmail.com',
      '🧪 PRUEBA MANUAL - ' + new Date().toLocaleString(),
      `Este email fue enviado MANUALMENTE desde el editor de Google Apps Script.

✅ Si recibes este email, significa que:
1. Google Apps Script tiene permisos de Gmail
2. El script puede enviar emails
3. El problema está en el formulario web, no en el script

⚠️ Si NO recibes este email:
1. Revisa la carpeta de SPAM
2. Verifica que el email 'impretam3d@gmail.com' existe
3. Verifica permisos del script

Timestamp: ${new Date().toISOString()}
Deployment URL: ${ScriptApp.getService().getUrl()}
`
    );
    
    console.log("✅ Email de prueba manual enviado exitosamente");
    return "Email enviado exitosamente - revisa impretam3d@gmail.com";
    
  } catch (error) {
    console.error("❌ Error enviando email manual:", error);
    throw error;
  }
}

// Función para verificar permisos
function verificarPermisos() {
  console.log("🔑 Verificando permisos");
  
  try {
    // Verificar Gmail
    const drafts = GmailApp.getDrafts();
    console.log("✅ Acceso a Gmail: OK");
    
    // Verificar Drive
    const files = DriveApp.getFiles();
    console.log("✅ Acceso a Drive: OK");
    
    return "Todos los permisos están correctos";
    
  } catch (error) {
    console.error("❌ Error de permisos:", error);
    throw error;
  }
}
