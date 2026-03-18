// src/services/apiService.js
// Dit is de API service layer - vergelijkbaar met HttpClient in .NET

const API_BASE_URL = 'http://localhost:5000';

/**
 * Analyze article met SSE streaming
 * Dit is vergelijkbaar met IAsyncEnumerable<T> in .NET
 * 
 * @param {string} url - Article URL
 * @param {function} onChunk - Callback voor elk chunk (zoals yield return in C#)
 * @param {function} onComplete - Callback wanneer klaar
 * @param {function} onError - Callback bij fout
 */
export function analyzeArticleStream(url, onChunk, onComplete, onError) {
    // SSE (Server-Sent Events) - real-time streaming
    const eventSource = new EventSource(
        `${API_BASE_URL}/analyze-article?url=${encodeURIComponent(url)}`
    );

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onChunk(data); // Zoals yield return in C#
        } catch (err) {
            console.error('Parse error:', err);
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        onError(error);
    };

    eventSource.addEventListener('complete', () => {
        eventSource.close();
        onComplete();
    });

    // Return functie om te stoppen (zoals CancellationToken in .NET)
    return () => eventSource.close();
}

/**
 * POST request naar analyze endpoint
 * Alternatief voor SSE - normale HTTP POST
 */
export async function analyzeArticlePost(url) {
    const response = await fetch(`${API_BASE_URL}/analyze-article`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

/**
 * Get analysis history
 */
export async function getHistory(limit = 20) {
    const response = await fetch(`${API_BASE_URL}/history?limit=${limit}`);
    return await response.json();
}
