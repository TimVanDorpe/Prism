import { useState } from 'react';
import { analyzeArticleStream } from '../../services/apiService';
import { useComparison } from '../../context/ComparisonContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../css/HomePage.css';

function HomePage() {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState('idle'); // idle | loading | streaming | done | error
    const [messages, setMessages] = useState([]);
    const [liveText, setLiveText] = useState('');
    const [result, setResult] = useState(null);
    const [currentUrl, setCurrentUrl] = useState('');
    const [error, setError] = useState('');

    const { addArticle, isSelected, selectedArticles } = useComparison();

    const handleSubmit = (e) => {
        e.preventDefault();

        setStatus('loading');
        setMessages([]);
        setLiveText('');
        setResult(null);
        setError('');
        setCurrentUrl(url);

        analyzeArticleStream(
            url,
            (chunk) => {
                if (chunk.type === 'status') {
                    setStatus('streaming');
                    setMessages((prev) => [...prev, chunk.message]);
                } else if (chunk.type === 'chunk') {
                    setLiveText((prev) => prev + chunk.content);
                } else if (chunk.type === 'complete') {
                    setResult(chunk.result);
                    setStatus('done');
                } else if (chunk.type === 'error') {
                    setError(chunk.message);
                    setStatus('error');
                }
            },
            () => {
                setStatus((prev) => prev === 'streaming' ? 'done' : prev);
            },
            (err) => {
                setError(err.message || 'Er is een fout opgetreden');
                setStatus('error');
            }
        );
    };

    const leaningLabel = (leaning) => {
        if (leaning === 'left') return '⬅ Links';
        if (leaning === 'right') return '➡ Rechts';
        return '⚖ Neutraal';
    };

    const handleAddToComparison = () => {
        if (!result) return;
        addArticle({
            id: result.id ?? currentUrl,
            url: currentUrl,
            result
        });
    };

    const articleId = result?.id ?? currentUrl;
    const alreadySelected = isSelected(articleId);
    const comparisonFull = selectedArticles.length >= 5;

    return (
        <div className="home-main-wrap">
            <div className="home-main">
                <form onSubmit={handleSubmit} className="url-form">
                    <label htmlFor="url">Enter a news URL</label>
                    <div className="url-input-group">
                        <input
                            type="url"
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            required
                            disabled={status === 'loading' || status === 'streaming'}
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading' || status === 'streaming'}
                        >
                            Analyze
                        </button>
                    </div>
                </form>

                {status === 'loading' && <LoadingSpinner />}

                {status === 'streaming' && (
                    <div className="streaming-panel">
                        <div className="progress-messages">
                            {messages.map((msg, i) => (
                                <p key={i} className="progress-line">⏳ {msg}</p>
                            ))}
                        </div>
                        {liveText && (
                            <pre className="live-text">{liveText}<span className="cursor">▋</span></pre>
                        )}
                    </div>
                )}

                {status === 'done' && result && (
                    <div className="result-card">
                        <h2>Analyse resultaat</h2>
                        <div className="bias-score">
                            <span className="score-label">Bias score</span>
                            <span className="score-value">{result.biasScore} / 100</span>
                        </div>
                        <div className="bias-leaning">
                            <span className="leaning-label">Leaning</span>
                            <span className="leaning-value">{leaningLabel(result.biasedLeaning)}</span>
                        </div>
                        <div className="bias-summary">
                            <h3>Samenvatting</h3>
                            <p>{result.summary}</p>
                        </div>
                        <button
                            className={`compare-btn ${alreadySelected ? 'added' : ''}`}
                            onClick={handleAddToComparison}
                            disabled={alreadySelected || comparisonFull}
                        >
                            {alreadySelected ? '✓ Added to Comparison' : comparisonFull ? 'Comparison full (5/5)' : '+ Add to Comparison'}
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <p className="error-message">{error}</p>
                )}
            </div>
        </div>
    );
}

export default HomePage;
