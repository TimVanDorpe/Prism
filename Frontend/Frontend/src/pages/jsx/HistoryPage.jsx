import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../../services/apiService';
import { useComparison } from '../../context/ComparisonContext';
import '../css/HistoryPage.css';

function getFavicon(url) {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
        return null;
    }
}

function truncateUrl(url, max = 60) {
    return url.length > max ? url.slice(0, max) + '…' : url;
}

function LeaningBadge({ leaning }) {
    return (
        <span className={`leaning-badge leaning-${leaning}`}>
            {leaning === 'left' ? '⬅ Left' : leaning === 'right' ? '➡ Right' : '⚖ Neutral'}
        </span>
    );
}

function HistoryPage() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState({});

    const { addArticle, removeArticle, isSelected, selectedArticles } = useComparison();
    const navigate = useNavigate();

    useEffect(() => {
        getHistory(50)
            .then((data) => {
                const analyzed = (data.articles || []).filter((a) => a.analyzed);
                setArticles(analyzed);
            })
            .catch((err) => setError(err.message || 'Failed to load history'))
            .finally(() => setLoading(false));
    }, []);

    const toggleExpand = (id) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSelection = (article) => {
        if (isSelected(article.id)) {
            removeArticle(article.id);
        } else {
            addArticle({ id: article.id, url: article.url, result: article.result });
        }
    };

    const comparisonFull = selectedArticles.length >= 5;

    if (loading) {
        return (
            <div className="history-container">
                <p className="history-loading">Loading history…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="history-container">
                <p className="history-error">{error}</p>
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="history-container">
                <p className="history-empty">No analyses yet. Go to Analyze to get started.</p>
            </div>
        );
    }

    return (
        <div className="history-container">
            <div className="history-header">
                <h2>Analysis History</h2>
                <span className="history-count">{articles.length} articles</span>
            </div>

            <div className="history-list">
                {articles.map((article) => {
                    const selected = isSelected(article.id);
                    const isExpanded = expanded[article.id];
                    const favicon = getFavicon(article.url);

                    return (
                        <div key={article.id} className={`history-row ${selected ? 'selected' : ''}`}>
                            <div className="history-row-main">
                                <div className="history-row-left">
                                    {favicon && (
                                        <img
                                            src={favicon}
                                            alt=""
                                            className="history-favicon"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    )}
                                    <div className="history-row-info">
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="history-url"
                                            title={article.url}
                                        >
                                            {truncateUrl(article.url)}
                                        </a>
                                        <div className="history-row-meta">
                                            <LeaningBadge leaning={article.result.biasedLeaning} />
                                            <span className="history-score">{article.result.biasScore}/100</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="history-row-actions">
                                    <button
                                        className="expand-btn"
                                        onClick={() => toggleExpand(article.id)}
                                    >
                                        {isExpanded ? 'Hide' : 'Summary'}
                                    </button>
                                    <button
                                        className={`select-btn ${selected ? 'selected' : ''}`}
                                        onClick={() => toggleSelection(article)}
                                        disabled={!selected && comparisonFull}
                                    >
                                        {selected ? '✓ Selected' : 'Select'}
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <p className="history-summary">{article.result.summary}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedArticles.length >= 2 && (
                <div className="history-footer-bar">
                    <span>{selectedArticles.length} articles selected</span>
                    <button className="goto-compare-btn" onClick={() => navigate('/compare')}>
                        Go to Compare →
                    </button>
                </div>
            )}
        </div>
    );
}

export default HistoryPage;
