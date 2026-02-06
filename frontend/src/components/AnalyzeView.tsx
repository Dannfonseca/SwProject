import React, { useState } from 'react';
import api from '../config/api';
import './AnalyzeView.css';

interface AIResult {
    name: string;
    element: string;
    stars: number;
    level: number;
}

interface AnalyzeViewProps {
    geminiKey?: string;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ geminiKey }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<AIResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResults([]);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', selectedFile);
        if (geminiKey) {
            formData.append('api_key', geminiKey);
        }

        try {
            const response = await api.post('/api/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Assume response data is the array of monsters
            setResults(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to analyze image. Ensure the backend is running and Gemini API key is set.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="analyze-container">
            <h1>Monster Box Analyzer</h1>
            <p className="description">Upload a screenshot of your monster box to identify monsters.</p>

            <div className="upload-section">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    id="file-upload"
                    className="file-input"
                />
                <label htmlFor="file-upload" className="file-label">
                    {selectedFile ? selectedFile.name : "Choose Screenshot"}
                </label>

                {previewUrl && (
                    <div className="image-preview">
                        <img src={previewUrl} alt="Preview" />
                    </div>
                )}

                <button
                    className="analyze-btn"
                    onClick={handleUpload}
                    disabled={!selectedFile || isLoading}
                >
                    {isLoading ? 'Analyzing...' : 'Analyze with AI'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {results.length > 0 && (
                <div className="results-section">
                    <h2>AI Identified Monsters:</h2>
                    <div className="results-grid">
                        {results.map((monster, index) => (
                            <div key={index} className="result-card">
                                <div className="result-name">{monster.name}</div>
                                <div className="result-details">
                                    {monster.stars}★ {monster.element}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
