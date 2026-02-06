import React, { useState } from 'react';
import api from '../config/api';
import type { Monster } from '../types';
import './DefenseCreator.css';

interface DefenseCreatorProps {
    onClose: () => void;
    monsterMap: Map<string, Monster>;
    geminiKey?: string;
    initialData?: any;
}

export const DefenseCreator: React.FC<DefenseCreatorProps> = ({ onClose, monsterMap, geminiKey, initialData }) => {
    const [mode, setMode] = useState<'manual' | 'ai'>(initialData ? 'manual' : 'manual');
    const [aiStep, setAiStep] = useState<'input' | 'review'>('input');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonsters, setSelectedMonsters] = useState<(string | null)[]>(() => {
        if (initialData?.monsters) {
            const list = [...initialData.monsters];
            while (list.length < 3) list.push(null);
            return list.slice(0, 3);
        }
        return [null, null, null];
    });
    const [rawInput, setRawInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [note, setNote] = useState(initialData?.note || '');

    const filteredMonsters = Array.from(monsterMap.values())
        .filter((m: Monster) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10);

    const toggleMonster = (name: string) => {
        const existingIdx = selectedMonsters.indexOf(name);
        if (existingIdx !== -1) {
            const newSelection = [...selectedMonsters];
            newSelection[existingIdx] = null;
            setSelectedMonsters(newSelection);
        } else {
            const emptyIdx = selectedMonsters.indexOf(null);
            if (emptyIdx !== -1) {
                const newSelection = [...selectedMonsters];
                newSelection[emptyIdx] = name;
                setSelectedMonsters(newSelection);
            }
        }
    };

    const removeMonsterByIndex = (idx: number) => {
        const newSelection = [...selectedMonsters];
        newSelection[idx] = null;
        setSelectedMonsters(newSelection);
    };

    const handleRegister = async (monstersList: (string | null)[], noteContent: string = note) => {
        const finalMonsters = monstersList.filter(m => m !== null) as string[];
        if (finalMonsters.length < 3) return alert('Please select 3 monsters');

        try {
            if (initialData?._id) {
                await api.patch(`/api/defenses/${initialData._id}`, {
                    monsters: finalMonsters,
                    note: noteContent,
                    leader_index: 0
                });
            } else {
                await api.post('/api/defenses', {
                    monsters: finalMonsters,
                    leader_index: 0,
                    note: noteContent,
                    source: 'user'
                });
            }
            onClose();
        } catch (e) {
            alert('Error saving defense');
        }
    };

    const handleGenerateAI = async () => {
        if (!rawInput.trim()) return alert('Please enter some text first!');

        const monNames = Array.from(monsterMap.keys());
        console.log(`[AI Request] Input length: ${rawInput.length}, Monsters in map: ${monNames.length}`);

        setIsGenerating(true);
        try {
            const response = await api.post('/api/defenses/generate', {
                context: rawInput,
                owned_monsters: monNames,
                api_key: geminiKey
            });
            if (Array.isArray(response.data) && response.data.length > 0) {
                setAiSuggestions(response.data);
                setAiStep('review');
            } else {
                alert(`No teams could be extracted. (Monsters loaded: ${monNames.length}). Try pasting the names clearly.`);
            }
        } catch (e: any) {
            console.error('AI Error:', e);
            alert(`AI Error: ${e.response?.data?.error || 'Extraction failed. The list might be too complex or the API key is invalid.'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const removeAiSuggestion = (index: number) => {
        const newSuggestions = [...aiSuggestions];
        newSuggestions.splice(index, 1);
        setAiSuggestions(newSuggestions);
    };

    const handleBulkConfirm = async () => {
        if (aiSuggestions.length === 0) return;
        if (!window.confirm(`Are you sure you want to add ${aiSuggestions.length} new defenses?`)) return;

        try {
            await api.post('/api/defenses/bulk', {
                defenses: aiSuggestions
            });
            alert('Success! All teams added.');
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to save bulk defenses.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="defense-modal">
                <div className="modal-header">
                    <h2>{initialData ? 'Edit Defense' : 'Register New Defense'}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {!initialData && (
                    <div className="mode-tabs">
                        <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>Manual</button>
                        <button className={mode === 'ai' ? 'active' : ''} onClick={() => setMode('ai')}>AI Extract</button>
                    </div>
                )}

                {/* --- MANUAL MODE --- */}
                {mode === 'manual' && (
                    <div className="manual-form">
                        <div className="selection-display">
                            {selectedMonsters.map((name, i) => {
                                const m = name ? monsterMap.get(name) : null;
                                return (
                                    <div key={i} className="selected-mon empty-slot">
                                        {name ? (
                                            <>
                                                <button className="remove-mon-btn" onClick={() => removeMonsterByIndex(i)}>&times;</button>
                                                {m ? (
                                                    <img src={`https://swarfarm.com/static/herders/images/monsters/${m.image_filename}`} alt={name} />
                                                ) : (
                                                    <div className="mon-placeholder">?</div>
                                                )}
                                                <span>{name} {i === 0 && "(L)"}</span>
                                            </>
                                        ) : (
                                            <div className="slot-placeholder">
                                                <span>Slot {i + 1}</span>
                                                {i === 0 && <span className="leader-hint">Leader</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <input
                            type="text"
                            placeholder="Search monster name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />

                        <div className="lookup-results">
                            {filteredMonsters.map(m => (
                                <div key={m.com2us_id} className="lookup-item" onClick={() => toggleMonster(m.name)}>
                                    <img src={`https://swarfarm.com/static/herders/images/monsters/${m.image_filename}`} alt={m.name} />
                                    <span>{m.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="note-field">
                            <label>Notes / Strategy</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Speed tune info, usage, etc..."
                                rows={2}
                            />
                        </div>

                        <div className="modal-footer">
                            <button
                                className="submit-defense-btn"
                                disabled={selectedMonsters.filter(m => m !== null).length < 3}
                                onClick={() => handleRegister(selectedMonsters)}
                            >
                                {initialData ? 'Update Defense' : 'Register Team'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- AI MODE --- */}
                {mode === 'ai' && (
                    <div className="ai-form">
                        {aiStep === 'input' ? (
                            <>
                                <p className="ai-desc">Paste text or CSV list containing team names. AI will identify and extract them all.</p>
                                <textarea
                                    className="ai-textarea"
                                    placeholder="Paste your list here... e.g. 'Chandra, Byungchul, Shun'"
                                    value={rawInput}
                                    onChange={(e) => setRawInput(e.target.value)}
                                    rows={8}
                                />
                                <div className="loading-container">
                                    {isGenerating ? (
                                        <div className="ai-loading">
                                            <div className="spinner"></div>
                                            <span>Processing large list... this may take a moment.</span>
                                        </div>
                                    ) : (
                                        <button className="gen-ai-btn" onClick={handleGenerateAI}>
                                            Extract Teams
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="ai-review-flow">
                                <div className="review-header">
                                    <h3>Review Extracted Teams ({aiSuggestions.length})</h3>
                                    <div className="review-actions">
                                        <button className="back-btn" onClick={() => {
                                            if (window.confirm('Go back? Lost changes to extraction list will occur.')) setAiStep('input');
                                        }}>Back</button>
                                        <button className="confirm-all-btn" onClick={handleBulkConfirm}>
                                            Confirm All ({aiSuggestions.length})
                                        </button>
                                    </div>
                                </div>
                                <div className="ai-scroll-results review-list">
                                    {aiSuggestions.map((s: any, i: number) => (
                                        <div key={i} className="ai-suggestion-card review-card">
                                            <div className="suggestion-team">
                                                {s.monsters.map((name: string, j: number) => {
                                                    const mon = monsterMap.get(name);
                                                    if (!mon) {
                                                        console.warn(`[DEBUG] Missing Monster Lookup: "${name}"`);
                                                        // Optional: Check if we have similar keys
                                                        // const keys = Array.from(monsterMap.keys());
                                                        // const similar = keys.filter(k => k.toLowerCase().includes('zenitsu'));
                                                        // console.log('Similar keys in map:', similar);
                                                    }

                                                    return (
                                                        <div key={j} className="mini-mon">
                                                            {mon ? (
                                                                <img src={`https://swarfarm.com/static/herders/images/monsters/${mon.image_filename}`} alt={mon.name} />
                                                            ) : (
                                                                <div className="mon-placeholder-mini">?</div>
                                                            )}
                                                            <span>{mon?.name || name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="review-card-meta">
                                                <span className="suggestion-note" title={s.note}>{s.note || "No note"}</span>
                                                <div className="card-actions">
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => {
                                                            const newNote = prompt("Edit note:", s.note);
                                                            if (newNote !== null) {
                                                                const newSuggestions = [...aiSuggestions];
                                                                newSuggestions[i].note = newNote;
                                                                setAiSuggestions(newSuggestions);
                                                            }
                                                        }}
                                                        title="Edit Note"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => removeAiSuggestion(i)}
                                                        title="Remove team"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
