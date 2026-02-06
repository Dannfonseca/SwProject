import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { normalizeMonsterName } from '../data/siegeDefenses';
import { collabElements, getCollabEntry } from '../data/collabSearch';
import type { FamilyGroup, Monster } from '../types';
import { DefenseCreator } from './DefenseCreator';
import { DefenseDetailModal } from './DefenseDetailModal';
import './SiegeDefenses.css';

const fetchAllMonsters = async () => {
    const response = await api.get('/api/monsters', {
        params: { limit: 2000, page: 1 }
    });
    return response.data as FamilyGroup[];
};

interface SiegeDefensesProps {
    geminiKey?: string;
}

const stripDiacritics = (value: string) =>
    value.normalize('NFKD').replace(/\p{Diacritic}/gu, '');

export const SiegeDefenses: React.FC<SiegeDefensesProps> = ({ geminiKey }) => {
    const { isLoggedIn, isAdmin, user } = useAuth();
    const [viewingDefense, setViewingDefense] = React.useState<any>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(20);
    const [searchTerm, setSearchTerm] = React.useState('');
    const collabEntry = useMemo(() => {
        const term = searchTerm.trim();
        if (!term) return null;
        return getCollabEntry(term);
    }, [searchTerm]);

    const { data: families } = useQuery<FamilyGroup[]>({
        queryKey: ['all_monsters_lookup'],
        queryFn: fetchAllMonsters,
        staleTime: 1000 * 60 * 60
    });

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const { data: defensesData, refetch: refetchDefenses } = useQuery({
        queryKey: ['siege_defenses_backend', currentPage, itemsPerPage, searchTerm],
        queryFn: async () => {
            const response = await api.get('/api/defenses', {
                params: {
                    page: currentPage,
                    limit: itemsPerPage,
                    monster: searchTerm.trim() ? searchTerm.trim() : undefined
                }
            });
            // Handle both legacy array and new paginated response
            if (Array.isArray(response.data)) {
                return { data: response.data, meta: { total: response.data.length, page: 1, limit: 1000, totalPages: 1 } };
            }
            return response.data;
        }
    });

    const [isAdding, setIsAdding] = React.useState(false);

    const monsterMap = useMemo(() => {
        const map = new Map<string, Monster>();
        if (!families) return map;

        const allMonsters: Monster[] = [];
        families.forEach((group: FamilyGroup) => {
            group.monsters.forEach((mon: Monster) => {
                allMonsters.push(mon);
            });
        });

        const baseMap = new Map<string, Monster>();
        allMonsters.forEach((mon) => {
            const existing = baseMap.get(mon.name);
            if (!existing) {
                baseMap.set(mon.name, mon);
                return;
            }

            const preferNew =
                mon.family_id < existing.family_id ||
                (mon.family_id === existing.family_id && mon.com2us_id < existing.com2us_id);

            if (preferNew) {
                baseMap.set(mon.name, mon);
            }
        });

        baseMap.forEach((mon, name) => {
            map.set(name, mon);

            const normalized = stripDiacritics(name);
            if (normalized !== name && !map.has(normalized)) {
                map.set(normalized, mon);
            }
        });

        allMonsters.forEach((mon) => {
            if (!mon.element || !mon.name) return;
            const elementKey = `${mon.element} ${mon.name}`;
            if (!map.has(elementKey)) {
                map.set(elementKey, mon);
            }

            const elementNormalized = stripDiacritics(elementKey);
            if (elementNormalized !== elementKey && !map.has(elementNormalized)) {
                map.set(elementNormalized, mon);
            }
        });

        return map;
    }, [families]);

    const allDefenses = useMemo(() => {
        const list = defensesData?.data || [];
        return list.map((d: any) => ({
            id: d._id,
            monsters: d.monsters,
            uses: d.pick_rate || 0,
            frequency: 'User',
            winRate: d.win_rate ? `${d.win_rate}%` : '0%',
            isUser: d.source === 'user',
            note: d.note,
            submitted_by: d.submitted_by,
            submitted_by_name: d.submitted_by_name,
            raw: d
        }));
    }, [defensesData]);

    // Used for table display - data is already paginated backend-side now
    // But we iterate 'allDefenses' which IS the current page
    const paginatedDefenses = allDefenses;

    const totalItems = defensesData?.meta?.total || 0;
    const totalPages = defensesData?.meta?.totalPages || 1;

    const [editingDefense, setEditingDefense] = React.useState<any>(null);

    const handleDeleteDefense = async (id: string) => {
        if (!window.confirm('Delete this defense?')) return;
        try {
            await api.delete(`/api/defenses/${id}`);
            refetchDefenses();
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Error deleting defense');
        }
    };

    return (
        <div className="siege-container">
            <div className="siege-header">
                <div className="siege-title-group">
                    <h1 className="page-title">Siege Defenses Meta</h1>
                    <span className="total-count">({totalItems} items)</span>
                </div>
                {isLoggedIn && (
                    <button className="add-defense-btn" onClick={() => setIsAdding(true)}>
                        + Register Defense
                    </button>
                )}
            </div>

            <div className="controls-bar">
                <label className="controls-label">
                    Show:
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="controls-select"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </label>

                <div className="siege-search">
                    <input
                        type="text"
                        placeholder="Search monster (ex: Carcano, Dark Werner)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="siege-clear" onClick={() => setSearchTerm('')}>
                            ×
                        </button>
                    )}
                </div>
            </div>
            {collabEntry && (
                <div className="collab-hint">
                    <div className="collab-title">Collab match: {collabEntry.collab}</div>
                    <div className="collab-variants">
                        {collabEntry.variants.map((name, index) => (
                            <div
                                key={`${collabEntry.collab}-${index}`}
                                className={`collab-chip element-${collabElements[index]?.toLowerCase()}`}
                            >
                                <span className="collab-element">{collabElements[index]}</span>
                                <span className="collab-name">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(isAdding || editingDefense) && (
                <DefenseCreator
                    onClose={() => {
                        setIsAdding(false);
                        setEditingDefense(null);
                        refetchDefenses();
                    }}
                    monsterMap={monsterMap}
                    geminiKey={geminiKey}
                    initialData={editingDefense}
                />
            )}

            <div className="defenses-table-wrapper">
                <table className="defenses-table">
                    <thead>
                        <tr>
                            <th>Team</th>
                            <th>Leader Skill</th>
                            <th>Frequency</th>
                            <th>Uses</th>
                            <th>Win Rate</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedDefenses.map((def: any, idx: number) => {
                            const leaderName = normalizeMonsterName(def.monsters[0]);
                            const leaderMonster = monsterMap.get(leaderName);

                            return (
                                <tr key={idx} className={def.isUser ? 'user-row' : ''}>
                                    <td className="team-cell" data-label="Team">
                                        <div className="team-monsters-clickable" onClick={() => setViewingDefense(def)}>
                                            <div className="team-monsters">
                                                {def.monsters.map((rawName: string, mIdx: number) => {
                                                    const monName = normalizeMonsterName(rawName);
                                                    const monster = monsterMap.get(monName);
                                                    return (
                                                        <div key={mIdx} className="monster-portrait-wrapper">
                                                            {monster ? (
                                                                <div className="monster-portrait">
                                                                    <img
                                                                        src={`https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`}
                                                                        alt={monName}
                                                                        className={`element-border-${monster.element.toLowerCase()}`}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="monster-placeholder" title={monName}>{monName[0]}</div>
                                                            )}
                                                            {mIdx === 0 && <span className="leader-badge-icon">L</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {def.note && <div className="defense-note">{def.note}</div>}
                                        </div>
                                    </td>
                                    <td data-label="Leader Skill">
                                        {leaderMonster?.leader_skill ? (
                                            <div className="leader-skill-mini">
                                                <span className="ls-amount">
                                                    {leaderMonster.leader_skill.amount}% {leaderMonster.leader_skill.attribute}
                                                </span>
                                                <span className="ls-area">{leaderMonster.leader_skill.area}</span>
                                            </div>
                                        ) : (
                                            <span className="no-ls">No leader skill</span>
                                        )}
                                    </td>
                                    <td data-label="Frequency">{def.frequency}</td>
                                    <td data-label="Uses">{def.uses}</td>
                                    <td className={`win-rate ${parseFloat(def.winRate) > 50 ? 'high' : parseFloat(def.winRate) > 20 ? 'medium' : 'low'}`} data-label="Win Rate">
                                        {def.winRate}
                                    </td>
                                    <td className="actions-cell" data-label="Actions">
                                        {isLoggedIn && (isAdmin || def.submitted_by === user?.id) && (
                                            <div className="row-actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => setEditingDefense(def.raw)}
                                                    title="Edit Defense"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    className="del-btn"
                                                    onClick={() => handleDeleteDefense(def.id)}
                                                    title="Delete Defense"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="pagination-controls">
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="pagination-btn"
                >
                    Previous
                </button>
                <span className="page-info">Page {currentPage} of {totalPages}</span>
                <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
            {viewingDefense && (
                <DefenseDetailModal
                    defense={viewingDefense}
                    monsterMap={monsterMap}
                    onClose={() => setViewingDefense(null)}
                />
            )}
        </div>
    );
};
