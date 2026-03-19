const express = require('express');
const router = express.Router();
const db = require('../../config/db');

function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated.' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  next();
}
router.use(requireAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [[stats]] = await db.query(`SELECT (SELECT COUNT(*) FROM users WHERE role='seeker') AS seekers, (SELECT COUNT(*) FROM users WHERE role='employer') AS employers, (SELECT COUNT(*) FROM jobs WHERE status='active') AS active_jobs, (SELECT COUNT(*) FROM jobs) AS total_jobs, (SELECT COUNT(*) FROM applications) AS total_applications, (SELECT COUNT(*) FROM applications WHERE status='hired') AS hired`);
    const [recentUsers] = await db.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    const [recentJobs] = await db.query(`SELECT j.id, j.title, j.company, j.status, j.created_at, u.name AS employer_name FROM jobs j JOIN users u ON j.employer_id = u.id ORDER BY j.created_at DESC LIMIT 5`);
    res.json({ stats, recentUsers, recentJobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

// GET /api/admin/users
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
    const [users] = await db.query(`SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['seeker', 'employer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (parseInt(req.params.id) === req.session.user.id) return res.status(400).json({ error: 'Cannot change your own role.' });
  try {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) return res.status(400).json({ error: 'Cannot delete your own account.' });
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/jobs
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
      `SELECT j.*, u.name AS employer_name, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS app_count FROM jobs j JOIN users u ON j.employer_id = u.id ${whereClause} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM jobs j ${whereClause}`, params);
    res.json({ jobs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load jobs.' });
  }
});

// GET /api/admin/applications
router.get('/applications', async (req, res) => {
  const { status, q, page = 1 } = req.query;
  const limit = 15;
  const offset = (parseInt(page) - 1) * limit;
  try {
    let where = [];
    const params = [];
    if (status) { where.push('a.status = ?'); params.push(status); }
    if (q) { where.push('(u.name LIKE ? OR j.title LIKE ? OR j.company LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [applications] = await db.query(
      `SELECT a.id, a.status, a.created_at, u.name AS applicant_name, u.email AS applicant_email,
              j.title AS job_title, j.company, j.location
       FROM applications a
       JOIN users u ON a.seeker_id = u.id
       JOIN jobs j ON a.job_id = j.id
       ${whereClause}
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM applications a JOIN users u ON a.seeker_id = u.id JOIN jobs j ON a.job_id = j.id ${whereClause}`, params
    );
    res.json({ applications, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

// PUT /api/admin/applications/:id/status
router.put('/applications/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['pending','reviewed','shortlisted','rejected','hired'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    await db.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// PUT /api/admin/jobs/:id/status
router.put('/jobs/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'closed', 'draft'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    await db.query('UPDATE jobs SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// DELETE /api/admin/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});

module.exports = router;
