const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated, isAdmin);

// GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [[stats]] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE role='seeker') AS seekers,
        (SELECT COUNT(*) FROM users WHERE role='employer') AS employers,
        (SELECT COUNT(*) FROM jobs WHERE status='active') AS active_jobs,
        (SELECT COUNT(*) FROM jobs) AS total_jobs,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM applications WHERE status='hired') AS hired`
    );

    const [recentUsers] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );

    const [recentJobs] = await db.query(
      `SELECT j.id, j.title, j.company, j.status, j.created_at, u.name AS employer_name
       FROM jobs j JOIN users u ON j.employer_id = u.id
       ORDER BY j.created_at DESC LIMIT 5`
    );

    res.render('admin/dashboard', { title: 'Admin Dashboard', stats, recentUsers, recentJobs });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard.');
    res.redirect('/');
  }
});

// GET /admin/users
router.get('/users', async (req, res) => {
  const { role, q, page = 1 } = req.query;
  const limit = 15;
  const offset = (parseInt(page) - 1) * limit;

  try {
    let where = [];
    const params = [];

    if (role) { where.push('role = ?'); params.push(role); }
    if (q) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [users] = await db.query(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`, params
    );

    res.render('admin/users', {
      title: 'Manage Users',
      users, total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      role: role || '', q: q || '',
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load users.');
    res.redirect('/admin/dashboard');
  }
});

// PUT /admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['seeker', 'employer', 'admin'].includes(role)) {
    req.flash('error', 'Invalid role.');
    return res.redirect('/admin/users');
  }
  if (parseInt(req.params.id) === req.session.user.id) {
    req.flash('error', 'You cannot change your own role.');
    return res.redirect('/admin/users');
  }
  try {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    req.flash('success', 'User role updated.');
  } catch (err) {
    req.flash('error', 'Failed to update role.');
  }
  res.redirect('/admin/users');
});

// DELETE /admin/users/:id
router.delete('/users/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) {
    req.flash('error', 'You cannot delete your own account.');
    return res.redirect('/admin/users');
  }
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    req.flash('success', 'User deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete user.');
  }
  res.redirect('/admin/users');
});

// GET /admin/jobs
router.get('/jobs', async (req, res) => {
  const { status, q, page = 1 } = req.query;
  const limit = 15;
  const offset = (parseInt(page) - 1) * limit;

  try {
    let where = [];
    const params = [];

    if (status) { where.push('j.status = ?'); params.push(status); }
    if (q) { where.push('(j.title LIKE ? OR j.company LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [jobs] = await db.query(
      `SELECT j.*, u.name AS employer_name,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS app_count
       FROM jobs j JOIN users u ON j.employer_id = u.id
       ${whereClause} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM jobs j ${whereClause}`, params
    );

    res.render('admin/jobs', {
      title: 'Manage Jobs',
      jobs, total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      status: status || '', q: q || '',
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load jobs.');
    res.redirect('/admin/dashboard');
  }
});

// PUT /admin/jobs/:id/status
router.put('/jobs/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'closed', 'draft'].includes(status)) {
    req.flash('error', 'Invalid status.');
    return res.redirect('/admin/jobs');
  }
  try {
    await db.query('UPDATE jobs SET status = ? WHERE id = ?', [status, req.params.id]);
    req.flash('success', 'Job status updated.');
  } catch (err) {
    req.flash('error', 'Failed to update status.');
  }
  res.redirect('/admin/jobs');
});

// DELETE /admin/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    req.flash('success', 'Job deleted.');
  } catch (err) {
    req.flash('error', 'Failed to delete job.');
  }
  res.redirect('/admin/jobs');
});

module.exports = router;
