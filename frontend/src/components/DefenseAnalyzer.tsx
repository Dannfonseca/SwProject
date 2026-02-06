import React, { useState } from 'react';
import api from '../config/api';
import './DefenseAnalyzer.css';



interface DefenseAnalyzerProps {
    geminiKey?: string;
}

const DefenseAnalyzer: React.FC<DefenseAnalyzerProps> = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState<{ detected: string[], matches: any[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            const availableSlots = 10 - selectedFiles.length;
            const filesToAdd = newFiles.slice(0, availableSlots);

            if (filesToAdd.length === 0) return;

            const newUrls = filesToAdd.map(file => URL.createObjectURL(file));

            setSelectedFiles(prev => [...prev, ...filesToAdd]);
            setPreviewUrls(prev => [...prev, ...newUrls]);
            setResults(null);
            setError(null);
            event.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => {
            const newUrls = [...prev];
            URL.revokeObjectURL(newUrls[index]);
            return newUrls.filter((_, i) => i !== index);
        });
        setResults(null);
    };

    const handleAnalyze = async () => {
        if (selectedFiles.length === 0) return;
        setAnalyzing(true);
        setError(null);

        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await api.post('/api/analyze/images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResults(response.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="da-root">
            <div className="da-shell">
                <div className="da-header">
                    <div>
                        <div className="da-badge">Analyzer</div>
                        <h1 className="da-title">Defense Architect</h1>
                    </div>
                    {results && (
                        <button
                            onClick={() => { setResults(null); setSelectedFiles([]); setPreviewUrls([]); }}
                            className="da-reset-btn"
                        >
                            Reset / Start Over
                        </button>
                    )}
                </div>

                <div className="da-grid">
                    <div className="da-left">
                        <div className="da-card">
                            <div className="da-card-head">
                                <h3 className="da-card-title">Screenshots</h3>
                                <span className="da-count-pill">{selectedFiles.length}/10</span>
                            </div>
                            <p className="da-card-sub">
                                Envie prints do seu box. Recomendado: 2 a 6 imagens bem n�tidas.
                            </p>

                            <div className="da-preview-grid">
                                {previewUrls.map((url, i) => (
                                    <div key={i} className="da-preview-item" onClick={() => setLightboxImage(url)}>
                                        <img src={url} alt={`Preview ${i}`} />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                            className="da-remove-btn"
                                        >
                                            �
                                        </button>
                                    </div>
                                ))}

                                {selectedFiles.length < 10 && (
                                    <label className="da-add">
                                        <div className="da-add-icon">+</div>
                                        <div className="da-add-text">
                                            <span>Adicionar</span>
                                            <small>Arraste ou clique</small>
                                        </div>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="da-hidden"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                )}
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={selectedFiles.length === 0 || analyzing}
                                className="da-analyze-btn"
                            >
                                {analyzing ? 'Analyzing�' : 'Analyze Box'}
                            </button>

                            {error && (
                                <div className="da-error">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="da-right">
                        {!results ? (
                            <div className="da-placeholder">
                                <div className="da-placeholder-icon">Analyzer</div>
                                <h3>Ready to Analyze</h3>
                                <p>
                                    Upload screenshots of your monster box (max 10).
                                    We will detect your units and match them to known Siege Defenses.
                                </p>
                            </div>
                        ) : (
                            <div className="da-results">
                                <div className="da-card">
                                    <div className="da-section-title">
                                        Detected Units ({results.detected.length})
                                    </div>
                                    <div className="da-tags">
                                        {results.detected.length > 0 ? (
                                            results.detected.map((mon: string, i: number) => (
                                                <span key={i} className="da-tag">{mon}</span>
                                            ))
                                        ) : (
                                            <span className="da-empty">No units detected.</span>
                                        )}
                                    </div>
                                </div>

                                <div className="da-section">
                                    <h3 className="da-section-title">
                                        Suggested Defenses <span className="da-count">{results.matches.length}</span>
                                    </h3>

                                    {results.matches.length === 0 ? (
                                        <div className="da-empty-box">
                                            No complete teams found with your current units.
                                        </div>
                                    ) : (
                                        <div className="da-defenses">
                                            {results.matches.map((defense: any, i: number) => (
                                                <div key={i} className="da-defense-card">
                                                    <div className="da-team">
                                                        {defense.monsters.map((name: string, index: number) => {
                                                            const isLeader = index === defense.leader_index;
                                                            return (
                                                                <div key={index} className={`da-monster ${isLeader ? 'leader' : ''}`}>
                                                                    <span>{name}</span>
                                                                    {isLeader && <div className="da-lead">LEAD</div>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="da-stats">
                                                        <div>
                                                            <div className="da-stat-label">Win Rate</div>
                                                            <div className="da-stat-value">{(defense.win_rate || 0).toFixed(1)}%</div>
                                                        </div>
                                                        <div>
                                                            <div className="da-stat-label">Pick Rate</div>
                                                            <div className="da-stat-value">{(defense.pick_rate || 0).toFixed(1)}%</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {lightboxImage && (
                    <div className="da-lightbox" onClick={() => setLightboxImage(null)}>
                        <img src={lightboxImage} alt="Full Preview" />
                        <button className="da-lightbox-close">�</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DefenseAnalyzer;
