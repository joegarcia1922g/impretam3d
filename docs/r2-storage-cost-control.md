# Control de costos y storage R2

## Objetivo

R2 guarda los archivos fisicos de Impretam 3D. D1 guarda metadata, relaciones, contadores y limites. El dashboard no lista el bucket en cada carga.

## Configuracion Cloudflare

1. Activar R2 en la cuenta.
2. Crear bucket:

```text
impretam3d-files
```

3. Agregar binding en Cloudflare Pages, en Production y Preview si aplica:

```text
Binding: IMP_FILES_BUCKET
Bucket: impretam3d-files
```

4. Mantener D1:

```text
Binding: DB o IMPRETAM3D_DB
Database: impretam3d-db
```

5. Aplicar migracion:

```powershell
npx wrangler d1 execute impretam3d-db --remote --file ./migrations/0002_storage_controls.sql
```

6. Opcional para email:

```text
STORAGE_ALERT_WEBHOOK_URL
```

Ese endpoint debe aceptar JSON. Puede ser Google Apps Script, Make, Zapier u otro servicio. No se guarda esa URL en JavaScript publico.

## Limites iniciales

- Advertencia: 7 GB.
- Critico: 9 GB.
- Bloqueo: 10 GB.

La app bloquea subidas nuevas cuando la subida proyectada pasa 10 GB. Esto ayuda a mantenerse dentro del margen gratuito inicial, pero no reemplaza las alertas de facturacion de Cloudflare.

Referencia de precios R2: https://developers.cloudflare.com/r2/pricing/

## APIs

- `POST /admin/api/files/prepare-upload`: valida hash, tipo, tamano y limite.
- `POST /admin/api/files/complete-upload`: sube a R2 y guarda metadata D1.
- `GET /admin/api/files`: lista metadata D1.
- `DELETE /admin/api/files/:id`: borra R2 y metadata cuando el admin lo pide.
- `GET /admin/api/storage/usage`: devuelve uso estimado desde D1.
- `POST /admin/api/storage/recalculate`: recalcula uso desde `file_objects`.

## Datos guardados

`file_objects` guarda un archivo fisico unico por SHA-256.

`file_links` relaciona el archivo con una cotizacion, pedido, cliente o registro general.

`storage_usage_monthly` guarda contadores del mes: subidas, duplicados evitados, descargas estimadas, deletes y operaciones estimadas.

`storage_alerts` evita spam: cada umbral se registra una vez por mes y por canal.

`storage_limits` permite ajustar limites sin cambiar el codigo.

## Eficiencia

- No se guarda base64.
- No se guardan binarios en D1.
- No se lista R2 para pintar el dashboard.
- Los contadores se actualizan al subir o borrar.
- La deduplicacion evita subir la misma STL, render, PDF o documento dos veces.
