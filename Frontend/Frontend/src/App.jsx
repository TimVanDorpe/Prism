import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';
import LoginPage from './pages/jsx/LoginPage';
import RegisterPage from './pages/jsx/RegisterPage';
import HomePage from './pages/jsx/HomePage';
import './App.css';

function ProtectedRoute({ children }) {
    return authService.isAuthenticated() ? children : <Navigate to="/" />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                    path="/home"
                    element={
                        <ProtectedRoute>
                            <HomePage />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
