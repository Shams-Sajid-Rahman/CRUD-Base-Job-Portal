// Dynamic navbar — injected into every HTML page

async function renderNav() {
  const navContent = document.getElementById('navbarContent');
  if (!navContent) return;

  const user = await getCurrentUser();
  let rightLinks = '';

  if (!user) {
    rightLinks = `
      <li class="nav-item"><a class="nav-link" href="/login.html">Sign In</a></li>
      <li class="nav-item"><a class="btn btn-primary btn-sm px-3" href="/register.html">Get Started</a></li>`;
  } else if (user.role === 'seeker') {
    rightLinks = `
      <li class="nav-item"><a class="nav-link" href="/seeker/dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Dashboard</a></li>
      <li class="nav-item"><a class="nav-link" href="/seeker/applications.html"><i class="bi bi-file-text me-1"></i>Applications</a></li>
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" data-bs-toggle="dropdown">
          <span class="avatar-sm">${user.name.charAt(0).toUpperCase()}</span>${user.name.split(' ')[0]}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text small text-muted">${user.email}</span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="doLogout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
        </ul>
      </li>`;
  } else if (user.role === 'employer') {
    rightLinks = `
      <li class="nav-item"><a class="nav-link" href="/employer/dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Dashboard</a></li>
      <li class="nav-item"><a class="nav-link" href="/employer/create-job.html"><i class="bi bi-plus-circle me-1"></i>Post Job</a></li>
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" data-bs-toggle="dropdown">
          <span class="avatar-sm">${user.name.charAt(0).toUpperCase()}</span>${user.name.split(' ')[0]}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text small text-muted">${user.email}</span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="doLogout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
        </ul>
      </li>`;
  } else if (user.role === 'admin') {
    rightLinks = `
      <li class="nav-item"><a class="nav-link" href="/admin/dashboard.html"><i class="bi bi-shield-check me-1"></i>Admin Panel</a></li>
      <li class="nav-item"><a class="nav-link" href="/admin/users.html"><i class="bi bi-people me-1"></i>Users</a></li>
      <li class="nav-item"><a class="nav-link" href="/admin/jobs.html"><i class="bi bi-briefcase me-1"></i>Jobs</a></li>
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" data-bs-toggle="dropdown">
          <span class="avatar-sm avatar-admin">${user.name.charAt(0).toUpperCase()}</span>Admin
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text small text-muted">${user.email}</span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="doLogout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
        </ul>
      </li>`;
  }

  const path = window.location.pathname;
  const isHome = path === '/' || path === '/index.html';
  const isBrowse = path === '/browse.html';
  const leftLinks = user ? '' : `
    <li class="nav-item"><a class="nav-link${isHome ? ' active' : ''}" href="/"><i class="bi bi-house me-1"></i>Home</a></li>
    <li class="nav-item"><a class="nav-link${isBrowse ? ' active' : ''}" href="/browse.html"><i class="bi bi-search me-1"></i>Browse Jobs</a></li>`;

  navContent.innerHTML = `
    <ul class="navbar-nav me-auto">${leftLinks}</ul>
    <ul class="navbar-nav ms-auto align-items-lg-center gap-1">${rightLinks}</ul>`;
}

async function doLogout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', renderNav);
