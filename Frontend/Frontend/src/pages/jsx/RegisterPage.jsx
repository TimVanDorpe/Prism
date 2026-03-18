import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';
import '../css/RegisterPage.css';

function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authService.register(email, password);
            navigate('/home');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="logo">
                <h1>🔷 Prism</h1>
            </div>

            <h2>Maak een account aan</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Wachtwoord</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Kies een wachtwoord"
                        required
                    />
                </div>

                {error && <p className="error-message">{error}</p>}

                <button type="submit" disabled={loading}>
                    {loading ? 'Even geduld...' : 'Registreren'}
                </button>
            </form>

            <p className="switch-link">
                Al een account? <Link to="/">Inloggen</Link>
            </p>
        </div>
    );
}

export default RegisterPage;
