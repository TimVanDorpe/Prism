import { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // React's NavigationService
import authService from '../../services/authService';
import '../css/LoginPage.css';  // Eigen styling

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    
    // useNavigate = vergelijk met INavigationService in .NET
    //(_navigationService.Navigate(typeof(HomePage));)
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        
        // Gebruik de authService
        if (authService.login(username, password)) {
            navigate('/home');  // Navigeer naar HomePage
        } else {
            setError("Ongeldige gebruikersnaam of wachtwoord");
        }
    };

    return (
        <div className="login-container">
            <div className="logo">
                <h1>🔷 Prism</h1>
            </div>

            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label htmlFor="username">User Name</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Fill in username"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Fill in password"
                    />
                </div>

                {error && <p className="error-message">{error}</p>}

                <button type="submit">Login</button>
            </form>
        </div>
    );
}

export default LoginPage;