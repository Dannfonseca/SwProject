import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../config/api';
import './AdminUsers.css';

interface User {
    id: number;
    email: string;
    name: string;
    avatar_url?: string;
    role: string;
    created_at: string;
}

export const AdminUsers: React.FC = () => {
    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const response = await api.get('/api/users');
            return response.data.data as User[];
        },
    });

    if (isLoading) {
        return (
            <div className="admin-users">
                <h2>Usuários</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Carregando...</p>
            </div>
        );
    }

    return (
        <div className="admin-users">
            <h2>Usuários</h2>
            <p className="users-count">{users?.length ?? 0} usuários registrados</p>

            <table className="users-table">
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Registrado em</th>
                    </tr>
                </thead>
                <tbody>
                    {users?.map((user) => (
                        <tr key={user.id}>
                            <td>
                                <div className="user-info">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.name} className="user-avatar" />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span>{user.name}</span>
                                </div>
                            </td>
                            <td>{user.email}</td>
                            <td>
                                <span className={`role-badge ${user.role}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td>
                                {new Date(user.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
