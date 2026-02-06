import { OAuth2Client } from 'google-auth-library';
import { data } from '../data/provider';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    role: 'user' | 'admin';
    avatar_url?: string;
}

interface TokenPayload {
    id: number;
    email: string;
    role: string;
}

/**
 * Hash a password using Bun's built-in bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
    return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return Bun.password.verify(password, hash);
};

/**
 * Generate a JWT token manually (HMAC-SHA256)
 */
export const generateToken = (user: { id: number; email: string; role: string }): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };

    const encode = (obj: object) =>
        Buffer.from(JSON.stringify(obj)).toString('base64url');

    const headerB64 = encode(header);
    const payloadB64 = encode(payload);
    const data = `${headerB64}.${payloadB64}`;

    const hmac = new Bun.CryptoHasher('sha256', secret);
    hmac.update(data);
    const signature = Buffer.from(hmac.digest()).toString('base64url');

    return `${data}.${signature}`;
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): TokenPayload | null => {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;
        const data = `${headerB64}.${payloadB64}`;

        const hmac = new Bun.CryptoHasher('sha256', secret);
        hmac.update(data);
        const expectedSig = Buffer.from(hmac.digest()).toString('base64url');

        if (expectedSig !== signatureB64) return null;

        const payload = JSON.parse(Buffer.from(payloadB64!, 'base64url').toString());

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return { id: payload.id, email: payload.email, role: payload.role };
    } catch {
        return null;
    }
};

/**
 * Register a new user with email/password
 */
export const register = async (email: string, password: string, name: string) => {
    const existing = await data.getUserByEmail(email);
    if (existing) {
        throw new Error('Email já está em uso');
    }

    const passwordHash = await hashPassword(password);
    const user = await data.createUser({ email, name, password_hash: passwordHash });

    const token = generateToken(user);
    return { token, user: sanitizeUser(user) };
};

/**
 * Login with email/password
 */
export const login = async (email: string, password: string) => {
    const user = await data.getUserByEmail(email);
    if (!user || !user.password_hash) {
        throw new Error('Email ou senha inválidos');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
        throw new Error('Email ou senha inválidos');
    }

    const token = generateToken(user);
    return { token, user: sanitizeUser(user) };
};

/**
 * Login/Register with Google ID token
 */
export const googleLogin = async (idToken: string) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');

    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        throw new Error('Invalid Google token');
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists by google_id
    let user = await data.getUserByGoogleId(googleId!);

    if (!user) {
        // Check if user exists by email (link accounts)
        user = await data.getUserByEmail(email);
        if (user) {
            // Link Google to existing account
            await data.updateUser(user.id, { google_id: googleId, avatar_url: picture });
            user.google_id = googleId!;
            user.avatar_url = picture || null;
        } else {
            // Create new user
            user = await data.createUser({
                email,
                name: name || email.split('@')[0],
                google_id: googleId,
                avatar_url: picture,
            });
        }
    }

    const token = generateToken(user);
    return { token, user: sanitizeUser(user) };
};

/**
 * Remove sensitive fields before sending to client
 */
const sanitizeUser = (user: any): AuthUser => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar_url: user.avatar_url || undefined,
});
