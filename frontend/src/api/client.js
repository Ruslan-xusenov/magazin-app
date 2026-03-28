const API_BASE = '';

// Auth helpers
export function getToken() {
    return localStorage.getItem('user_token') || localStorage.getItem('admin_token');
}

export function setToken(token) {
    localStorage.setItem('user_token', token);
}

export function removeToken() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('user_info');
}

export function setIsAdmin(isAdmin) {
    localStorage.setItem('is_admin', isAdmin ? 'true' : 'false');
}

export function isAdmin() {
    return localStorage.getItem('is_admin') === 'true';
}

export function setUserInfo(user) {
    localStorage.setItem('user_info', JSON.stringify(user));
}

export function getUserInfo() {
    try {
        return JSON.parse(localStorage.getItem('user_info'));
    } catch {
        return null;
    }
}

export function isLoggedIn() {
    return !!getToken();
}

export function getAuthHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ==================== Admin Auth ====================
export async function login(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return res.json();
}

export async function checkAuth() {
    const res = await fetch(`${API_BASE}/api/auth/check`, {
        headers: getAuthHeaders(),
    });
    return res.ok;
}

// ==================== User Auth ====================
export async function registerUser(data) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function verifyEmail(email, code) {
    const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });
    return res.json();
}

export async function userLogin(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return res.json();
}

export async function socialAuth(data) {
    const res = await fetch(`${API_BASE}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function getUserProfile() {
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: getAuthHeaders(),
    });
    return res.json();
}

// ==================== Legacy OTP (keep for admin) ====================
export async function sendCode(email) {
    const res = await fetch(`${API_BASE}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return res.json();
}

export async function verifyCode({ email, code }) {
    const res = await fetch(`${API_BASE}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });
    return res.json();
}

// ==================== Products ====================
export async function getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_BASE}/api/products?${query}` : `${API_BASE}/api/products`;
    const res = await fetch(url);
    return res.json();
}

export async function getProduct(id) {
    const res = await fetch(`${API_BASE}/api/products/${id}`);
    return res.json();
}

export async function createProduct(formData) {
    const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    });
    return res.json();
}

export async function updateProduct(id, formData) {
    const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData,
    });
    return res.json();
}

export async function deleteProduct(id) {
    const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    return res.json();
}
