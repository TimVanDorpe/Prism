import authService from './authService';

const API_BASE_URL = 'http://localhost:5000';

function authHeader() {
    const token = authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Analyze article via SSE streaming using fetch + ReadableStream.
 * EventSource wordt niet gebruikt omdat die geen headers ondersteunt.
 *
 * @param {string} url - Article URL to analyze
 * @param {function} onChunk - Called for each parsed SSE data chunk
 * @param {function} onComplete - Called when stream ends
 * @param {function} onError - Called on error
 * @returns {function} Abort function (like CancellationToken in .NET)
 */
export function analyzeArticleStream(url, onChunk, onComplete, onError) {
    const controller = new AbortController();

    (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/analyze-article`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader()
                },
                body: JSON.stringify({ url }),
                signal: controller.signal
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE lines start with "data: "
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete last line

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;

                    const json = trimmed.slice(5).trim();
                    if (!json) continue;

                    try {
                        const data = JSON.parse(json);
                        onChunk(data);
                    } catch {
                        // ignore malformed lines
                    }
                }
            }

            onComplete();
        } catch (err) {
            if (err.name !== 'AbortError') {
                onError(err);
            }
        }
    })();

    return () => controller.abort();
}

/**
 * Get analysis history
 */
export async function getHistory(limit = 20) {
    const response = await fetch(`${API_BASE_URL}/history?limit=${limit}`, {
        headers: authHeader()
    });
    return await response.json();
}
