import { useNavigate } from 'react-router-dom';
import { useComparison } from '../../context/ComparisonContext';
import BiasSpectrumChart from '../../components/BiasSpectrumChart';
import '../css/ComparePage.css';

function getFavicon(url) {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
        return null;
    }
}

function LeaningBadge({ leaning }) {
    return (
        <span className={`cp-leaning-badge cp-leaning-${leaning}`}>
            {leaning === 'left' ? '⬅ Left' : leaning === 'right' ? '➡ Right' : '⚖ Neutral'}
        </span>
    );
}

function ComparePage() {
    const { selectedArticles, removeArticle, clearAll } = useComparison();
    const navigate = useNavigate();

    if (selectedArticles.length < 2) {
        return (
            <div className="compare-empty">
                <p>Select at least 2 articles from History to compare.</p>
                <button className="cp-go-history-btn" onClick={() => navigate('/history')}>
                    Go to History →
                </button>
            </div>
        );
    }

    return (
        <div className="compare-container">
            <div className="compare-header">
                <h2>Bias Comparison</h2>
                <button className="cp-clear-btn" onClick={clearAll}>Clear all</button>
            </div>

            <BiasSpectrumChart articles={selectedArticles} />

            <div className="cp-cards-grid">
                {selectedArticles.map((article) => {
                    const favicon = getFavicon(article.url);
                    return (
                        <div key={article.id} className="cp-card">
                            <div className="cp-card-header">
                                {favicon && (
                                    <img
                                        src={favicon}
                                        alt=""
                                        className="cp-favicon"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                )}
                                <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cp-url"
                                    title={article.url}
                                >
                                    {new URL(article.url).hostname}
                                </a>
                                <button
                                    className="cp-remove-btn"
                                    onClick={() => removeArticle(article.id)}
                                    title="Remove from comparison"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="cp-card-meta">
                                <LeaningBadge leaning={article.result.biasedLeaning} />
                                <span className="cp-score">{article.result.biasScore}/100</span>
                            </div>

                            <p className="cp-summary">{article.result.summary}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ComparePage;
