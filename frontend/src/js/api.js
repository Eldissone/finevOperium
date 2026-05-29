const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || 'Erro na requisição');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function requireAuth() {
  try {
    const data = await apiFetch('/api/auth/me');
    return data.user;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = '/src/page/login.html';
    }
    throw err;
  }
}

export { API_BASE };
