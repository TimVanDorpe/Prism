import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import '../css/HomePage.css';

function HomePage() {
    const [url, setUrl] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault(); // no refresh

        // todo
        console.log("URL ingevoerd:", url);
        alert(`URL ontvangen: ${url}`);
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/');  // Terug naar login
    };

    return (
        <div className="home-container">
            <header className="home-header">
                <h1>🔷 Prism</h1>
                <button onClick={handleLogout} className="logout-btn">
                    log out
                </button>
            </header>

            <main className="home-main">
                <form onSubmit={handleSubmit} className="url-form">
                    <label htmlFor="url">Enter a news url</label>
                    <div className="url-input-group">
                        <input
                            type="url"
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            required
                        />
                        <button type="submit">Send</button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default HomePage;