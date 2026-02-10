import React, { useState, useEffect } from 'react';
import api from '../config/api';
import type { Monster, Skill } from '../types';
import './MonsterDetailModal.css';

interface MonsterDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    familyMonsters: Monster[]; // All monsters in this family (for element switching)
    initialMonster: Monster;   // The one clicked
}

const ELEMENT_ORDER = ['Fire', 'Water', 'Wind', 'Light', 'Dark'];

export const MonsterDetailModal: React.FC<MonsterDetailModalProps> = ({
    isOpen,
    onClose,
    familyMonsters,
    initialMonster
}) => {
    const [currentMonster, setCurrentMonster] = useState<Monster>(initialMonster);
    const [activeTab, setActiveTab] = useState<'skills' | 'defenses'>('skills');
    const [defenseCache, setDefenseCache] = useState<Record<string, any[]>>({});
    const [defenseMonsterMap, setDefenseMonsterMap] = useState<Record<string, { image_filename?: string; element?: string }>>({});
    const [defenseLoading, setDefenseLoading] = useState(false);
    const [defenseError, setDefenseError] = useState<string | null>(null);

    const buildDefenseKey = (defense: any) => {
        const monsters = Array.isArray(defense?.monsters) ? defense.monsters : [];
        if (!monsters.length) return defense?.team_hash || '';
        return monsters
            .map((m: string) => m.trim())
            .sort((a: string, b: string) => a.localeCompare(b))
            .join('|');
    };

    const getUniqueDefenses = (list: any[]) => {
        const seen = new Set<string>();
        return list.filter((defense: any) => {
            const key = buildDefenseKey(defense);
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    useEffect(() => {
        setCurrentMonster(initialMonster);
        setActiveTab('skills');
    }, [initialMonster]);

    useEffect(() => {
        const fetchDefenses = async () => {
            if (activeTab !== 'defenses') return;
            const name = currentMonster.name;
            if (!name || defenseCache[name]) return;
            setDefenseLoading(true);
            setDefenseError(null);
            try {
                const res = await api.get(`/api/defenses/by-monster`, { params: { name } });
                const data = res.data;
                const rawList = data.data || [];
                setDefenseCache(prev => ({ ...prev, [name]: getUniqueDefenses(rawList) }));
            } catch (err: any) {
                setDefenseError(err?.message || 'Failed to load defenses');
            } finally {
                setDefenseLoading(false);
            }
        };
        fetchDefenses();
    }, [activeTab, currentMonster.name, defenseCache]);

    useEffect(() => {
        const fetchDefenseMonsters = async () => {
            if (activeTab !== 'defenses') return;
            const name = currentMonster.name;
            const defenses = defenseCache[name] || [];
            if (!defenses.length) return;

            const names = Array.from(new Set(defenses.flatMap((d: any) => d.monsters || [])));
            const missing = names.filter((n: string) => !defenseMonsterMap[n]);
            if (missing.length === 0) return;

            try {
                const res = await api.post('/api/monsters/lookup', { names: missing });
                const data = res.data;
                const mapUpdate: Record<string, { image_filename?: string; element?: string }> = {};
                (data.data || []).forEach((m: any) => {
                    mapUpdate[m.name] = { image_filename: m.image_filename, element: m.element };
                });
                setDefenseMonsterMap(prev => ({ ...prev, ...mapUpdate }));
            } catch {
                // ignore lookup failure, we can still show names
            }
        };
        fetchDefenseMonsters();
    }, [activeTab, currentMonster.name, defenseCache, defenseMonsterMap]);

    if (!isOpen) return null;

    // Helper to find monster of specific element in this family
    const getMonsterByElement = (element: string) => {
        return familyMonsters.find(m => m.element === element);
    };

    // Helper to get skills for current monster
    const getSkills = () => {
        // Since we passed skills_data populated in the monster object from the aggregator?
        // Let's check the type definition in MonsterGallery.
        // It seems the aggregator returns "skills_data" as an array of Skill objects attached to the monster.
        // If not, we fall back to manual lookup (but we don't have the global skills list here conveniently unless passed).
        // Let's assume the monster object found in 'familyMonsters' (aggregated) already has 'skills_data'.

        // We need to cast or ensure typed correctly. "skills_data" was added in the aggregation pipeline in index.ts
        return (currentMonster as any).skills_data || [];
    };

    const currentSkills = getSkills();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                {/* Header / Name */}
                <div className="modal-header">
                    <h2 className={`element-text-${currentMonster.element.toLowerCase()}`}>
                        {currentMonster.name}
                    </h2>
                    <div className="stars-container">
                        {Array.from({ length: currentMonster.natural_stars }).map((_, i) => (
                            <span key={i} className="star">★</span>
                        ))}
                    </div>
                </div>

                {/* Main Layout: Left (Image/Stats) - Right (Skills) */}
                <div className="modal-body">

                    {/* Left Column */}
                    <div className="left-col">
                        <div className="monster-image-large-wrapper">
                            <img
                                src={`https://swarfarm.com/static/herders/images/monsters/${currentMonster.image_filename}`}
                                alt={currentMonster.name}
                                className={`monster-image-large border-${currentMonster.element.toLowerCase()}`}
                            />
                            <div className={`element-badge-large ${currentMonster.element.toLowerCase()}`}>
                                {currentMonster.element}
                            </div>
                        </div>

                        <div className="stats-box">
                            <h3>Max Lv. 40</h3>
                            <div className="stat-row">
                                <span className="stat-label">HP</span>
                                <span className="stat-value">{currentMonster.max_lvl_hp}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">ATK</span>
                                <span className="stat-value">{currentMonster.max_lvl_attack}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">DEF</span>
                                <span className="stat-value">{currentMonster.max_lvl_defense}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">SPD</span>
                                <span className="stat-value">{currentMonster.speed}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Skills / Defenses) */}
                    <div className="right-col">
                        <div className="modal-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
                                onClick={() => setActiveTab('skills')}
                            >
                                Habilidades
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'defenses' ? 'active' : ''}`}
                                onClick={() => setActiveTab('defenses')}
                            >
                                Defesas
                            </button>
                        </div>

                        {/* Element Switcher at top of right col (or top) -- User asked for top. Let's put it top of right or global top.
                             The screenshot shows elements at the bottom. User said "Top photo of 5 elements".
                             I'll put it in the header or just above the right col.
                          */}
                        <div className="element-switcher">
                            {ELEMENT_ORDER.map(elm => {
                                const exist = getMonsterByElement(elm);
                                const isActive = currentMonster.element === elm;
                                return (
                                    <button
                                        key={elm}
                                        className={`element-icon ${elm.toLowerCase()} ${isActive ? 'active' : ''} ${!exist ? 'disabled' : ''}`}
                                        onClick={() => exist && setCurrentMonster(exist)}
                                        title={exist ? exist.name : 'Not available'}
                                        disabled={!exist}
                                    >
                                        {/* Simple Circle Icon */}
                                        <span className="icon-inner"></span>
                                    </button>
                                )
                            })}
                        </div>

                        {activeTab === 'skills' && (
                            <div className="skills-list">
                                {currentSkills.map((skill: Skill, idx: number) => (
                                    <div key={idx} className="skill-item">
                                        <div className="skill-icon-wrapper">
                                            <img
                                                src={`https://swarfarm.com/static/herders/images/skills/${skill.icon_filename}`}
                                                alt={skill.name}
                                            />
                                        </div>
                                        <div className="skill-info">
                                            <h4>{skill.name}</h4>
                                            <p>{skill.description}</p>
                                        </div>
                                    </div>
                                ))}

                                {currentSkills.length === 0 && (
                                    <p className="no-skills">No skill info available</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'defenses' && (
                            <div className="defenses-list">
                                {defenseLoading && <p className="no-skills">Carregando defesas…</p>}
                                {defenseError && <p className="no-skills">{defenseError}</p>}
                                {!defenseLoading && !defenseError && (
                                    <>
                                        {getUniqueDefenses(defenseCache[currentMonster.name] || []).length === 0 ? (
                                            <p className="no-skills">Nenhuma defesa encontrada para este monstro.</p>
                                        ) : (
                                            getUniqueDefenses(defenseCache[currentMonster.name] || []).map((defense: any, idx: number) => (
                                                <div key={idx} className="defense-row">
                                                    <div className="defense-team">
                                                        {defense.monsters.map((m: string, i: number) => {
                                                            const info = defenseMonsterMap[m];
                                                            return (
                                                                <span key={i} className={`defense-pill ${i === defense.leader_index ? 'leader' : ''}`}>
                                                                    {info?.image_filename && (
                                                                        <img
                                                                            src={`https://swarfarm.com/static/herders/images/monsters/${info.image_filename}`}
                                                                            alt={m}
                                                                        />
                                                                    )}
                                                                    {m}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="defense-meta">
                                                        <span>Win: {(defense.win_rate || 0).toFixed(1)}%</span>
                                                        <span>Pick: {(defense.pick_rate || 0).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Leader Skill */}
                        {currentMonster.leader_skill && (
                            <div className="leader-skill-box">
                                <span className="leader-badge">LEADER</span>
                                <p>
                                    Increase {currentMonster.leader_skill?.attribute} of {currentMonster.leader_skill?.element ? currentMonster.leader_skill.element + ' ' : ''}
                                    monsters {currentMonster.leader_skill?.area ? `in ${currentMonster.leader_skill.area} ` : ''}
                                    by {currentMonster.leader_skill?.amount}%
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
