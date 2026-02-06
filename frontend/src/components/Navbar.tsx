import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

type Tab = 'home' | 'monsters' | 'analyzer' | 'siege' | 'settings' | 'login' | 'admin';

interface NavbarProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
    const { user, isLoggedIn, isAdmin, logout } = useAuth();

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleTabClick = (tab: Tab) => {
        onTabChange(tab);
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        logout();
        onTabChange('monsters');
        setIsMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <span className="logo-text">SW Planner</span>
            </div>

            <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
                <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
                <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
                <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            </button>

            <div className={`navbar-links-container ${isMenuOpen ? 'open' : ''}`}>
                <ul className="navbar-links">
                    <li
                        className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
                        onClick={() => handleTabClick('home')}
                    >
                        Home
                    </li>
                    <li
                        className={`nav-item ${activeTab === 'monsters' ? 'active' : ''}`}
                        onClick={() => handleTabClick('monsters')}
                    >
                        Monsters
                    </li>
                    <li
                        className={`nav-item ${activeTab === 'siege' ? 'active' : ''}`}
                        onClick={() => handleTabClick('siege')}
                    >
                        Siege
                    </li>
                    {isLoggedIn && (
                        <li
                            className={`nav-item ${activeTab === 'analyzer' ? 'active' : ''}`}
                            onClick={() => handleTabClick('analyzer')}
                        >
                            Analyzer
                        </li>
                    )}
                    {isAdmin && (
                        <li
                            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => handleTabClick('settings')}
                        >
                            Settings
                        </li>
                    )}
                    {isAdmin && (
                        <li
                            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                            onClick={() => handleTabClick('admin')}
                        >
                            Admin
                        </li>
                    )}
                </ul>

                {/* Mobile Auth in Menu */}
                <div className="navbar-auth mobile-only">
                    {isLoggedIn ? (
                        <div className="user-area-mobile">
                            <div className="user-info-mobile">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.name} className="nav-avatar" />
                                ) : (
                                    <div className="nav-avatar-placeholder">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="nav-username-mobile">{user?.name}</span>
                            </div>
                            <button className="nav-logout-btn full-width" onClick={handleLogout}>
                                Sair
                            </button>
                        </div>
                    ) : (
                        <button
                            className="nav-login-btn full-width"
                            onClick={() => handleTabClick('login')}
                        >
                            Entrar
                        </button>
                    )}
                </div>
            </div>

            {/* Desktop Auth (Hidden on Mobile) */}
            <div className="navbar-auth desktop-only">
                {isLoggedIn ? (
                    <div className="user-area">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="nav-avatar" />
                        ) : (
                            <div className="nav-avatar-placeholder">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="nav-username">{user?.name}</span>
                        <button className="nav-logout-btn" onClick={handleLogout}>
                            Sair
                        </button>
                    </div>
                ) : (
                    <button
                        className="nav-login-btn"
                        onClick={() => onTabChange('login')}
                    >
                        Entrar
                    </button>
                )}
            </div>
        </nav>
    );
};
