# Admin seguro en Cloudflare Pages

## Resumen

El area publica se mantiene en la raiz del proyecto para no romper las rutas actuales ni cambiar `wrangler.toml`.

El nuevo admin vive en `/admin/` y queda protegido por Cloudflare Pages Functions. No hay usuarios, contrasenas, tokens ni API keys en JavaScript publico.

Los datos internos se guardan en Cloudflare D1 con el binding `DB`.
Los archivos internos se guardan en Cloudflare R2 con el binding `IMP_FILES_BUCKET`.

## Archivos relevantes

- `/admin/`: panel interno, cotizador y editor.
- `/functions/admin/_middleware.js`: protege `/admin/*`.
- `/functions/admin/api/config.js`: API protegida usada por el admin para guardar y cargar configuracion y servicios.
- `/functions/admin/api/quotes.js`: API protegida usada por el cotizador para guardar y listar cotizaciones.
- `/functions/admin/api/files/*`: API protegida usada para subir, deduplicar, listar y borrar archivos en R2.
- `/functions/admin/api/storage/*`: API protegida usada para leer y recalcular uso estimado de storage.
- `/functions/api/admin/config.js`: alias protegido de la API interna.
- `/functions/_shared/admin-auth.js`: validacion Basic Auth con variables de entorno.
- `/migrations/0001_admin_schema.sql`: esquema SQL base para D1.
- `/migrations/0002_storage_controls.sql`: tablas de metadata, limites, uso y alertas de storage.
- `/_redirects` y `/functions/dashboard-i3d/_middleware.js`: redirigen el admin anterior a `/admin/`.

## Configuracion manual en Cloudflare

Crear estas variables de entorno en el proyecto de Cloudflare Pages:

- `ADMIN_USERNAME`: usuario del admin.
- `ADMIN_PASSWORD`: contrasena del admin.

Asignar la base D1 existente al proyecto de Cloudflare Pages. El binding actual del proyecto es `DB`, y el codigo tambien acepta `IMPRETAM3D_DB` como alias local:

- Binding: `DB`
- Binding alternativo aceptado: `IMPRETAM3D_DB`
- Database: `impretam3d-db`
- Database ID: `11960351-7df3-4aea-a7cb-ecb73691fda3`

Usar las mismas variables y binding en Production y Preview si quieres probar ramas antes de publicar.

Crear un bucket R2 y asignarlo al proyecto de Cloudflare Pages:

- Bucket: `impretam3d-files`
- Binding: `IMP_FILES_BUCKET`

El archivo `wrangler.toml` declara este binding para desarrollo local y despliegues con Wrangler.

Aplicar el esquema SQL en la base remota cuando Wrangler este autenticado:

```powershell
npx wrangler d1 execute impretam3d-db --remote --file ./migrations/0001_admin_schema.sql
npx wrangler d1 execute impretam3d-db --remote --file ./migrations/0002_storage_controls.sql
```

Las funciones tambien ejecutan `CREATE TABLE IF NOT EXISTS` al primer uso del admin, pero aplicar la migracion deja la base preparada antes del primer acceso.

## Datos guardados

La API `/admin/api/config` guarda configuracion en D1:

- `calculatorConfig`: material base, costo por gramo, costo por hora, margen e IVA.
- `siteContent`: textos principales, contacto publico, servicios y precios base.

La API `/admin/api/quotes` guarda el historial de cotizaciones en D1.

La API `/admin/api/files` usa R2 para binarios y D1 para metadata. No guarda archivos en base64 ni binarios en D1.

La API `/admin/api/storage/usage` muestra uso estimado sin listar R2. La API `/admin/api/storage/recalculate` recalcula desde metadata D1 para auditoria manual.

Tablas preparadas:

- `site_settings`
- `services`
- `quotes`
- `quote_items`
- `files`
- `file_objects`
- `file_links`
- `storage_usage_monthly`
- `storage_alerts`
- `storage_limits`

Los limites iniciales de storage son conservadores:

- Advertencia: 7 GB.
- Critico: 9 GB.
- Bloqueo de subidas nuevas: 10 GB.

Las alertas visibles se guardan en `storage_alerts`. Para email, configura una variable opcional:

- `STORAGE_ALERT_WEBHOOK_URL`: endpoint HTTPS que acepte JSON y envie la alerta.

Sin esa variable, no se envia email, pero el admin sigue mostrando alertas y bloqueando subidas al limite.

Si `IMPRETAM3D_DB` o `DB` no existen, el admin usa `localStorage` solo como respaldo de prueba en el navegador. Ese respaldo no comparte datos entre usuarios ni despliegues.

## Estado actual

- Listo ahora: ruta `/admin`, cotizador con historial D1, editor inicial con servicios/textos en D1, API protegida, neutralizacion del admin legado y redireccion desde `dashboard-i3d`.
- Listo ahora: pagina `/admin/archivos.html`, R2 como storage principal, deduplicacion por SHA-256, metadata D1, contadores mensuales y bloqueo preventivo de 10 GB.
- Requiere Cloudflare: crear `ADMIN_USERNAME`, `ADMIN_PASSWORD`, mantener D1 como `DB`, crear R2 `impretam3d-files`, asignar `IMP_FILES_BUCKET`, aplicar migraciones y hacer redeploy.
- Pendiente para una fase posterior: conectar el contenido guardado en `siteContent` para que actualice automaticamente las paginas publicas sin edicion manual.
