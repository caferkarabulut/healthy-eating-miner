export const LEGACY_SESSION_EXPIRED = "bite:legacy-session-expired";

const API_BASE = 'http://localhost:8000';

export async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // No trailing slash - Azure App Service redirects slashed URLs to HTTP
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}), // Only add Authorization if token exists
            ...options.headers,
        },
    });

    // Let the mounted legacy page navigate with its Next.js router.
    if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        window.dispatchEvent(new Event(LEGACY_SESSION_EXPIRED));
    }

    return res;
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
}

export function getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function isAuthenticated(): boolean {
    return !!getToken();
}
