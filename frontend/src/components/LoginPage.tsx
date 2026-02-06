import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
    const { login, register, googleLogin } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                if (!name.trim()) {
                    setError('Nome é obrigatório');
                    setLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError('As senhas não coincidem');
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('A senha deve ter pelo menos 6 caracteres');
                    setLoading(false);
                    return;
                }
                await register(email, password, name);
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('');
        setLoading(true);
        try {
            await googleLogin(credentialResponse.credential);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Erro no login com Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h2>{mode === 'login' ? 'Entrar' : 'Criar Conta'}</h2>
                <p className="subtitle">
                    {mode === 'login'
                        ? 'Faça login para acessar todas as funcionalidades'
                        : 'Registre-se para começar a usar o SW Planner'}
                </p>

                {error && <div className="error-message">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Nome</label>
                            <input
                                type="text"
                                placeholder="Seu nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Senha</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Confirmar Senha</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="login-btn primary" disabled={loading}>
                        {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
                    </button>
                </form>

                <div className="divider">
                    <span>ou</span>
                </div>

                <div className="google-btn-wrapper">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Erro no login com Google')}
                        theme="filled_black"
                        size="large"
                        width="340"
                        text={mode === 'login' ? 'signin_with' : 'signup_with'}
                    />
                </div>

                <div className="toggle-mode">
                    {mode === 'login' ? (
                        <span>
                            Não tem conta?
                            <button onClick={() => { setMode('register'); setError(''); }}>
                                Criar conta
                            </button>
                        </span>
                    ) : (
                        <span>
                            Já tem conta?
                            <button onClick={() => { setMode('login'); setError(''); }}>
                                Entrar
                            </button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
