import React, { useState } from 'react';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import './Settings.css';

interface SettingsProps {
    onKeyChange: (key: string) => void;
    currentKey: string;
}

export const Settings: React.FC<SettingsProps> = ({ onKeyChange, currentKey }) => {
    const [apiKey, setApiKey] = useState(currentKey);
    const { } = useAuth();

    const queryClient = useQueryClient();

    const handleSave = () => {
        onKeyChange(apiKey);
        alert('Settings saved!');
    };

    const handleClearDefenses = async () => {
        if (window.confirm('Are you sure you want to clear ALL registered defenses? This cannot be undone.')) {
            try {
                await api.delete('/api/defenses');
                queryClient.invalidateQueries({ queryKey: ['siege_defenses_backend'] });
                alert('Database cleared!');
            } catch (e) {
                alert('Error clearing database');
            }
        }
    };

    return (
        <div className="settings-container">
            <h1>Settings</h1>
            <div className="settings-card">
                <div className="setting-group">
                    <label htmlFor="apiKey">Gemini API Key</label>
                    <div className="input-row">
                        <input
                            type="password"
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Paste your Gemini API key here..."
                        />
                        <button onClick={handleSave} className="save-btn">Save</button>
                    </div>
                </div>
                <div className="setting-description">
                    <p>API keys are stored locally in your browser and used to power AI features like auto-translating skills and analyzing screenshots.</p>
                </div>

                <div className="danger-zone">
                    <h3>Danger Zone</h3>
                    <p>Permanently delete all custom siege defenses from the database.</p>
                    <button onClick={handleClearDefenses} className="clear-btn">Clear All Defenses</button>
                </div>
            </div>
        </div>
    );
};
