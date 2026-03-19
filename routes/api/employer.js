const express = require('express');
const router = express.Router();
const db = require('../../config/db');

function requireEmployer(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated.' });
  if (req.session.user.role !== 'employer') return res.status(403).json({ error: 'Employers only.' });
  next();
}
router.use(requireEmployer);

// GET /api/employer/dashboard
router.get('/dashboard', async (req, res) => {
  const employerId = req.session.user.id;
  try {
    const [jobs] = await db.query(
      `SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS app_count FROM jobs j WHERE j.employer_id = ? ORDER BY j.created_at DESC`,
      [employerId]
    );
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS total_jobs, SUM(status='active') AS active_jobs, SUM(status='closed') AS closed_jobs, (SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.employer_id = ?) AS total_applications FROM jobs WHERE employer_id = ?`,
      [employerId, employerId]
    );
    res.json({ jobs, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

// POST /api/employer/jobs
router.post('/jobs', async (req, res) => {
  const { title, company, location, type, salary_min, salary_max, description, requirements, benefits, experience_level, status } = req.body;
  if (!title || !company || !location || !type || !description) return res.status(400).json({ error: 'Please fill in all required fields.' });
  try {
    const [result] = await db.query(
      `INSERT INTO jobs (employer_id, title, company, location, type, salary_min, salary_max, description, requirements, benefits, experience_level, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.user.id, title.trim(), company.trim(), location.trim(), type, salary_min || null, salary_max || null, description.trim(), requirements?.trim() || null, benefits?.trim() || null, experience_level || 'any', status || 'active']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post job.' });
  }
});

// GET /api/employer/jobs/:id
router.get('/jobs/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [req.params.id, req.session.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found.' });
    res.json({ job: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load job.' });
  }
});

// PUT /api/employer/jobs/:id
router.put('/jobs/:id', async (req, res) => {
  const { title, company, location, type, salary_min, salary_max, description, requirements, benefits, experience_level, status } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE jobs SET title=?, company=?, location=?, type=?, salary_min=?, salary_max=?, description=?, requirements=?, benefits=?, experience_level=?, status=? WHERE id=? AND employer_id=?`,
      [title.trim(), company.trim(), location.trim(), type, salary_min || null, salary_max || null, description.trim(), requirements?.trim() || null, benefits?.trim() || null, experience_level || 'any', status, req.params.id, req.session.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job.' });
  }
});

// DELETE /api/employer/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jobs WHERE id = ? AND employer_id = ?', [req.params.id, req.session.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});

// GET /api/employer/jobs/:id/applicants
router.get('/jobs/:id/applicants', async (req, res) => {
  try {
    const [jobRows] = await db.query('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [req.params.id, req.session.user.id]);
    if (!jobRows.length) return res.status(404).json({ error: 'Job not found.' });
    const [applicants] = await db.query(
      `SELECT a.*, u.name, u.email, u.phone, u.bio FROM applications a JOIN users u ON a.seeker_id = u.id WHERE a.job_id = ? ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    res.json({ job: jobRows[0], applicants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applicants.' });
  }
});

// PUT /api/employer/applications/:id/status
router.put('/applications/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  try {
    await db.query(
      `UPDATE applications a JOIN jobs j ON a.job_id = j.id SET a.status = ? WHERE a.id = ? AND j.employer_id = ?`,
      [status, req.params.id, req.session.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

module.exports = router;
