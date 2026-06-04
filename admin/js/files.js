const MAX_CLIENT_UPLOAD_BYTES = 100 * 1024 * 1024;

function hexFromBuffer(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function hashFile(file) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return hexFromBuffer(digest);
}

function statusClass(state) {
    if (state === 'normal') return 'success';
    if (state === 'warning') return 'warning';
    return 'error';
}

function stateLabel(state) {
    return {
        normal: 'Normal',
        warning: 'Advertencia',
        critical: 'Critico',
        blocked: 'Bloqueado'
    }[state] || 'Sin datos';
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function renderUsage(payload) {
    const usage = payload && payload.usage ? payload.usage : payload;
    if (!usage || !usage.status) {
        return;
    }

    setText('storageUsed', `${AdminStorage.formatBytes(usage.bytesStored)} / ${AdminStorage.formatBytes(usage.limits.blockBytes)}`);
    setText('storageRemaining', AdminStorage.formatBytes(usage.status.remainingBytes));
    setText('storageFiles', String(usage.fileObjects || 0));
    setText('storageDuplicates', String(usage.duplicateUploads || 0));
    setText('storageUploads', String(usage.uploads || 0));
    setText('storageState', stateLabel(usage.status.state));

    const fill = document.getElementById('storageMeterFill');
    if (fill) {
        fill.style.width = `${Math.max(0, Math.min(usage.status.percentage, 100)).toFixed(2)}%`;
        fill.dataset.state = usage.status.state;
    }

    const status = document.getElementById('storageStatus');
    const percentage = usage.status.percentage.toFixed(1);
    AdminStorage.setStatus(
        status,
        `${stateLabel(usage.status.state)}: ${percentage}% usado. Limite preventivo ${AdminStorage.formatBytes(usage.limits.blockBytes)}.`,
        statusClass(usage.status.state)
    );
}

function fileRow(file) {
    const row = document.createElement('div');
    row.className = 'file-row';

    const meta = document.createElement('div');
    meta.className = 'file-meta';

    const name = document.createElement('strong');
    name.textContent = file.filename;

    const detail = document.createElement('span');
    detail.textContent = `${AdminStorage.formatBytes(file.sizeBytes)} · ${file.contentType || 'tipo desconocido'} · enlaces ${file.linkCount || 0}`;

    const key = document.createElement('code');
    key.textContent = file.storageKey;

    meta.append(name, detail, key);

    const hash = document.createElement('code');
    hash.className = 'file-hash';
    hash.textContent = file.sha256.slice(0, 16);

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'button danger';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Eliminar';
    deleteButton.dataset.fileId = file.id;

    actions.append(deleteButton);
    row.append(meta, hash, actions);
    return row;
}

async function loadUsage() {
    const response = await AdminStorage.getStorageUsage();
    if (response.ok) {
        renderUsage(response);
        return response;
    }

    AdminStorage.setStatus(
        document.getElementById('storageStatus'),
        response.message || 'No se pudo leer el uso de storage.',
        'error'
    );
    return response;
}

async function loadFiles() {
    const response = await AdminStorage.listFiles(50);
    const list = document.getElementById('filesList');
    list.innerHTML = '';

    if (!response.ok) {
        AdminStorage.setStatus(
            document.getElementById('filesStatus'),
            response.message || 'No se pudo cargar la lista de archivos.',
            'error'
        );
        return;
    }

    if (!response.files.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Todavia no hay archivos guardados en R2.';
        list.append(empty);
        return;
    }

    response.files.forEach((file) => {
        list.append(fileRow(file));
    });
}

function readUploadMetadata(file, sha256) {
    return {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        sha256,
        relatedType: document.getElementById('relatedType').value,
        relatedId: document.getElementById('relatedId').value,
        label: document.getElementById('fileLabel').value
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const uploadButton = document.getElementById('uploadButton');
    const uploadStatus = document.getElementById('uploadStatus');
    const fileHash = document.getElementById('fileHash');
    const refreshStorage = document.getElementById('refreshStorage');
    const recalculateStorage = document.getElementById('recalculateStorage');
    const filesList = document.getElementById('filesList');

    let selectedFile = null;
    let selectedHash = '';

    await Promise.all([loadUsage(), loadFiles()]);

    refreshStorage.addEventListener('click', async () => {
        await Promise.all([loadUsage(), loadFiles()]);
    });

    recalculateStorage.addEventListener('click', async () => {
        recalculateStorage.disabled = true;
        const response = await AdminStorage.recalculateStorage();
        recalculateStorage.disabled = false;

        if (response.ok) {
            renderUsage(response);
            AdminStorage.setStatus(uploadStatus, 'Uso recalculado desde metadata D1.', 'success');
        } else {
            AdminStorage.setStatus(uploadStatus, response.message || 'No se pudo recalcular el uso.', 'error');
        }
    });

    fileInput.addEventListener('change', async () => {
        selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        selectedHash = '';

        if (!selectedFile) {
            fileHash.textContent = 'Selecciona un archivo';
            return;
        }

        if (selectedFile.size > MAX_CLIENT_UPLOAD_BYTES) {
            fileHash.textContent = 'Archivo mayor a 100 MB';
            AdminStorage.setStatus(uploadStatus, 'El limite inicial por archivo es 100 MB.', 'error');
            return;
        }

        fileHash.textContent = 'Calculando...';
        selectedHash = await hashFile(selectedFile);
        fileHash.textContent = selectedHash;
        AdminStorage.setStatus(uploadStatus, `${selectedFile.name} listo para preparar subida.`, 'success');
    });

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!selectedFile || !selectedHash) {
            AdminStorage.setStatus(uploadStatus, 'Selecciona un archivo valido antes de subir.', 'error');
            return;
        }

        uploadButton.disabled = true;
        AdminStorage.setStatus(uploadStatus, 'Revisando limite y duplicados...', 'warning');

        const metadata = readUploadMetadata(selectedFile, selectedHash);
        const prepared = await AdminStorage.prepareUpload(metadata);

        if (!prepared.ok) {
            uploadButton.disabled = false;
            if (prepared.usage) {
                renderUsage(prepared);
            }
            AdminStorage.setStatus(uploadStatus, prepared.message || 'No se pudo preparar la subida.', 'error');
            return;
        }

        if (prepared.duplicate) {
            uploadButton.disabled = false;
            renderUsage(prepared);
            await loadFiles();
            AdminStorage.setStatus(uploadStatus, 'Duplicado evitado. Se reutilizo el archivo existente.', 'success');
            uploadForm.reset();
            fileHash.textContent = 'Selecciona un archivo';
            selectedFile = null;
            selectedHash = '';
            return;
        }

        AdminStorage.setStatus(uploadStatus, 'Subiendo archivo a R2...', 'warning');

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('sha256', selectedHash);
        formData.append('storageKey', prepared.storageKey);
        formData.append('relatedType', metadata.relatedType);
        formData.append('relatedId', metadata.relatedId);
        formData.append('label', metadata.label);

        const completed = await AdminStorage.completeUpload(formData);
        uploadButton.disabled = false;

        if (!completed.ok) {
            if (completed.usage) {
                renderUsage(completed);
            }
            AdminStorage.setStatus(uploadStatus, completed.message || 'No se pudo completar la subida.', 'error');
            return;
        }

        renderUsage(completed);
        await loadFiles();
        AdminStorage.setStatus(
            uploadStatus,
            completed.duplicate ? 'Duplicado evitado. Se reutilizo el archivo existente.' : 'Archivo guardado en R2 y metadata D1.',
            'success'
        );
        uploadForm.reset();
        fileHash.textContent = 'Selecciona un archivo';
        selectedFile = null;
        selectedHash = '';
    });

    filesList.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-file-id]');
        if (!button) {
            return;
        }

        if (!window.confirm('Eliminar este archivo de R2 si no debe conservarse?')) {
            return;
        }

        button.disabled = true;
        const response = await AdminStorage.deleteFile(button.dataset.fileId);
        button.disabled = false;

        if (!response.ok) {
            AdminStorage.setStatus(
                document.getElementById('filesStatus'),
                response.message || 'No se pudo eliminar el archivo.',
                'error'
            );
            return;
        }

        renderUsage(response);
        await loadFiles();
        AdminStorage.setStatus(
            document.getElementById('filesStatus'),
            response.deletedPhysicalObject ? 'Archivo eliminado y bytes liberados.' : 'Relacion eliminada. El archivo sigue en uso.',
            'success'
        );
    });
});
