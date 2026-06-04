const encoder = new TextEncoder();

function timingSafeEqual(left, right) {
    const leftBytes = encoder.encode(String(left || ''));
    const rightBytes = encoder.encode(String(right || ''));
    const maxLength = Math.max(leftBytes.length, rightBytes.length);

    if (maxLength === 0) {
        return false;
    }

    let diff = leftBytes.length ^ rightBytes.length;
    for (let index = 0; index < maxLength; index += 1) {
        diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
    }

    return diff === 0;
}

function unauthorizedResponse() {
    return new Response('Autenticacion requerida.', {
        status: 401,
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain; charset=UTF-8',
            'WWW-Authenticate': 'Basic realm="Impretam 3D Admin", charset="UTF-8"'
        }
    });
}

function notConfiguredResponse() {
    return new Response('Admin no configurado. Define ADMIN_USERNAME y ADMIN_PASSWORD en Cloudflare Pages.', {
        status: 503,
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain; charset=UTF-8'
        }
    });
}

function readBasicAuth(request) {
    const header = request.headers.get('Authorization') || '';

    if (!header.startsWith('Basic ')) {
        return null;
    }

    try {
        const decoded = atob(header.slice(6));
        const separatorIndex = decoded.indexOf(':');

        if (separatorIndex === -1) {
            return null;
        }

        return {
            username: decoded.slice(0, separatorIndex),
            password: decoded.slice(separatorIndex + 1)
        };
    } catch (_error) {
        return null;
    }
}

export function assertAdmin(request, env) {
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
        return { ok: false, response: notConfiguredResponse() };
    }

    const credentials = readBasicAuth(request);
    const validUser = credentials && timingSafeEqual(credentials.username, env.ADMIN_USERNAME);
    const validPassword = credentials && timingSafeEqual(credentials.password, env.ADMIN_PASSWORD);

    if (!validUser || !validPassword) {
        return { ok: false, response: unauthorizedResponse() };
    }

    return { ok: true };
}

export async function requireAdmin(context) {
    const auth = assertAdmin(context.request, context.env);

    if (!auth.ok) {
        return auth.response;
    }

    const response = await context.next();
    const securedResponse = new Response(response.body, response);
    securedResponse.headers.set('Cache-Control', 'no-store');
    return securedResponse;
}
