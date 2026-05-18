// SystemFlow — API client (JWT + CSRF aware)
window.api = (() => {
  'use strict';

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function getToken() {
    return localStorage.getItem('sf_token') || '';
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const csrf = getCsrfToken();
    const method = (options.method || 'GET').toUpperCase();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(['GET', 'HEAD', 'OPTIONS'].includes(method) ? {} : { 'X-CSRF-Token': csrf }),
      ...(options.headers || {}),
    };

    const resp = await fetch(path, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (resp.status === 401) {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_current_user');
      window.location.href = '/login.html';
      return null;
    }

    return resp;
  }

  const projects = {
    async list(page = 1) {
      const resp = await apiFetch(`/api/projects?page=${page}`);
      if (!resp?.ok) return { projects: [], total: 0 };
      return resp.json();
    },
    async create(data) {
      const resp = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!resp?.ok) return null;
      return resp.json();
    },
    async update(id, data) {
      const resp = await apiFetch(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!resp?.ok) return null;
      return resp.json();
    },
    async get(id) {
      const resp = await apiFetch(`/api/projects/${id}`);
      if (!resp?.ok) return null;
      return resp.json();
    },
    async del(id) {
      const resp = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      return !!resp?.ok;
    },
  };

  return { apiFetch, projects };
})();
