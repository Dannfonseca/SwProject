import { verifyToken, type AuthUser } from '../services/AuthService';
import { data } from '../data/provider';

/**
 * Extract user from Authorization header.
 * Returns the user or null if no valid token.
 */
export const extractUser = async (headers: Record<string, string | undefined>): Promise<AuthUser | null> => {
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await data.getUserById(payload.id);
    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url || undefined,
    };
};

/**
 * Require authenticated user — returns 401 if not logged in
 */
export const requireAuth = async (headers: Record<string, string | undefined>, set: any): Promise<AuthUser | null> => {
    const user = await extractUser(headers);
    if (!user) {
        set.status = 401;
        return null;
    }
    return user;
};

/**
 * Require admin role — returns 403 if not admin
 */
export const requireAdmin = async (headers: Record<string, string | undefined>, set: any): Promise<AuthUser | null> => {
    const user = await extractUser(headers);
    if (!user) {
        set.status = 401;
        return null;
    }
    if (user.role !== 'admin') {
        set.status = 403;
        return null;
    }
    return user;
};
