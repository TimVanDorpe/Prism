import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';
import { ComparisonProvider } from './context/ComparisonContext';
import Layout from './components/Layout';
import LoginPage from './pages/jsx/LoginPage';
import RegisterPage from './pages/jsx/RegisterPage';
import HomePage from './pages/jsx/HomePage';
import HistoryPage from './pages/jsx/HistoryPage';
import ComparePage from './pages/jsx/ComparePage';
import './App.css';

function ProtectedRoute({ children }) {
    return authService.isAuthenticated() ? children : <Navigate to="/" />;
}

function App() {
    return (
        <BrowserRouter>
            <ComparisonProvider>
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                        path="/home"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <HomePage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/history"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <HistoryPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/compare"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ComparePage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </ComparisonProvider>
        </BrowserRouter>
    );
}

export default App;
