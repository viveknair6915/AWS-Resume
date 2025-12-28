export const validatePayload = (body) => {
    try {
        const data = JSON.parse(body);

        if (!data.sessionId) return { valid: false, error: 'Missing sessionId' };
        if (typeof data.scrollDepth !== 'number') return { valid: false, error: 'Invalid scrollDepth' };

        return { valid: true, data };
    } catch (e) {
        return { valid: false, error: 'Invalid JSON' };
    }
};
