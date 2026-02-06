import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../config/api';

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    role: 'user' | 'admin';
    avatar_url?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    googleLogin: (credential: string) => Promise<void>;
    logout: () => void;
    isAdmin: boolean;
    isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
    const [isLoading, setIsLoading] = useState(true);

    const saveAuth = useCallback((newToken: string, newUser: AuthUser) => {
        localStorage.setItem('auth_token', newToken);
        setToken(newToken);
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
    }, []);

    // Validate existing token on mount
    useEffect(() => {
        const validateToken = async () => {
            const storedToken = localStorage.getItem('auth_token');
            if (!storedToken) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await api.get('/api/auth/me');
                if (response.data?.user) {
                    setUser(response.data.user);
                    setToken(storedToken);
                } else {
                    logout();
                }
            } catch {
                logout();
            } finally {
                setIsLoading(false);
            }
        };

        validateToken();
    }, [logout]);

    const loginFn = async (email: string, password: string) => {
        const response = await api.post('/api/auth/login', { email, password });
        if (response.data?.error) {
            throw new Error(response.data.error);
        }
        saveAuth(response.data.token, response.data.user);
    };

    const registerFn = async (email: string, password: string, name: string) => {
        const response = await api.post('/api/auth/register', { email, password, name });
        if (response.data?.error) {
            throw new Error(response.data.error);
        }
        saveAuth(response.data.token, response.data.user);
    };

    const googleLoginFn = async (credential: string) => {
        const response = await api.post('/api/auth/google', { credential });
        if (response.data?.error) {
            throw new Error(response.data.error);
        }
        saveAuth(response.data.token, response.data.user);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login: loginFn,
                register: registerFn,
                googleLogin: googleLoginFn,
                logout,
                isAdmin: user?.role === 'admin',
                isLoggedIn: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
