import { requireAdmin } from '../_shared/admin-auth.js';

export async function onRequest(context) {
    return requireAdmin(context);
}
