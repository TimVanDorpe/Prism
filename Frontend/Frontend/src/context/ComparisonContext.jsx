import { createContext, useContext, useState } from 'react';

const ComparisonContext = createContext(null);

export function ComparisonProvider({ children }) {
    const [selectedArticles, setSelectedArticles] = useState([]);

    function addArticle(article) {
        setSelectedArticles((prev) => {
            if (prev.length >= 5) return prev;
            if (prev.some((a) => a.id === article.id)) return prev;
            return [...prev, article];
        });
    }

    function removeArticle(id) {
        setSelectedArticles((prev) => prev.filter((a) => a.id !== id));
    }

    function clearAll() {
        setSelectedArticles([]);
    }

    function isSelected(id) {
        return selectedArticles.some((a) => a.id === id);
    }

    return (
        <ComparisonContext.Provider value={{ selectedArticles, addArticle, removeArticle, clearAll, isSelected }}>
            {children}
        </ComparisonContext.Provider>
    );
}

export function useComparison() {
    return useContext(ComparisonContext);
}
