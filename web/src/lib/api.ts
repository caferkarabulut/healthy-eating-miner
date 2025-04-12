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

    // 401 hatası alınırsa oturumu sonlandır ve login'e yönlendir
    if (res.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        window.location.href = '/';
    }

    return res;
}

export async function login(email: string, password: string): Promise<{ access_token: string } | null> {
    const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('email', email);
        return data;
    }
    return null;
}

export async function register(email: string, password: string): Promise<boolean> {
    const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    return res.ok;
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
