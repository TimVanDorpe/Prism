import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { analyzeArticleStream } from '../../services/apiService';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../css/HomePage.css';

function HomePage() {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState('idle'); // idle | loading | streaming | done | error
    const [messages, setMessages] = useState([]);
    const [liveText, setLiveText] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        setStatus('loading');
        setMessages([]);
        setLiveText('');
        setResult(null);
        setError('');

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

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    const leaningLabel = (leaning) => {
        if (leaning === 'left') return '⬅ Links';
        if (leaning === 'right') return '➡ Rechts';
        return '⚖ Neutraal';
    };

    return (
        <div className="home-container">
            <header className="home-header">
                <h1>🔷 Prism</h1>
                <button onClick={handleLogout} className="logout-btn">
                    Log out
                </button>
            </header>

            <main className="home-main">
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
                    </div>
                )}

                {status === 'error' && (
                    <p className="error-message">{error}</p>
                )}
            </main>
        </div>
    );
}

export default HomePage;
