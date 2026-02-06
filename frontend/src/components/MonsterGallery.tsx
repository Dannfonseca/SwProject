import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../config/api';
import './MonsterGallery.css';
import { MonsterDetailModal } from './MonsterDetailModal';
import type { Monster, FamilyGroup } from '../types';

const fetchMonsters = async (page: number, letter: string, search: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '10');
    if (search) {
        params.append('search', search);
    } else if (letter) {
        params.append('letter', letter);
    }

    const response = await api.get('/api/monsters', { params });
    return response.data as FamilyGroup[];
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
const NUMBERS = ['5', '7'];

export const MonsterGallery: React.FC = () => {
    const [page, setPage] = useState(1);
    const [filterLetter, setFilterLetter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Modal State
    const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
    const [selectedFamilyMonsters, setSelectedFamilyMonsters] = useState<Monster[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: families, isLoading, isPlaceholderData } = useQuery<FamilyGroup[]>({
        queryKey: ['monsters', page, filterLetter, searchTerm],
        queryFn: () => fetchMonsters(page, filterLetter, searchTerm),
        placeholderData: keepPreviousData
    });

    console.log('Families Data:', families);

    const handleLetterClick = (letter: string) => {
        if (filterLetter === letter) {
            setFilterLetter('');
        } else {
            setFilterLetter(letter);
            setSearchTerm(''); // Clear search when picking a letter
        }
        setPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setFilterLetter(''); // Clear letter filter when searching
        setPage(1);
    }

    const handleMonsterClick = (monster: Monster, familyMonsters: Monster[]) => {
        setSelectedMonster(monster);
        setSelectedFamilyMonsters(familyMonsters);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMonster(null);
    };

    return (
        <div className="gallery-container">
            {/* Search Bar */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search monsters..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="search-input"
                />
            </div>

            {/* Filter Bar (Only show if no search term) */}
            {!searchTerm && (
                <div className="filter-bar">
                    {NUMBERS.map(char => (
                        <button
                            key={char}
                            className={`filter-btn ${filterLetter === char ? 'active' : ''}`}
                            onClick={() => handleLetterClick(char)}
                        >
                            {char}
                        </button>
                    ))}
                    <span className="separator">|</span>
                    {ALPHABET.map(char => (
                        <button
                            key={char}
                            className={`filter-btn ${filterLetter === char ? 'active' : ''}`}
                            onClick={() => handleLetterClick(char)}
                        >
                            {char}
                        </button>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div className="loading">Loading Monsters...</div>
            ) : (
                <>
                    <div className="monsters-grid">
                        {families && families.map((group) => (
                            <React.Fragment key={group._id}>
                                {group.monsters?.map(monster => (
                                    <div
                                        key={monster.com2us_id}
                                        className={`monster-card element-border-${(monster.element || 'neutral').toLowerCase()}`}
                                        onClick={() => handleMonsterClick(monster, group.monsters)}
                                    >
                                        <div className="card-image-wrapper">
                                            <img
                                                src={`https://swarfarm.com/static/herders/images/monsters/${monster.image_filename}`}
                                                alt={monster.name || 'Unknown'}
                                                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/80')}
                                            />
                                            <div className="card-stars">{'⭐'.repeat(monster.natural_stars || 0)}</div>
                                            <div className="element-badge">{(monster.element || '?').toUpperCase()}</div>
                                        </div>
                                        <div className="card-info">
                                            <h3 className="card-name">{monster.name || 'Unknown'}</h3>
                                            <span className="card-type">{monster.type || '-'}</span>
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                        {families && families.length === 0 && <p className="no-results">No monsters found.</p>}
                    </div>

                    {/* Pagination Controls */}
                    <div className="pagination">
                        <button
                            onClick={() => setPage(old => Math.max(old - 1, 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </button>
                        <span className="page-number">Page {page}</span>
                        <button
                            onClick={() => {
                                if (!isPlaceholderData && families && families.length === 10) {
                                    setPage(old => old + 1);
                                }
                            }}
                            disabled={families && families.length < 10}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
            {/* Detail Modal */}
            {selectedMonster && (
                <MonsterDetailModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    initialMonster={selectedMonster}
                    familyMonsters={selectedFamilyMonsters}
                />
            )}
        </div>
    );
};
