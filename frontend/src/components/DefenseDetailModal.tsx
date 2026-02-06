import React from 'react';
import type { Monster } from '../types';
import './DefenseDetailModal.css';

interface DefenseDetailModalProps {
    defense: any;
    monsterMap: Map<string, Monster>;
    onClose: () => void;
}

export const DefenseDetailModal: React.FC<DefenseDetailModalProps> = ({ defense, monsterMap, onClose }) => {
    if (!defense) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Defense Details</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="detail-content">
                    <div className="detail-team-display">
                        {defense.monsters.map((name: string, i: number) => {
                            const m = monsterMap.get(name);
                            return (
                                <div key={i} className="detail-mon-card">
                                    {m ? (
                                        <div className="mon-img-wrapper">
                                            <img src={`https://swarfarm.com/static/herders/images/monsters/${m.image_filename}`} alt={name} />
                                            <div className="mon-stars">{'⭐'.repeat(m.natural_stars)}</div>
                                        </div>
                                    ) : (
                                        <div className="mon-placeholder">?</div>
                                    )}
                                    <span className="mon-name">{name} {i === 0 && <span className="leader-tag">(L)</span>}</span>
                                    {m?.leader_skill && i === 0 && (
                                        <div className="ls-info">
                                            <span className="ls-area">{m.leader_skill.area}</span>
                                            <span className="ls-amount">{m.leader_skill.amount}% {m.leader_skill.attribute}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="detail-notes">
                        <h3>Strategy & Notes</h3>
                        <div className="notes-box">
                            {defense.note || "No comments or strategy notes provided for this team."}
                        </div>
                    </div>

                    <div className="detail-stats">
                        <div className="stat-item">
                            <span className="stat-label">Wins</span>
                            <span className="stat-value">{defense.winRate}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Uses</span>
                            <span className="stat-value">{defense.uses}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
