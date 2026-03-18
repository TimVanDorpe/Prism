// src/components/LoadingSpinner.jsx

import './LoadingSpinner.css';

function LoadingSpinner() {
    return (
        <div className="spinner-container">
            <div className="spinner"></div>
            <p>Analyzing article...</p>
        </div>
    );
}

export default LoadingSpinner;
