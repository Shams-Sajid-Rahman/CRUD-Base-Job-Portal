const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { uploadCV } = require('../../config/upload');

function requireSeeker(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated.' });
  if (req.session.user.role !== 'seeker') return res.status(403).json({ error: 'Seekers only.' });
  next();
}
router.use(requireSeeker);

// GET /api/seeker/dashboard
router.get('/dashboard', async (req, res) => {
  const seekerId = req.session.user.id;
  try {
    const [applications] = await db.query(
      `SELECT a.*, j.title, j.company, j.location, j.type, j.status AS job_status FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.seeker_id = ? ORDER BY a.created_at DESC LIMIT 5`,
      [seekerId]
    );
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(a.status='pending') AS pending, SUM(a.status='shortlisted') AS shortlisted, SUM(a.status='hired') AS hired FROM applications a WHERE a.seeker_id = ?`,
      [seekerId]
    );
    const [recentJobs] = await db.query(`SELECT * FROM jobs WHERE status='active' ORDER BY created_at DESC LIMIT 6`);
    res.json({ applications, stats, recentJobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

// GET /api/seeker/applications
router.get('/applications', async (req, res) => {
  const seekerId = req.session.user.id;
  try {
    const [applications] = await db.query(
      `SELECT a.*, j.title, j.company, j.location, j.type, j.salary_min, j.salary_max, j.status AS job_status FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.seeker_id = ? ORDER BY a.created_at DESC`,
      [seekerId]
    );
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load applications.' });
  }
});

// POST /api/seeker/apply/:jobId
router.post('/apply/:jobId', (req, res, next) => {
  uploadCV.single('cv_file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'CV upload failed.' });
    next();
  });
}, async (req, res) => {
  const { cover_letter } = req.body;
  const jobId = req.params.jobId;
  const seekerId = req.session.user.id;
  const cvPath = req.file ? '/uploads/cv/' + req.file.filename : null;
  try {
    const [jobRows] = await db.query('SELECT id, title FROM jobs WHERE id = ? AND status = "active"', [jobId]);
    if (!jobRows.length) return res.status(404).json({ error: 'This job is not available.' });
    await db.query(
      'INSERT INTO applications (job_id, seeker_id, cover_letter, cv_file) VALUES (?, ?, ?, ?)',
      [jobId, seekerId, cover_letter?.trim() || null, cvPath]
    );
    res.json({ success: true, message: `Successfully applied to "${jobRows[0].title}"!` });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'You have already applied for this job.' });
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

// DELETE /api/seeker/applications/:id
router.delete('/applications/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM applications WHERE id = ? AND seeker_id = ? AND status = "pending"',
      [req.params.id, req.session.user.id]
    );
    if (result.affectedRows === 0) return res.status(400).json({ error: 'Cannot withdraw this application (already reviewed).' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to withdraw application.' });
  }
});

module.exports = router;
