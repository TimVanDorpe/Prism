import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import { useComparison } from '../context/ComparisonContext';
import './Layout.css';

function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedArticles } = useComparison();

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    const tabs = [
        { label: 'Analyze', path: '/home' },
        { label: 'History', path: '/history' },
        { label: 'Compare', path: '/compare' },
    ];

    return (
        <div className="layout-container">
            <header className="layout-header">
                <h1>🔷 Prism</h1>
                <button onClick={handleLogout} className="logout-btn">
                    Log out
                </button>
            </header>

            <nav className="layout-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.path}
                        className={`tab-btn ${location.pathname === tab.path ? 'active' : ''}`}
                        onClick={() => navigate(tab.path)}
                    >
                        {tab.label}
                        {tab.path === '/compare' && selectedArticles.length > 0 && (
                            <span className="tab-badge">{selectedArticles.length}</span>
                        )}
                    </button>
                ))}
            </nav>

            <main className="layout-main">
                {children}
            </main>
        </div>
    );
}

export default Layout;
