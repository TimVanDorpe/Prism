import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/jsx/LoginPage';
import HomePage from './pages/jsx/HomePage';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Route = vergelijk met een Route in ASP.NET MVC */}
                <Route path="/" element={<LoginPage />} />
                <Route path="/home" element={<HomePage />} />
                
                {/* Fallback: onbekende routes → login */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;