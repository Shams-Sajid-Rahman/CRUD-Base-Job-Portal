// Shared API helper — used by all HTML pages

async function apiFetch(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(url, {
    credentials: 'include',
    headers: isFormData ? {} : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function getCurrentUser() {
  try {
    const data = await apiFetch('/api/me');
    return data.user;
  } catch {
    return null;
  }
}

function showAlert(message, type = 'danger') {
  const container = document.getElementById('flash-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-2`;
  div.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}"></i>
    <span>${message}</span>
    <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>`;
  container.appendChild(div);
  setTimeout(() => div.classList.remove('show'), 4000);
  setTimeout(() => div.remove(), 4500);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSalary(min, max) {
  if (!min && !max) return 'Negotiable';
  if (min && max) return `$${Number(min).toLocaleString()} – $${Number(max).toLocaleString()}`;
  if (min) return `From $${Number(min).toLocaleString()}`;
  return `Up to $${Number(max).toLocaleString()}`;
}

function badgeColor(status) {
  const map = { pending: 'warning', reviewed: 'info', shortlisted: 'primary', rejected: 'danger', hired: 'success', active: 'success', closed: 'secondary', draft: 'warning' };
  return map[status] || 'secondary';
}
